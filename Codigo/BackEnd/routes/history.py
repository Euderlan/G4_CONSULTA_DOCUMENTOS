# routes/history.py
from fastapi import APIRouter, Depends, HTTPException
# from your_auth_module import get_current_user # Se for implementar autenticação real

router = APIRouter()

@router.get("")
async def get_history(user_id: str = "simulated_user_id"):
    """
    Endpoint para buscar o histórico de conversas de um usuário.
    NOTA: Esta é uma implementação simulada. A lógica real deve buscar
    o histórico de um banco de dados associado ao ID do usuário autenticado.
    """
    # Lógica para buscar histórico
    # Por enquanto, retorna um histórico mock
    mock_history = [
        {"id": 1, "question": "Qual é a história da UFMA?", "answer": "A UFMA foi fundada em 1966..."},
        {"id": 2, "question": "Como posso me matricular?", "answer": "Para se matricular, siga os passos..."},
    ]
    return {"history": mock_history, "message": "Histórico simulado."}

# Exemplo de como você usaria a autenticação (descomente e implemente se necessário):
# @router.get("/me")
# async def read_users_me(current_user: dict = Depends(get_current_user)):
#     return current_user
