from fastapi import APIRouter, UploadFile, File, HTTPException, status
from fastapi.responses import FileResponse
import os
import uuid
from datetime import datetime
from pathlib import Path
import logging
from dotenv import load_dotenv

# Configuração básica
load_dotenv()
logger = logging.getLogger(__name__)
router = APIRouter()

# Configurações otimizadas
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

@router.post("/upload", status_code=201)
async def upload_document(file: UploadFile = File(...)):
    """
    Versão otimizada para upload de PDFs:
    - Processamento em fluxo (stream)
    - Limite de tamanho de arquivo
    - Uso eficiente de memória
    """
    # Validações rápidas
    if file.content_type != 'application/pdf':
        raise HTTPException(400, "Apenas PDFs são aceitos")

    try:
        # Gera nome único
        file_id = f"{datetime.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:8]}.pdf"
        file_path = os.path.join(UPLOAD_DIR, file_id)
        
        # Salva em disco diretamente (stream)
        with open(file_path, "wb") as buffer:
            size = 0
            while chunk := await file.read(8192):  # 8KB chunks
                size += len(chunk)
                if size > MAX_FILE_SIZE:
                    os.remove(file_path)
                    raise HTTPException(413, "Arquivo muito grande (máx. 50MB)")
                buffer.write(chunk)
        
        return {
            "id": file_id,
            "original_name": file.filename,
            "size": size,
            "saved_at": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(500, "Falha no processamento")

@router.get("/download/{file_id}")
async def download_document(file_id: str):
    """Endpoint otimizado para download"""
    file_path = os.path.join(UPLOAD_DIR, file_id)
    if not os.path.exists(file_path):
        raise HTTPException(404, "Arquivo não encontrado")
    
    return FileResponse(
        file_path,
        filename=f"document_{file_id}",
        media_type="application/pdf"
    )
