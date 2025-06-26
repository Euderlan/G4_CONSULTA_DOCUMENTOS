from fastapi import APIRouter, UploadFile, File, HTTPException, status
from fastapi.responses import FileResponse
import os
import io
import shutil
import uuid
import json
from datetime import datetime
from PyPDF2 import PdfReader
import logging
from dotenv import load_dotenv
from pathlib import Path

# Importa as funções para geração de embedding e acesso ao Pinecone
from routes.utils import generate_embedding, get_pinecone_index

# Carrega variáveis de ambiente
load_dotenv()

# Configura o logger
logger = logging.getLogger(__name__)

# Cria o APIRouter
router = APIRouter()

# Diretório base e arquivo de metadados
UPLOAD_BASE_DIR = "uploaded_documents"
METADATA_FILE = os.path.join(UPLOAD_BASE_DIR, "metadata.json")
os.makedirs(UPLOAD_BASE_DIR, exist_ok=True)

# Estrutura para armazenar metadados
_document_metadata_store = {}

# Funções para carregar e salvar metadados no disco
def load_metadata_store():
    if os.path.exists(METADATA_FILE):
        try:
            with open(METADATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Erro ao ler metadata.json: {e}")
    return {}

def save_metadata_store():
    try:
        with open(METADATA_FILE, "w", encoding="utf-8") as f:
            json.dump(_document_metadata_store, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Erro ao salvar metadata.json: {e}")

# Carrega os metadados existentes na inicialização
_document_metadata_store = load_metadata_store()

def get_safe_filename(original_filename: str) -> str:
    """Gera um nome de arquivo seguro com timestamp e UUID"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    file_ext = Path(original_filename).suffix
    return f"{timestamp}_{unique_id}{file_ext}"

def save_file_to_disk(contents: bytes, filename: str) -> str:
    """Salva conteúdo de bytes como arquivo no disco"""
    file_dir = os.path.join(UPLOAD_BASE_DIR, datetime.now().strftime("%Y-%m-%d"))
    os.makedirs(file_dir, exist_ok=True)
    file_path = os.path.join(file_dir, filename)
    with open(file_path, "wb") as buffer:
        buffer.write(contents)
    return file_path

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload de documento PDF com:
    - Validação
    - Armazenamento no disco
    - Extração de texto
    - Indexação no Pinecone
    - Salvamento de metadados
    """
    if not file:
        raise HTTPException(status_code=400, detail='Nenhum arquivo foi fornecido.')
    if file.content_type != 'application/pdf':
        raise HTTPException(status_code=400, detail='Apenas arquivos PDF são aceitos.')

    try:
        safe_filename = get_safe_filename(file.filename)

        # Lê o conteúdo do arquivo apenas uma vez
        contents = await file.read()

        # Salva o PDF no disco
        file_path = save_file_to_disk(contents, safe_filename)
        logger.info(f"Arquivo salvo em: {file_path}")

        # Processa o texto
        reader = PdfReader(io.BytesIO(contents))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""

        if not text.strip():
            raise HTTPException(status_code=400, detail="O PDF não contém texto extraível.")

        # Segmenta texto
        chunk_size = 1000
        overlap = 200
        chunks = []
        start = 0
        text_length = len(text)

        while start < text_length:
            end = min(start + chunk_size, text_length)
            chunk_content = text[start:end]
            if chunk_content:
                chunks.append(chunk_content)
            start = end - overlap
            if start < 0:
                start = 0

        # Indexa no Pinecone
        pinecone_index = get_pinecone_index()
        if not pinecone_index:
            raise HTTPException(status_code=500, detail="Serviço de indexação indisponível.")

        vectors_to_upsert = []
        for i, chunk_content in enumerate(chunks):
            chunk_embedding = generate_embedding(chunk_content)
            chunk_id = f"{safe_filename}_{i}"

            vectors_to_upsert.append({
                "id": chunk_id,
                "values": chunk_embedding,
                "metadata": {
                    "original_filename": file.filename,
                    "stored_filename": safe_filename,
                    "file_path": file_path,
                    "chunk_id": i,
                    "content": chunk_content
                }
            })

        if vectors_to_upsert:
            pinecone_index.upsert(vectors=vectors_to_upsert)
            logger.info(f"Indexados {len(vectors_to_upsert)} chunks no Pinecone")

        # Salva metadados
        _document_metadata_store[safe_filename] = {
            "original_filename": file.filename,
            "upload_time": datetime.now().isoformat(),
            "file_path": file_path,
            "file_size": len(contents),
            "chunks_count": len(chunks),
            "status": "indexed"
        }
        save_metadata_store()

        return {
            "message": "Documento processado com sucesso",
            "original_filename": file.filename,
            "stored_filename": safe_filename,
            "chunks_indexed": len(chunks),
            "file_path": file_path
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no upload: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar documento: {str(e)}"
        )

@router.get("/documents")
async def list_documents():
    """Lista todos os documentos com metadados"""
    return {
        "documents": list(_document_metadata_store.values()),
        "total_documents": len(_document_metadata_store)
    }

@router.get("/document/{filename}")
async def get_document(filename: str):
    """Retorna os metadados de um documento específico"""
    if filename not in _document_metadata_store:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    doc_info = _document_metadata_store[filename]
    if not os.path.exists(doc_info["file_path"]):
        raise HTTPException(status_code=404, detail="Arquivo físico não encontrado")
    return doc_info

@router.get("/download/{filename}")
async def download_document(filename: str):
    """Download do arquivo original PDF"""
    if filename not in _document_metadata_store:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    file_path = _document_metadata_store[filename]["file_path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Arquivo físico não encontrado")
    return FileResponse(
        path=file_path,
        filename=_document_metadata_store[filename]["original_filename"],
        media_type="application/pdf"
    )
