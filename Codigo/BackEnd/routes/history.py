# routes/history.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging

# ========== IMPORTAÇÃO DO SISTEMA DE AUTENTICAÇÃO ==========
# Importa função de autenticação do módulo de login
# Esta função verifica se o usuário está logado e retorna dados do usuário
from routes.login import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter()

# ========== MODELOS DE DADOS (PYDANTIC) ==========
# Define a estrutura dos dados que serão manipulados

class ChatEntry(BaseModel):
    """Modelo para uma entrada de conversa no histórico"""
    id: int                              # ID único da conversa
    question: str                        # Pergunta feita pelo usuário
    answer: str                          # Resposta gerada pelo bot
    timestamp: datetime                  # Data/hora da conversa
    sources: Optional[List[dict]] = []   # Documentos consultados (opcional)

class SaveChatRequest(BaseModel):
    """Modelo para requisição de salvamento manual de conversa"""
    question: str
    answer: str
    sources: Optional[List[dict]] = []

# ========== ARMAZENAMENTO EM MEMÓRIA ==========
# IMPORTANTE: Em produção, substituir por banco de dados real!

# Dicionário principal que armazena o histórico de todos os usuários
# Estrutura: {email_do_usuario: [lista_de_conversas]}
user_history_store = {}

# Contador global para gerar IDs únicos para cada mensagem
# Incrementa a cada nova conversa salva
message_id_counter = 1

# ========== FUNÇÕES AUXILIARES PARA MANIPULAÇÃO DO HISTÓRICO ==========

def get_user_history(user_email: str) -> List[dict]:
    """
    Busca o histórico completo de um usuário específico
    
    Args:
        user_email: Email do usuário (usado como chave única)
    
    Returns:
        Lista de conversas do usuário ou lista vazia se não existir
    """
    return user_history_store.get(user_email, [])

def add_chat_entry(user_email: str, question: str, answer: str, sources: List[dict] = None) -> int:
    """
    Adiciona uma nova conversa ao histórico do usuário
    Esta é a função PRINCIPAL usada pelo sistema de chat
    
    Args:
        user_email: Email do usuário
        question: Pergunta feita
        answer: Resposta gerada
        sources: Documentos consultados (opcional)
    
    Returns:
        ID da nova entrada criada
    """
    global message_id_counter
    
    # Se é a primeira conversa do usuário, cria a lista
    if user_email not in user_history_store:
        user_history_store[user_email] = []
    
    # Cria nova entrada com timestamp atual
    new_entry = {
        "id": message_id_counter,
        "question": question,
        "answer": answer,
        "timestamp": datetime.now(),
        "sources": sources or []
    }
    
    # Adiciona ao histórico do usuário
    user_history_store[user_email].append(new_entry)
    message_id_counter += 1
    
    logger.info(f"Nova entrada adicionada ao histórico de {user_email}")
    return new_entry["id"]

def clear_user_history(user_email: str) -> bool:
    """Limpa todo o histórico de um usuário"""
    if user_email in user_history_store:
        user_history_store[user_email] = []
        logger.info(f"Histórico limpo para usuário {user_email}")
        return True
    return False

def delete_chat_entry(user_email: str, entry_id: int) -> bool:
    """Remove uma conversa específica do histórico"""
    if user_email not in user_history_store:
        return False
    
    user_history = user_history_store[user_email]
    for i, entry in enumerate(user_history):
        if entry["id"] == entry_id:
            del user_history[i]
            logger.info(f"Entrada {entry_id} removida do histórico de {user_email}")
            return True
    return False

# ========== ENDPOINTS DA API ==========

