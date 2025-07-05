import os
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any
from fastapi import HTTPException

# Imports para processamento de PDF
from pypdf import PdfReader

# Imports do sistema RAG
from routes.utils import generate_embedding, get_pinecone_index

# LangChain para chunking inteligente
try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    logging.warning("LangChain não disponível, usando chunking manual")

# Import do Groq para gerar resumos
from groq import Groq

logger = logging.getLogger(__name__)

class HybridDocumentProcessor:
    """Processador HÍBRIDO: LangChain chunking + Sentence Transformers embeddings + Resumo com LLM"""
    
    def __init__(self):
        # Configurações muito otimizadas para máxima preservação do contexto
        self.chunk_size = 2500      # Tamanho ainda maior para manter muito mais contexto
        self.chunk_overlap = 600    # Overlap muito maior para excelente continuidade
        self.batch_size = 32        # Processamento em lotes grandes
        
        # Cliente Groq para resumos
        self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        
    def extract_text_from_pdf(self, file_path: str) -> str:
        """Extração rápida de texto - baseada no open_file() otimizado"""
        try:
            reader = PdfReader(file_path)
            all_text = ""
            
            # Processa todas as páginas mas com limite razoável
            max_pages = min(len(reader.pages), 100)
            
            for page_num in range(max_pages):
                try:
                    page = reader.pages[page_num]
                    page_text = page.extract_text()
                    if page_text and page_text.strip():
                        # Adiciona separador de página
                        all_text += f"\n\n--- Página {page_num + 1} ---\n{page_text.strip()}\n"
                except Exception as e:
                    logger.warning(f"Erro na página {page_num + 1}: {e}")
                    continue
                    
            if not all_text.strip():
                raise ValueError("Nenhum texto extraído do PDF")
                
            logger.info(f"Texto extraído: {len(all_text):,} caracteres de {max_pages} páginas")
            return all_text
            
        except Exception as e:
            logger.error(f"Erro ao extrair texto: {e}")
            raise HTTPException(status_code=400, detail=f"Erro ao processar PDF: {str(e)}")

    def generate_document_summary(self, text: str, filename: str) -> str:
        """Gera um resumo do documento usando Groq LLM"""
        try:
            # Pega apenas os primeiros 8000 caracteres para o resumo
            text_for_summary = text[:8000] if len(text) > 8000 else text
            
            prompt = f"""Analise o seguinte documento da UFMA e crie um resumo conciso e informativo:

DOCUMENTO: {filename}

CONTEÚDO:
{text_for_summary}

Crie um resumo de 3-4 parágrafos que inclua:
1. Tipo de documento e seu propósito principal
2. Principais pontos, regras ou decisões abordadas
3. Quem é afetado por este documento (estudantes, professores, etc.)
4. Informações práticas importantes

Mantenha o resumo claro, objetivo e útil para quem precisa consultar este documento."""

            response = self.groq_client.chat.completions.create(
                model="llama3-8b-8192",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=800,
                temperature=0.3
            )
            
            summary = response.choices[0].message.content
            logger.info(f"Resumo gerado para {filename}: {len(summary)} caracteres")
            return summary
            
        except Exception as e:
            logger.error(f"Erro ao gerar resumo: {e}")
            # Retorna um resumo padrão em caso de erro
            return f"Documento: {filename}\n\nResumo não disponível. Este documento contém {len(text)} caracteres de texto e está disponível para consulta."
    
    def create_smart_chunks(self, text: str, filename: str) -> List[Dict[str, Any]]:
        """Chunking INTELIGENTE usando LangChain para melhor qualidade de contexto"""
        
        if LANGCHAIN_AVAILABLE:
            # Usa LangChain para chunking inteligente com separadores otimizados
            text_splitter = RecursiveCharacterTextSplitter(
                separators=["\n\n", "\n", ".", "!", "?", ";", ",", " "],  # Separadores inteligentes
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap,
                length_function=len,
                is_separator_regex=False,
            )
            
            # Cria documentos com metadados
            metadatas = [{"filename": filename}]
            langchain_docs = text_splitter.create_documents([text], metadatas=metadatas)
            
            # Converte para o formato do sistema
            chunks = []
            for i, doc in enumerate(langchain_docs):
                if len(doc.page_content.strip()) > 50:  # Pula chunks muito pequenos
                    chunks.append({
                        "content": doc.page_content.strip(),
                        "metadata": {
                            "filename": filename,
                            "chunk_order": i,
                            "char_count": len(doc.page_content),
                            "source": "langchain_recursive"
                        }
                    })
            
            logger.info(f"LangChain criou {len(chunks)} chunks inteligentes")
            
        else:
            # Fallback para chunking manual otimizado
            chunks = self._manual_chunking(text, filename)
            logger.info(f"Chunking manual criou {len(chunks)} chunks")
            
        return chunks
    
    def _manual_chunking(self, text: str, filename: str) -> List[Dict[str, Any]]:
        """Chunking manual de backup com configurações otimizadas"""
        chunks = []
        text_length = len(text)
        start = 0
        chunk_num = 0
        
        while start < text_length:
            end = min(start + self.chunk_size, text_length)
            
            # Tenta quebrar em final de frase ou parágrafo
            if end < text_length:
                # Procura por quebras naturais
                for separator in ["\n\n", "\n", ".", "!", "?"]:
                    sep_pos = text.rfind(separator, max(start + self.chunk_size//2, start), end)
                    if sep_pos > start + self.chunk_size//2:
                        end = sep_pos + len(separator)
                        break
            
            chunk_text = text[start:end].strip()
            
            if len(chunk_text) > 50:  # Só adiciona chunks úteis
                chunks.append({
                    "content": chunk_text,
                    "metadata": {
                        "filename": filename,
                        "chunk_order": chunk_num,
                        "start_char": start,
                        "end_char": end,
                        "char_count": len(chunk_text),
                        "source": "manual"
                    }
                })
                chunk_num += 1
            
            start = end - self.chunk_overlap
            if start >= text_length:
                break
                
        return chunks
    
    def batch_generate_embeddings(self, contents: List[str]) -> List[List[float]]:
        """Embeddings em lote super otimizado para alta performance"""
        try:
            # Carrega modelo uma vez só para eficiência
            if not hasattr(self, '_model'):
                from sentence_transformers import SentenceTransformer
                model_name = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
                
                logger.info(f"Carregando modelo {model_name}...")
                self._model = SentenceTransformer(
                    model_name,
                    device='cpu',
                    trust_remote_code=False
                )
                logger.info("Modelo carregado e otimizado!")
            
            # Processa em lotes otimizados
            logger.info(f"Gerando {len(contents)} embeddings em lote...")
            
            embeddings = self._model.encode(
                contents,
                batch_size=self.batch_size,
                show_progress_bar=True,
                convert_to_numpy=True,
                normalize_embeddings=True,
                device='cpu'  # Força CPU para estabilidade
            )
            
            logger.info(f"{len(embeddings)} embeddings gerados com sucesso!")
            return embeddings.tolist()
            
        except Exception as e:
            logger.error(f"Erro ao gerar embeddings: {e}")
            raise HTTPException(status_code=500, detail=f"Erro nos embeddings: {str(e)}")
    
    def optimized_pinecone_insert(self, chunks: List[Dict], embeddings: List[List[float]], filename: str, summary: str) -> Dict[str, Any]:
        """Inserção otimizada no Pinecone com melhor controle de qualidade"""
        try:
            pinecone_index = get_pinecone_index()
            if not pinecone_index:
                raise RuntimeError("Pinecone não inicializado")
            
            vectors_to_insert = []
            
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                # ID único mais simples
                chunk_id = f"{filename.replace('.pdf', '')}_{i}_{uuid.uuid4().hex[:6]}"
                
                vectors_to_insert.append({
                    "id": chunk_id,
                    "values": embedding,
                    "metadata": {
                        "content": chunk["content"],
                        "filename": filename,
                        "chunk_order": chunk["metadata"]["chunk_order"],
                        "char_count": chunk["metadata"]["char_count"],
                        "source": chunk["metadata"].get("source", "unknown"),
                        "indexed_at": datetime.now().isoformat(),
                        "summary": summary  # Inclui o resumo nos metadados
                    }
                })
            
            # Inserção em lotes grandes para melhor performance
            batch_size = 100
            total_inserted = 0
            
            logger.info(f"Inserindo {len(vectors_to_insert)} vetores...")
            
            for i in range(0, len(vectors_to_insert), batch_size):
                batch = vectors_to_insert[i:i + batch_size]
                try:
                    pinecone_index.upsert(vectors=batch)
                    total_inserted += len(batch)
                    logger.info(f"Lote {i//batch_size + 1}: {len(batch)} vetores")
                except Exception as e:
                    logger.error(f"Erro no lote: {e}")
                    continue
            
            return {
                "success": True,
                "filename": filename,
                "total_chunks": len(chunks),
                "vectors_inserted": total_inserted,
                "chunking_method": "langchain" if LANGCHAIN_AVAILABLE else "manual",
                "chunk_size": self.chunk_size,
                "chunk_overlap": self.chunk_overlap,
                "summary": summary  #  Retorna o resumo
            }
                
        except Exception as e:
            logger.error(f"Erro na indexação: {e}")
            raise HTTPException(status_code=500, detail=f"Falha na indexação: {str(e)}")
    
    async def process_pdf_hybrid(self, file_path: str, filename: str) -> Dict[str, Any]:
        """Pipeline HÍBRIDO completo: melhor qualidade com performance otimizada + Resumo"""
        start_time = datetime.now()
        
        try:
            logger.info(f"=== PROCESSAMENTO HÍBRIDO DE {filename} ===")
            
            # Etapa 1: Extração de texto otimizada
            logger.info("Extraindo texto...")
            text_content = self.extract_text_from_pdf(file_path)
            
            # Etapa 2: Geração de resumo usando LLM
            logger.info("Gerando resumo...")
            summary = self.generate_document_summary(text_content, filename)
            
            # Etapa 3: Chunking inteligente com configurações melhoradas
            logger.info("Chunking inteligente...")
            chunks = self.create_smart_chunks(text_content, filename)
            
            if not chunks:
                raise ValueError("Nenhum chunk válido criado")
            
            # Etapa 4: Embeddings em lote otimizado
            logger.info("Gerando embeddings...")
            contents = [chunk["content"] for chunk in chunks]
            embeddings = self.batch_generate_embeddings(contents)
            
            # Etapa 5: Indexação otimizada
            logger.info("Indexando...")
            index_result = self.optimized_pinecone_insert(chunks, embeddings, filename, summary)
            
            # Resultado final com métricas detalhadas
            processing_time = (datetime.now() - start_time).total_seconds()
            
            final_result = {
                **index_result,
                "text_length": len(text_content),
                "processing_time_seconds": round(processing_time, 2),
                "chunks_per_second": round(len(chunks) / processing_time, 2),
                "optimization": "hybrid_langchain_sentence_transformers",
                "avg_chunk_size": round(sum(len(chunk["content"]) for chunk in chunks) / len(chunks), 2)
            }
            
            logger.info(f"=== CONCLUÍDO EM {processing_time:.1f}s ===")
            return final_result
            
        except Exception as e:
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"Erro após {processing_time:.1f}s: {e}")
            raise

# Instância global
hybrid_processor = HybridDocumentProcessor()

# Função wrapper
async def process_and_index_pdf(file_path: str, filename: str) -> Dict[str, Any]:
    """Versão HÍBRIDA: melhor qualidade de contexto e performance + Resumo"""
    return await hybrid_processor.process_pdf_hybrid(file_path, filename)