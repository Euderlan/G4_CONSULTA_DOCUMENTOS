from fastapi import APIRouter, UploadFile, File, HTTPException, status
from fastapi.responses import FileResponse, JSONResponse
import os
import uuid
from datetime import datetime
from pathlib import Path
import logging
from dotenv import load_dotenv
from routes.document_processor import process_and_index_pdf

# Configuração básica
load_dotenv()
logger = logging.getLogger(__name__)
router = APIRouter()

# Configurações otimizadas
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

#  Armazenamento em memória para metadados dos documentos
documents_metadata = {}

@router.get("/documents")
async def list_documents():
    """Lista todos os documentos armazenados com metadados"""
    documents = []
    try:
        for filename in os.listdir(UPLOAD_DIR):
            if filename.endswith('.pdf'):
                file_path = os.path.join(UPLOAD_DIR, filename)
                stat = os.stat(file_path)
                
                # Extrai o nome original se estiver no formato correto
                original_name = filename
                if '_' in filename:
                    parts = filename.split('_')
                    if len(parts) > 2:
                        original_name = '_'.join(parts[2:])
                
                #  Pega o resumo dos metadados se disponível
                summary = documents_metadata.get(filename, {}).get('summary', 'Resumo não disponível')
                
                documents.append({
                    "id": filename,
                    "original_name": original_name,
                    "size": stat.st_size,
                    "upload_date": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    "last_modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "summary": summary  #  Inclui o resumo na resposta
                })
        
        return JSONResponse(content=documents)
    except Exception as e:
        logger.error(f"Error listing documents: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao listar documentos"
        )

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload de documento PDF com processamento automático e indexação
    """
    # Validações 
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas arquivos PDF são aceitos"
        )

    file_path = None
    try:
        # Gera nome único preservando a extensão 
        file_ext = Path(file.filename).suffix
        file_id = f"{datetime.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:8]}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, file_id)
        
        # Salva em stream com verificação de tamanho 
        file_size = 0
        with open(file_path, "wb") as buffer:
            while chunk := await file.read(8192):  # 8KB chunks
                file_size += len(chunk)
                if file_size > MAX_FILE_SIZE:
                    os.remove(file_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Arquivo excede o tamanho máximo de {MAX_FILE_SIZE//(1024*1024)}MB"
                    )
                buffer.write(chunk)
        
        # PROCESSAMENTO AUTOMÁTICO
        logger.info(f"Iniciando processamento automático de {file.filename}")
        try:
            processing_result = await process_and_index_pdf(file_path, file_id)
            logger.info(f"Processamento concluído: {processing_result}")
            
            #  Salva metadados incluindo resumo
            documents_metadata[file_id] = {
                'original_name': file.filename,
                'summary': processing_result.get('summary', 'Resumo não disponível'),
                'upload_date': datetime.now().isoformat(),
                'file_size': file_size
            }
            
            # Retorna metadados completos + resultado do processamento
            return {
                "id": file_id,
                "original_name": file.filename,
                "size": file_size,
                "upload_date": datetime.now().isoformat(),
                "file_path": file_path,
                "processing_result": processing_result,
                "summary": processing_result.get('summary', 'Resumo não disponível'),  
                "status": "success",
                "message": f"Documento '{file.filename}' carregado e indexado com sucesso!"
            }
            
        except Exception as processing_error:
            # Se falhar no processamento, remove o arquivo e informa erro
            logger.error(f"Erro no processamento de {file.filename}: {processing_error}")
            
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Arquivo removido após falha no processamento: {file_path}")
            
            # Re-lança erro para informar o usuário
            if isinstance(processing_error, HTTPException):
                raise processing_error
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Falha no processamento do documento: {str(processing_error)}"
                )

    except HTTPException:
        raise
    except Exception as e:
        # Remove arquivo em caso de erro geral
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
            
        logger.error(f"Upload error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha no processamento do documento"
        )

@router.get("/download/{file_id}")
async def download_document(file_id: str):
    """Endpoint para download direto de documentos"""
    try:
        file_path = os.path.join(UPLOAD_DIR, file_id)
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Documento não encontrado"
            )
        
        # Obtém o nome original do arquivo se disponível
        original_filename = documents_metadata.get(file_id, {}).get('original_name', file_id)
        if not original_filename and '_' in file_id:
            parts = file_id.split('_')
            if len(parts) > 2:
                original_filename = '_'.join(parts[2:])
        
        return FileResponse(
            path=file_path,
            filename=original_filename,
            media_type='application/pdf'
        )
    except Exception as e:
        logger.error(f"Download error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao recuperar documento"
        )

@router.delete("/document/{file_id}")
async def delete_document(file_id: str):
    """Remove um documento permanentemente"""
    try:
        file_path = os.path.join(UPLOAD_DIR, file_id)
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Documento não encontrado"
            )
            
        os.remove(file_path)
        
        # Remove metadados também
        if file_id in documents_metadata:
            del documents_metadata[file_id]
            
        return {"success": True, "message": "Documento removido com sucesso"}
    except Exception as e:
        logger.error(f"Delete error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao remover documento"
        )