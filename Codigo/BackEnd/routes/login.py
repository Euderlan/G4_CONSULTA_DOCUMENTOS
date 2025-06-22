# routes/login.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

router = APIRouter()

# Você pode definir um modelo para a resposta de login, se quiser
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    # Adicione outros campos como user_email, is_admin, etc., se o backend retornar

@router.post("", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Endpoint de login de usuário.
    NOTA: Esta é uma implementação simulada. A lógica real de autenticação e geração de tokens
    (ex: JWT) deve ser adicionada aqui, incluindo validação de credenciais com um banco de dados.
    """
    # Lógica de autenticação aqui
    # Exemplo simples de validação (NÃO USAR EM PRODUÇÃO):
    if form_data.username == "test@test.com" and form_data.password == "password":
        return {"access_token": "token_fake_para_test@test.com", "token_type": "bearer"}
    elif form_data.username == "admin.consepe@ufma.br" and form_data.password == "adminpass":
        return {"access_token": "token_fake_para_admin@ufma.br", "token_type": "bearer"}
    else:
        raise HTTPException(status_code=400, detail="Credenciais inválidas.")

@router.post("/google")
async def google_login():
    """
    Endpoint para integração com login do Google.
    NOTA: Esta é uma implementação simulada. A lógica real de OAuth 2.0 com Google
    (ex: usar Google Sign-In SDK e verificar o token no backend) deve ser adicionada aqui.
    """
    # Integração com Google
    return {"status": "ok", "message": "Login com Google simulado com sucesso."}
