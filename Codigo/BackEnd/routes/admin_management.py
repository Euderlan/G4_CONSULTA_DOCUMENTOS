from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging
from routes.login import get_current_active_user, users_db

logger = logging.getLogger(__name__)
router = APIRouter()

# ========== MODELOS PYDANTIC ==========
class AdminUser(BaseModel):
    id: int
    name: str
    email: str
    is_admin: bool
    created_at: datetime
    promoted_at: Optional[datetime] = None
    promoted_by: Optional[str] = None
    last_login: Optional[datetime] = None
    status: str  # 'active', 'suspended'

class AdminAction(BaseModel):
    action: str  # 'activate', 'deactivate', 'remove'
    reason: Optional[str] = None

class AdminPromotion(BaseModel):
    user_email: str
    reason: Optional[str] = None

# ========== FUNÇÕES AUXILIARES ==========
def is_super_admin(user: dict) -> bool:
    """Verifica se é o admin principal (super admin)"""
    return user.get("email") == "admin@ufma.br"

def is_admin_user(user: dict) -> bool:
    """Verifica se o usuário tem privilégios de admin"""
    return user.get("is_admin", False) or is_super_admin(user)

def get_all_admin_users() -> List[dict]:
    """Retorna todos os usuários com privilégios de admin"""
    admin_users = []
    for email, user_data in users_db.items():
        if user_data.get("is_admin", False):
            admin_users.append(user_data)
    return admin_users

def promote_user_to_admin(user_email: str, promoted_by: str, reason: str = None) -> bool:
    """Promove um usuário a administrador"""
    if user_email in users_db:
        users_db[user_email]["is_admin"] = True
        users_db[user_email]["promoted_at"] = datetime.now()
        users_db[user_email]["promoted_by"] = promoted_by
        users_db[user_email]["promotion_reason"] = reason
        users_db[user_email]["status"] = "active"
        logger.info(f"Usuário {user_email} promovido a admin por {promoted_by}")
        return True
    return False

def demote_admin_user(user_email: str, demoted_by: str, reason: str = None) -> bool:
    """Remove privilégios de admin de um usuário"""
    if user_email in users_db and user_email != "admin@ufma.br":  # Não pode remover super admin
        users_db[user_email]["is_admin"] = False
        users_db[user_email]["demoted_at"] = datetime.now()
        users_db[user_email]["demoted_by"] = demoted_by
        users_db[user_email]["demotion_reason"] = reason
        users_db[user_email]["status"] = "user"
        logger.info(f"Usuário {user_email} removido de admin por {demoted_by}")
        return True
    return False

def suspend_admin_user(user_email: str, suspended_by: str, reason: str = None) -> bool:
    """Suspende temporariamente um admin (mantém privilégios mas desativa)"""
    if user_email in users_db and user_email != "admin@ufma.br":
        users_db[user_email]["status"] = "suspended"
        users_db[user_email]["suspended_at"] = datetime.now()
        users_db[user_email]["suspended_by"] = suspended_by
        users_db[user_email]["suspension_reason"] = reason
        logger.info(f"Admin {user_email} suspenso por {suspended_by}")
        return True
    return False

def reactivate_admin_user(user_email: str, reactivated_by: str) -> bool:
    """Reativa um admin suspenso"""
    if user_email in users_db and user_email != "admin@ufma.br":
        users_db[user_email]["status"] = "active"
        users_db[user_email]["reactivated_at"] = datetime.now()
        users_db[user_email]["reactivated_by"] = reactivated_by
        logger.info(f"Admin {user_email} reativado por {reactivated_by}")
        return True
    return False

# ========== ENDPOINTS ==========

@router.get("/admins")
async def list_admin_users(current_user: dict = Depends(get_current_active_user)):
    """Endpoint para listar todos os administradores"""
    try:
        # Apenas super admin pode ver a lista de admins
        if not is_super_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: apenas o administrador principal pode gerenciar admins"
            )
        
        admin_users = get_all_admin_users()
        
        # Serializa os dados para JSON
        serialized_admins = []
        for admin in admin_users:
            # Determina o tipo de admin
            admin_type = "super" if admin["email"] == "admin@ufma.br" else "regular"
            
            serialized_admin = {
                "id": admin["id"],
                "name": admin["name"],
                "email": admin["email"],
                "is_admin": admin["is_admin"],
                "admin_type": admin_type,
                "created_at": admin["created_at"].isoformat(),
                "promoted_at": admin.get("promoted_at").isoformat() if admin.get("promoted_at") else None,
                "promoted_by": admin.get("promoted_by"),
                "promotion_reason": admin.get("promotion_reason"),
                "status": admin.get("status", "active"),
                "last_login": admin.get("last_login").isoformat() if admin.get("last_login") else None,
                "suspended_at": admin.get("suspended_at").isoformat() if admin.get("suspended_at") else None,
                "suspended_by": admin.get("suspended_by"),
                "suspension_reason": admin.get("suspension_reason")
            }
            serialized_admins.append(serialized_admin)
        
        # Ordena por tipo (super admin primeiro) e depois por nome
        serialized_admins.sort(key=lambda x: (x["admin_type"] != "super", x["name"]))
        
        return {
            "admins": serialized_admins,
            "total": len(serialized_admins),
            "super_admin_email": current_user["email"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao listar admins: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao buscar administradores"
        )

@router.post("/promote")
async def promote_user_to_admin_endpoint(
    promotion_data: AdminPromotion,
    current_user: dict = Depends(get_current_active_user)
):
    """Endpoint para promover um usuário a administrador"""
    try:
        # Apenas super admin pode promover usuários
        if not is_super_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: apenas o administrador principal pode promover usuários"
            )
        
        # Verifica se o usuário existe
        if promotion_data.user_email not in users_db:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
        
        # Verifica se o usuário já é admin
        if users_db[promotion_data.user_email].get("is_admin", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuário já possui privilégios de administrador"
            )
        
        # Promove o usuário
        success = promote_user_to_admin(
            promotion_data.user_email,
            current_user["email"],
            promotion_data.reason
        )
        
        if success:
            return {
                "message": f"Usuário {promotion_data.user_email} promovido a administrador com sucesso",
                "promoted_user": promotion_data.user_email,
                "promoted_by": current_user["email"],
                "reason": promotion_data.reason
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Falha ao promover usuário"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao promover usuário: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao promover usuário"
        )

