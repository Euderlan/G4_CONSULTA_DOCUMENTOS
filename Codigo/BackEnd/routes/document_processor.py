# ========== VERSÃO HÍBRIDA MELHORADA: routes/document_processor.py ==========
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

# NOVA IMPORTAÇÃO: LangChain para chunking inteligente
try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    logging.warning("LangChain não disponível, usando chunking manual")

logger = logging.getLogger(__name__)

class HybridDocumentProcessor:
    """Processador HÍBRIDO: LangChain chunking + Sentence Transformers embeddings"""
    
    def __init__(self):
        # Configurações otimizadas baseadas nos seus códigos
        self.chunk_size = 1500      # Tamanho médio ideal
        self.chunk_overlap = 200    # 13% overlap como no código exemplo
        self.batch_size = 32        # Processamento em lotes grandes
        
    def extract_text_from_pdf(self, file_path: str) -> str:
        """Extração rápida de texto - baseada no seu open_file()"""
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
                
            logger.info(f"✅ Texto extraído: {len(all_text):,} caracteres de {max_pages} páginas")
            return all_text
            
        except Exception as e:
            logger.error(f"❌ Erro ao extrair texto: {e}")
            raise HTTPException(status_code=400, detail=f"Erro ao processar PDF: {str(e)}")
    
    def create_smart_chunks(self, text: str, filename: str) -> List[Dict[str, Any]]:
        """Chunking INTELIGENTE usando LangChain (como no seu código 02)"""
        
        if LANGCHAIN_AVAILABLE:
            # Usa LangChain para chunking inteligente (MELHOR QUALIDADE)
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
            
            # Converte para o formato do seu sistema
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
            
            logger.info(f"✅ LangChain criou {len(chunks)} chunks inteligentes")
            
        else:
            # Fallback para chunking manual (se LangChain não estiver disponível)
            chunks = self._manual_chunking(text, filename)
            logger.info(f"✅ Chunking manual criou {len(chunks)} chunks")
            
        return chunks
    
    def _manual_chunking(self, text: str, filename: str) -> List[Dict[str, Any]]:
        """Chunking manual de backup"""
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
        """Embeddings em lote super otimizado"""
        try:
            # Carrega modelo uma vez só (como no seu código 03)
            if not hasattr(self, '_model'):
                from sentence_transformers import SentenceTransformer
                model_name = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
                
                logger.info(f"🚀 Carregando modelo {model_name}...")
                self._model = SentenceTransformer(
                    model_name,
                    device='cpu',
                    trust_remote_code=False
                )
                logger.info("✅ Modelo carregado e otimizado!")
            
            # Processa em lotes otimizados
            logger.info(f"🔄 Gerando {len(contents)} embeddings em lote...")
            
            embeddings = self._model.encode(
                contents,
                batch_size=self.batch_size,
                show_progress_bar=True,
                convert_to_numpy=True,
                normalize_embeddings=True,
                device='cpu'  # Força CPU para estabilidade
            )
            
            logger.info(f"✅ {len(embeddings)} embeddings gerados com sucesso!")
            return embeddings.tolist()
            
        except Exception as e:
            logger.error(f"❌ Erro ao gerar embeddings: {e}")
            raise HTTPException(status_code=500, detail=f"Erro nos embeddings: {str(e)}")
    
    def optimized_pinecone_insert(self, chunks: List[Dict], embeddings: List[List[float]], filename: str) -> Dict[str, Any]:
        """Inserção otimizada no Pinecone"""
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
                        "indexed_at": datetime.now().isoformat()
                    }
                })
            
            # Inserção em lotes grandes (como no seu vectorstore.from_documents)
            batch_size = 100
            total_inserted = 0
            
            logger.info(f"📤 Inserindo {len(vectors_to_insert)} vetores...")
            
            for i in range(0, len(vectors_to_insert), batch_size):
                batch = vectors_to_insert[i:i + batch_size]
                try:
                    pinecone_index.upsert(vectors=batch)
                    total_inserted += len(batch)
                    logger.info(f"✅ Lote {i//batch_size + 1}: {len(batch)} vetores")
                except Exception as e:
                    logger.error(f"❌ Erro no lote: {e}")
                    continue
            
            return {
                "success": True,
                "filename": filename,
                "total_chunks": len(chunks),
                "vectors_inserted": total_inserted,
                "chunking_method": "langchain" if LANGCHAIN_AVAILABLE else "manual"
            }
                
        except Exception as e:
            logger.error(f"❌ Erro na indexação: {e}")
            raise HTTPException(status_code=500, detail=f"Falha na indexação: {str(e)}")
    
    async def process_pdf_hybrid(self, file_path: str, filename: str) -> Dict[str, Any]:
        """Pipeline HÍBRIDO: melhor dos seus códigos + otimizações"""
        start_time = datetime.now()
        
        try:
            logger.info(f"🚀 === PROCESSAMENTO HÍBRIDO DE {filename} ===")
            
            # Etapa 1: Extração (baseada no seu open_file)
            logger.info("📖 Extraindo texto...")
            text_content = self.extract_text_from_pdf(file_path)
            
            # Etapa 2: Chunking inteligente (baseado no seu código 02)
            logger.info("✂️ Chunking inteligente...")
            chunks = self.create_smart_chunks(text_content, filename)
            
            if not chunks:
                raise ValueError("Nenhum chunk válido criado")
            
            # Etapa 3: Embeddings em lote (otimizado)
            logger.info("🧠 Gerando embeddings...")
            contents = [chunk["content"] for chunk in chunks]
            embeddings = self.batch_generate_embeddings(contents)
            
            # Etapa 4: Indexação (baseada no seu vectorstore.from_documents)
            logger.info("📤 Indexando...")
            index_result = self.optimized_pinecone_insert(chunks, embeddings, filename)
            
            # Resultado final
            processing_time = (datetime.now() - start_time).total_seconds()
            
            final_result = {
                **index_result,
                "text_length": len(text_content),
                "processing_time_seconds": round(processing_time, 2),
                "chunks_per_second": round(len(chunks) / processing_time, 2),
                "optimization": "hybrid_langchain_sentence_transformers"
            }
            
            logger.info(f"🎉 === CONCLUÍDO EM {processing_time:.1f}s ===")
            return final_result
            
        except Exception as e:
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"❌ Erro após {processing_time:.1f}s: {e}")
            raise

# Instância global
hybrid_processor = HybridDocumentProcessor()

# Função wrapper
async def process_and_index_pdf(file_path: str, filename: str) -> Dict[str, Any]:
    """Versão HÍBRIDA: melhor dos seus códigos"""
    return await hybrid_processor.process_pdf_hybrid(file_path, filename)