@router.get("", response_model=dict)
async def get_history(current_user: dict = Depends(get_current_active_user)):
    """
    ENDPOINT PRINCIPAL: Busca todo o histórico do usuário logado
    
    - Verifica autenticação automaticamente via Depends()
    - Busca histórico usando email do usuário como chave
    - Converte datetime para string (JSON não suporta datetime)
    - Retorna histórico formatado para o frontend
    """
    try:
        user_email = current_user["email"]  # Extrai email do usuário logado
        history = get_user_history(user_email)
        
        # CONVERSÃO IMPORTANTE: datetime -> string para JSON
        serialized_history = []
        for entry in history:
            serialized_entry = {
                "id": entry["id"],
                "question": entry["question"],
                "answer": entry["answer"],
                "timestamp": entry["timestamp"].isoformat(),  # datetime -> string ISO
                "sources": entry["sources"]
            }
            serialized_history.append(serialized_entry)
        
        logger.info(f"Histórico recuperado para {user_email}: {len(history)} entradas")
        
        return {
            "history": serialized_history,
            "total_entries": len(history),
            "user": user_email
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar histórico: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao buscar histórico"
        )

@router.post("/save")
async def save_chat(
    chat_data: SaveChatRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    ENDPOINT PARA SALVAMENTO MANUAL
    
    - Permite salvar conversa manualmente (além do salvamento automático)
    - Valida se pergunta e resposta não estão vazias
    - Usa a mesma função add_chat_entry() do salvamento automático
    """
    try:
        user_email = current_user["email"]
        
        # Validação básica dos dados
        if not chat_data.question.strip() or not chat_data.answer.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pergunta e resposta são obrigatórias"
            )
        
        # Salva usando a mesma função do chat automático
        entry_id = add_chat_entry(
            user_email=user_email,
            question=chat_data.question.strip(),
            answer=chat_data.answer.strip(),
            sources=chat_data.sources or []
        )
        
        return {
            "message": "Conversa salva com sucesso",
            "entry_id": entry_id,
            "user": user_email
        }
        
    except HTTPException:
        raise  # Re-propaga erros HTTP específicos
    except Exception as e:
        logger.error(f"Erro ao salvar conversa: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao salvar conversa"
        )

@router.delete("/clear")
async def clear_history(current_user: dict = Depends(get_current_active_user)):
    """
    ENDPOINT PARA LIMPAR TODO O HISTÓRICO
    
    - Remove todas as conversas do usuário
    - Útil para "começar do zero" ou por questões de privacidade
    """
    try:
        user_email = current_user["email"]
        success = clear_user_history(user_email)
        
        if success:
            return {
                "message": "Histórico limpo com sucesso",
                "user": user_email
            }
        else:
            return {
                "message": "Nenhum histórico encontrado para limpar",
                "user": user_email
            }
            
    except Exception as e:
        logger.error(f"Erro ao limpar histórico: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao limpar histórico"
        )

@router.delete("/{entry_id}")
async def delete_entry(
    entry_id: int,
    current_user: dict = Depends(get_current_active_user)
):
    """
    ENDPOINT PARA REMOVER CONVERSA ESPECÍFICA
    
    - Remove apenas uma conversa pelo ID
    - Útil para excluir conversas indesejadas individualmente
    """
    try:
        user_email = current_user["email"]
        success = delete_chat_entry(user_email, entry_id)
        
        if success:
            return {
                "message": f"Entrada {entry_id} removida com sucesso",
                "user": user_email
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entrada não encontrada no histórico"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao remover entrada do histórico: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao remover entrada"
        )

@router.get("/stats")
async def get_history_stats(current_user: dict = Depends(get_current_active_user)):
    """
    ENDPOINT PARA ESTATÍSTICAS DO HISTÓRICO
    
    - Retorna informações úteis como:
      * Total de conversas
      * Data da primeira conversa
      * Data da última conversa
    - Útil para dashboard ou informações do usuário
    """
    try:
        user_email = current_user["email"]
        history = get_user_history(user_email)
        
        total_entries = len(history)
        if total_entries == 0:
            return {
                "total_entries": 0,
                "first_entry": None,
                "last_entry": None,
                "user": user_email
            }
        
        # Encontra primeira e última entrada por timestamp
        first_entry = min(history, key=lambda x: x["timestamp"])
        last_entry = max(history, key=lambda x: x["timestamp"])
        
        return {
            "total_entries": total_entries,
            "first_entry": first_entry["timestamp"].isoformat(),
            "last_entry": last_entry["timestamp"].isoformat(),
            "user": user_email
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar estatísticas: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao buscar estatísticas"
        )