@router.post("/manage/{admin_email}")
async def manage_admin_user(
    admin_email: str,
    action_data: AdminAction,
    current_user: dict = Depends(get_current_active_user)
):
    """Endpoint para gerenciar um administrador (ativar, desativar, remover)"""
    try:
        # Apenas super admin pode gerenciar outros admins
        if not is_super_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: apenas o administrador principal pode gerenciar admins"
            )
        
        # Não pode gerenciar a si mesmo
        if admin_email == current_user["email"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não é possível gerenciar a própria conta"
            )
        
        # Verifica se o usuário existe
        if admin_email not in users_db:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Administrador não encontrado"
            )
        
        # Verifica se o usuário é realmente admin
        if not users_db[admin_email].get("is_admin", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuário não possui privilégios de administrador"
            )
        
        success = False
        message = ""
        
        if action_data.action == "suspend":
            success = suspend_admin_user(admin_email, current_user["email"], action_data.reason)
            message = f"Administrador {admin_email} suspenso com sucesso"
            
        elif action_data.action == "reactivate":
            success = reactivate_admin_user(admin_email, current_user["email"])
            message = f"Administrador {admin_email} reativado com sucesso"
            
        elif action_data.action == "remove":
            success = demote_admin_user(admin_email, current_user["email"], action_data.reason)
            message = f"Privilégios de administrador removidos de {admin_email} com sucesso"
            
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ação inválida. Use: suspend, reactivate ou remove"
            )
        
        if success:
            return {
                "message": message,
                "action": action_data.action,
                "target_user": admin_email,
                "performed_by": current_user["email"],
                "reason": action_data.reason
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Falha ao executar ação: {action_data.action}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao gerenciar admin: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao gerenciar administrador"
        )

@router.get("/users/non-admin")
async def list_non_admin_users(current_user: dict = Depends(get_current_active_user)):
    """Endpoint para listar usuários que não são administradores (para promoção)"""
    try:
        # Apenas super admin pode ver esta lista
        if not is_super_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: apenas o administrador principal"
            )
        
        non_admin_users = []
        for email, user_data in users_db.items():
            if not user_data.get("is_admin", False) and email != "admin@ufma.br":
                non_admin_users.append({
                    "id": user_data["id"],
                    "name": user_data["name"],
                    "email": user_data["email"],
                    "created_at": user_data["created_at"].isoformat(),
                    "last_login": user_data.get("last_login").isoformat() if user_data.get("last_login") else None
                })
        
        # Ordena por nome
        non_admin_users.sort(key=lambda x: x["name"])
        
        return {
            "users": non_admin_users,
            "total": len(non_admin_users)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao listar usuários não-admin: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao buscar usuários"
        )

@router.get("/activity-log")
async def get_admin_activity_log(current_user: dict = Depends(get_current_active_user)):
    """Endpoint para ver log de atividades administrativas"""
    try:
        # Apenas super admin pode ver o log
        if not is_super_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: apenas o administrador principal"
            )
        
        activities = []
        
        # Percorre todos os usuários para coletar atividades administrativas
        for email, user_data in users_db.items():
            
            # Promoções
            if user_data.get("promoted_at"):
                activities.append({
                    "type": "promotion",
                    "timestamp": user_data["promoted_at"].isoformat(),
                    "target_user": email,
                    "target_name": user_data["name"],
                    "performed_by": user_data.get("promoted_by"),
                    "reason": user_data.get("promotion_reason"),
                    "description": f"{user_data['name']} foi promovido a administrador"
                })
            
            # Remoções
            if user_data.get("demoted_at"):
                activities.append({
                    "type": "demotion",
                    "timestamp": user_data["demoted_at"].isoformat(),
                    "target_user": email,
                    "target_name": user_data["name"],
                    "performed_by": user_data.get("demoted_by"),
                    "reason": user_data.get("demotion_reason"),
                    "description": f"Privilégios de admin removidos de {user_data['name']}"
                })
            
            # Suspensões
            if user_data.get("suspended_at"):
                activities.append({
                    "type": "suspension",
                    "timestamp": user_data["suspended_at"].isoformat(),
                    "target_user": email,
                    "target_name": user_data["name"],
                    "performed_by": user_data.get("suspended_by"),
                    "reason": user_data.get("suspension_reason"),
                    "description": f"{user_data['name']} foi suspenso"
                })
            
            # Reativações
            if user_data.get("reactivated_at"):
                activities.append({
                    "type": "reactivation",
                    "timestamp": user_data["reactivated_at"].isoformat(),
                    "target_user": email,
                    "target_name": user_data["name"],
                    "performed_by": user_data.get("reactivated_by"),
                    "reason": None,
                    "description": f"{user_data['name']} foi reativado"
                })
        
        # Ordena por timestamp (mais recente primeiro)
        activities.sort(key=lambda x: x["timestamp"], reverse=True)
        
        # Limita a 50 atividades mais recentes
        activities = activities[:50]
        
        return {
            "activities": activities,
            "total": len(activities)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar log de atividades: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao buscar atividades"
        )