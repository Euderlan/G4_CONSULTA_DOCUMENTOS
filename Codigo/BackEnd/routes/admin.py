# routes/admin.py
# Módulo responsável por gerenciar o upload e a indexação de documentos.

from fastapi import APIRouter, UploadFile, File, HTTPException, status
import os
import io
from PyPDF2 import PdfReader
import logging
from dotenv import load_dotenv

# Importa as funções para geração de embedding e acesso ao Pinecone do módulo utils
from routes.utils import generate_embedding, get_pinecone_index

# Carrega variáveis de ambiente
load_dotenv()

# Configura o logger específico para este módulo
logger = logging.getLogger(__name__)

# Cria um APIRouter para agrupar as rotas de administração
router = APIRouter()

# Armazenamento em memória simulado para estatísticas (não persistente)
# Em um sistema real, estas estatísticas seriam consultadas do Pinecone ou de um DB de metadados
_indexed_documents_stats = {} 

@router.get("/")
async def home():
    """Endpoint de status para verificação de saúde básica da API."""
    return {
        'status': 'OK',
        'message': 'UFMA RAG API Simplificada funcionando! (Admin Home)',
        'documents_loaded_stats': _indexed_documents_stats,
        'version': '2.1.0 - Pinecone Integration'
    }

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Sistema de upload e processamento de documentos PDF para indexação no Pinecone.
    Implementa validação, extração de texto, segmentação, geração de embeddings e upsert no Pinecone.

    Args:
        file (UploadFile): O arquivo PDF enviado pelo usuário.

    Returns:
        dict: Mensagem de sucesso e detalhes do arquivo processado.

    Raises:
        HTTPException: Erros HTTP são levantados para cenários como arquivos ausentes/inválidos,
                       ou falhas na inicialização/acesso a serviços externos (Pinecone).
    """
    if not file:
        raise HTTPException(status_code=400, detail='Nenhum arquivo foi fornecido.')

    if file.content_type != 'application/pdf':
        raise HTTPException(status_code=400, detail='Tipo de arquivo inválido. Por favor, envie um PDF.')

    try:
        pinecone_index = get_pinecone_index()
        if not pinecone_index:
            raise HTTPException(status_code=500, detail="O índice Pinecone não foi inicializado ou está inacessível. O upload não pode ser concluído.")

        contents = await file.read()
        reader = PdfReader(io.BytesIO(contents))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or "" # Adiciona conteúdo da página, ou string vazia se for None

        if not text.strip():
            raise HTTPException(status_code=400, detail="O arquivo PDF está vazio ou não contém texto extraível.")

        # --- Etapa de Segmentação de Texto (Chunking) ---
        # Usaremos uma segmentação simples. Em sistemas mais avançados,
        # você pode integrar bibliotecas como LangChain para splitters mais complexos.
        # Defina o tamanho do chunk e a sobreposição conforme a necessidade.
        chunk_size = 1000  # Tamanho do chunk em caracteres
        overlap = 200      # Overlap entre chunks
        
        chunks = []
        start = 0
        text_length = len(text)
        
        while start < text_length:
            end = min(start + chunk_size, text_length)
            chunk_content = text[start:end]
            if chunk_content:
                chunks.append(chunk_content)
            
            # Ajusta o 'start' para o próximo chunk com sobreposição
            start = end - overlap
            if start < 0: # Evita start negativo no início
                start = 0
            
            if start >= text_length and end < text_length: # Garante que o último pedaço é adicionado mesmo que pequeno
                if text_length - end > 0: # Se houver algo após o último chunk que não foi capturado
                    chunks.append(text[end:])
                break # Sai do loop se não houver mais texto
            elif start >= text_length: # Se o start já excedeu o texto
                break


        vectors_to_upsert = []
        indexed_chunks_count = 0
        filename = file.filename # Nome do arquivo original

        for i, chunk_content in enumerate(chunks):
            # Gera o embedding para cada chunk
            chunk_embedding = generate_embedding(chunk_content)
            
            # Cria um ID único para cada chunk
            chunk_id = f"{filename}_{i}"

            # Adiciona o vetor e seus metadados para upsert
            vectors_to_upsert.append({
                "id": chunk_id,
                "values": chunk_embedding,
                "metadata": {
                    "filename": filename,
                    "chunk_id": i,
                    "content": chunk_content # Armazena o conteúdo original do chunk nos metadados
                }
            })
            indexed_chunks_count += 1
        
        # --- Etapa de Upsert no Pinecone ---
        if vectors_to_upsert:
            pinecone_index.upsert(vectors=vectors_to_upsert)
            logger.info(f"Documento '{filename}' upserted no Pinecone com {indexed_chunks_count} chunks.")
            
            # Atualiza as estatísticas em memória
            _indexed_documents_stats[filename] = {
                'chunks': indexed_chunks_count,
                'status': 'indexed'
            }

        return {
            'message': f"Documento '{file.filename}' processado e {indexed_chunks_count} chunks indexados no Pinecone com sucesso.",
            'filename': file.filename,
            'chunks_indexed': indexed_chunks_count,
            'file_size_bytes': len(contents)
        }

    except HTTPException:
        raise # Re-levanta exceções HTTP personalizadas
    except Exception as e:
        logger.error(f"Erro ao processar e indexar o documento '{file.filename}': {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f'Erro interno do servidor ao processar documento: {str(e)}')

@router.get("/documents")
async def list_documents():
    """
    Endpoint para listagem e monitoramento de documentos carregados no sistema (no Pinecone).
    Agrega estatísticas dos documentos únicos.

    Returns:
        dict: Dicionário com a lista de documentos, total de documentos e total de chunks.
    """
    try:
        pinecone_index = get_pinecone_index()
        if not pinecone_index:
            raise HTTPException(status_code=500, detail="O índice Pinecone não foi inicializado ou está inacessível. Não é possível listar documentos.")
        
        # Para listar documentos e seus chunks de forma eficiente, idealmente
        # você teria um banco de dados separado que armazena metadados de documentos.
        # A API do Pinecone não foi projetada para listar todos os metadados de todos os vetores
        # de forma eficiente para fins de "listagem de documentos".
        # Aqui, estamos usando um cache em memória simples para fins de demonstração.
        
        documents = []
        total_chunks = 0
        for filename, data in _indexed_documents_stats.items():
            documents.append({
                'filename': filename,
                'chunks': data['chunks'],
                'status': data['status']
            })
            total_chunks += data['chunks']
            
        return {
            'documents': documents,
            'total_documents': len(documents),
            'total_chunks_indexed': total_chunks
        }
        
    except Exception as e:
        logger.error(f"Erro ao listar documentos: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f'Erro interno do servidor ao listar documentos: {str(e)}')

@router.get("/health")
async def health_check():
    """Endpoint de monitoramento para verificação de status da aplicação e conexão com serviços externos."""
    pinecone_status = "N/A"
    try:
        pinecone_index = get_pinecone_index()
        if pinecone_index:
            # Tenta descrever o índice para verificar a conectividade
            pinecone_index.describe_index_stats() 
            pinecone_status = "OK"
        else:
            pinecone_status = "Initialization Failed"
    except Exception as e:
        logger.error(f"Erro ao verificar saúde do Pinecone: {e}", exc_info=True)
        pinecone_status = f"Error: {str(e)}"

    groq_configured = bool(os.getenv("GROQ_API_KEY"))

    return {
        'status': 'OK',
        'message': 'API funcionando',
        'pinecone_status': pinecone_status,
        'groq_configured': groq_configured,
        'documents_indexed_count': len(_indexed_documents_stats)
    }