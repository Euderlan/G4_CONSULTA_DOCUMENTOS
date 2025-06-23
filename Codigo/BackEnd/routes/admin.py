# routes/admin.py
from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import io
from PyPDF2 import PdfReader
import logging
from dotenv import load_dotenv

# Importa as funções e a document_store do módulo utils
from routes.utils import simple_text_splitter, document_store

# Carrega variáveis de ambiente
load_dotenv()

# Configura o logger
logger = logging.getLogger(__name__)

# Cria um APIRouter para agrupar as rotas de administração
router = APIRouter()

@router.get("/")
async def home():
    """Endpoint de status para verificação de saúde básica da API."""
    return {
        'status': 'OK',
        'message': 'UFMA RAG API Simplificada funcionando! (Admin Home)',
        'documents_loaded': len(document_store),
        'version': '2.0.0'
    }

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Sistema de upload e processamento de documentos PDF.
    Implementa validação, extração de texto e segmentação automática.
    
    Args:
        file (UploadFile): O arquivo PDF enviado pelo usuário.

    Returns:
        dict: Mensagem de sucesso e detalhes do arquivo processado.
    """
    try:
        if not file:
            raise HTTPException(status_code=400, detail='Nenhum arquivo enviado.')
        
        if file.filename == '':
            raise HTTPException(status_code=400, detail='Nenhum arquivo selecionado.')
        
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail='Apenas arquivos PDF são aceitos.')
        
        # Pipeline de processamento de documentos PDF
        try:
            # Leitura e parsing do arquivo PDF de forma assíncrona
            pdf_bytes = await file.read()
            pdf_file = io.BytesIO(pdf_bytes)
            pdf_reader = PdfReader(pdf_file)
            
            # Extração de texto de todas as páginas do documento
            full_text = ""
            for page in pdf_reader.pages:
                extracted_page_text = page.extract_text()
                if extracted_page_text:
                    full_text += extracted_page_text + "\n"
            
            if not full_text.strip():
                raise HTTPException(status_code=400, detail='PDF não contém texto legível.')
            
        except Exception as e:
            logger.error(f"Erro ao processar PDF: {e}")
            raise HTTPException(status_code=400, detail=f'Erro ao processar PDF: {str(e)}')
        
        # Segmentação do texto em chunks para otimizar busca e processamento
        chunks = simple_text_splitter(full_text)
        
        # Armazenamento dos chunks processados no sistema
        # EM PRODUÇÃO: Adicionar metadados como ID do usuário, timestamp, etc.
        for chunk in chunks:
            document_store.append({
                'content': chunk,
                'filename': file.filename
            })
        
        logger.info(f"PDF {file.filename} processado: {len(chunks)} chunks.")
        
        return {
            'message': f'PDF {file.filename} carregado com sucesso!',
            'filename': file.filename,
            'chunks': len(chunks),
            'total_documents': len(document_store)
        }
        
    except HTTPException as http_exc:
        raise http_exc # Re-lança HTTPException diretamente
    except Exception as e:
        logger.error(f"Erro no upload: {e}")
        raise HTTPException(status_code=500, detail=f'Erro interno do servidor no upload: {str(e)}')

@router.get("/documents")
async def list_documents():
    """
    Endpoint para listagem e monitoramento de documentos carregados no sistema.
    Agrega estatísticas dos documentos únicos.
    
    Returns:
        dict: Dicionário com a lista de documentos, total de documentos e total de chunks.
    """
    try:
        filenames = set()
        for doc in document_store:
            filenames.add(doc['filename'])
        
        documents = []
        for filename in filenames:
            chunks = sum(1 for doc in document_store if doc['filename'] == filename)
            documents.append({
                'filename': filename,
                'chunks': chunks,
                'status': 'processed' # Em um sistema real, este status poderia ser mais dinâmico
            })
        
        return {
            'documents': documents,
            'total': len(documents),
            'total_chunks': len(document_store)
        }
        
    except Exception as e:
        logger.error(f"Erro ao listar documentos: {e}")
        raise HTTPException(status_code=500, detail=f'Erro interno do servidor ao listar documentos: {str(e)}')

@router.get("/health")
async def health_check():
    """Endpoint de monitoramento para verificação de status da aplicação."""
    return {
        'status': 'OK',
        'message': 'API funcionando',
        'documents_loaded': len(document_store),
        'groq_configured': bool(os.getenv("GROQ_API_KEY")) # Verifica se a chave da API Groq está configurada
    }
