# BackEnd/routes/admin_requests.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging
from routes.login import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter()

# ========== MODELOS PYDANTIC ==========
class AdminRequest(BaseModel):
    id: int
    user_email: str
    user_name: str
    reason: str
    status: str  # 'pending', 'approved', 'denied'
    requested_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None

class CreateAdminRequest(BaseModel):
    reason: str

class ReviewAdminRequest(BaseModel):
    action: str  # 'approve' or 'deny'

# ========== ARMAZENAMENTO EM MEMÓRIA ==========
admin_requests_store = []
request_id_counter = 1

# ========== FUNÇÕES AUXILIARES ==========
def get_user_pending_request(user_email: str):
    """Verifica se usuário já tem solicitação pendente"""
    return next((req for req in admin_requests_store if req["user_email"] == user_email and req["status"] == "pending"), None)

def create_admin_request(user_email: str, user_name: str, reason: str) -> int:
    """Cria nova solicitação de admin"""
    global request_id_counter
    
    new_request = {
        "id": request_id_counter,
        "user_email": user_email,
        "user_name": user_name,
        "reason": reason,
        "status": "pending",
        "requested_at": datetime.now(),
        "reviewed_at": None,
        "reviewed_by": None
    }
    
    admin_requests_store.append(new_request)
    request_id_counter += 1
    
    logger.info(f"Nova solicitação de admin criada: {user_email}")
    return new_request["id"]

def get_pending_requests() -> List[dict]:
    """Retorna todas as solicitações pendentes"""
    return [req for req in admin_requests_store if req["status"] == "pending"]

def review_request(request_id: int, action: str, reviewer_email: str) -> bool:
    """Aprova ou nega uma solicitação"""
    for req in admin_requests_store:
        if req["id"] == request_id and req["status"] == "pending":
            req["status"] = "approved" if action == "approve" else "denied"
            req["reviewed_at"] = datetime.now()
            req["reviewed_by"] = reviewer_email
            logger.info(f"Solicitação {request_id} {req['status']} por {reviewer_email}")
            return True
    return False

# ========== ENDPOINTS ==========

@router.post("/request")
async def request_admin_privileges(
    request_data: CreateAdminRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """Endpoint para usuário solicitar privilégios de admin"""
    try:
        user_email = current_user["email"]
        user_name = current_user["name"]
        
        # Verifica se usuário já é admin
        if current_user.get("is_admin"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuário já possui privilégios de administrador"
            )
        
        # Verifica se já existe solicitação pendente
        if get_user_pending_request(user_email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Você já possui uma solicitação pendente"
            )
        
        # Valida razão
        if not request_data.reason.strip() or len(request_data.reason.strip()) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A justificativa deve ter pelo menos 10 caracteres"
            )
        
        # Cria solicitação
        request_id = create_admin_request(user_email, user_name, request_data.reason.strip())
        
        return {
            "message": "Solicitação enviada com sucesso",
            "request_id": request_id,
            "status": "pending"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar solicitação: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao processar solicitação"
        )

@router.get("/requests")
async def get_admin_requests(current_user: dict = Depends(get_current_active_user)):
    """Endpoint para admin listar solicitações pendentes"""
    try:
        # Verifica se é admin
        if not current_user.get("is_admin") and current_user["email"] != "admin@ufma.br":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: apenas administradores"
            )
        
        pending_requests = get_pending_requests()
        
        # Converte datetime para string
        serialized_requests = []
        for req in pending_requests:
            serialized_req = {
                "id": req["id"],
                "user_email": req["user_email"],
                "user_name": req["user_name"],
                "reason": req["reason"],
                "status": req["status"],
                "requested_at": req["requested_at"].isoformat(),
                "reviewed_at": req["reviewed_at"].isoformat() if req["reviewed_at"] else None,
                "reviewed_by": req["reviewed_by"]
            }
            serialized_requests.append(serialized_req)
        
        return {
            "requests": serialized_requests,
            "total": len(serialized_requests)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar solicitações: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao buscar solicitações"
        )

@router.post("/requests/{request_id}/review")
async def review_admin_request(
    request_id: int,
    review_data: ReviewAdminRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """Endpoint para admin aprovar/negar solicitação"""
    try:
        # Verifica se é admin
        if not current_user.get("is_admin") and current_user["email"] != "admin@ufma.br":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: apenas administradores"
            )
        
        # Valida ação
        if review_data.action not in ["approve", "deny"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ação deve ser 'approve' ou 'deny'"
            )
        
        # Processa solicitação
        success = review_request(request_id, review_data.action, current_user["email"])
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Solicitação não encontrada ou já processada"
            )
        
        # Se aprovado, atualiza usuário para admin
        if review_data.action == "approve":
            # Encontra a solicitação para pegar o email do usuário
            request = next((req for req in admin_requests_store if req["id"] == request_id), None)
            if request:
                # Importa users_db para atualizar usuário
                from routes.login import users_db
                user_email = request["user_email"]
                if user_email in users_db:
                    users_db[user_email]["is_admin"] = True
                    logger.info(f"Usuário {user_email} promovido a administrador")
        
        action_text = "aprovada" if review_data.action == "approve" else "negada"
        return {
            "message": f"Solicitação {action_text} com sucesso",
            "request_id": request_id,
            "action": review_data.action
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao revisar solicitação: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao revisar solicitação"
        )

@router.get("/my-request")
async def get_my_admin_request(current_user: dict = Depends(get_current_active_user)):
    """Endpoint para usuário verificar status de sua solicitação"""
    try:
        user_email = current_user["email"]
        
        # Busca solicitação do usuário
        user_request = next((req for req in admin_requests_store if req["user_email"] == user_email), None)
        
        if not user_request:
            return {"has_request": False}
        
        return {
            "has_request": True,
            "request": {
                "id": user_request["id"],
                "reason": user_request["reason"],
                "status": user_request["status"],
                "requested_at": user_request["requested_at"].isoformat(),
                "reviewed_at": user_request["reviewed_at"].isoformat() if user_request["reviewed_at"] else None,
                "reviewed_by": user_request["reviewed_by"]
            }
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar solicitação do usuário: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao buscar solicitação"
        )