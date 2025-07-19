from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os
from dotenv import load_dotenv
import logging

# Google Auth imports
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
import google.auth.exceptions

# Carrega variáveis de ambiente
load_dotenv()

# Configurações
SECRET_KEY = os.getenv("SECRET_KEY", "sbM613IFEBDOdAoputAckOOEh-rTwZSs932aAoyw2YfU")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

# Setup do logger
logger = logging.getLogger(__name__)

# Configuração de criptografia de senhas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme para autenticação
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

router = APIRouter()

# ========== MODELOS PYDANTIC ==========

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    is_admin: bool
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None

class GoogleLoginRequest(BaseModel):
    google_token: str
    google_id: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None
    email_verified: Optional[bool] = None
    given_name: Optional[str] = None
    family_name: Optional[str] = None

# ========== BANCO DE DADOS EM MEMÓRIA ==========

users_db = {
    "admin@ufma.br": {
        "id": 1,
        "name": "Administrador UFMA",
        "email": "admin@ufma.br",
        "hashed_password": pwd_context.hash("admin123"),
        "is_admin": True,
        "created_at": datetime.now()
    },
    "usuario@ufma.br": {
        "id": 2,
        "name": "Usuário Teste",
        "email": "usuario@ufma.br",
        "hashed_password": pwd_context.hash("user123"),
        "is_admin": False,
        "created_at": datetime.now()
    }
}

# Contador para IDs de novos usuários
next_user_id = 3

# ========== FUNÇÕES AUXILIARES ==========

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha está correta"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Gera hash da senha"""
    return pwd_context.hash(password)

def get_user_by_email(email: str):
    """Busca usuário por email"""
    return users_db.get(email)

def authenticate_user(email: str, password: str):
    """Autentica usuário"""
    user = get_user_by_email(email)
    if not user:
        return False
    if not verify_password(password, user["hashed_password"]):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Cria token JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Obtém usuário atual pelo token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = get_user_by_email(email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: dict = Depends(get_current_user)):
    """Obtém usuário ativo atual"""
    return current_user

# ========== ENDPOINTS ==========

@router.post("/register", response_model=UserResponse)
async def register_user(user_data: UserCreate):
    """
    Endpoint para registro de novos usuários.
    Valida dados, verifica se usuário já existe e cria nova conta.
    """
    try:
        # Verifica se o usuário já existe
        if get_user_by_email(user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email já está registrado no sistema"
            )
        
        # Valida se a senha tem pelo menos 6 caracteres
        if len(user_data.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A senha deve ter pelo menos 6 caracteres"
            )
        
        # Valida se o nome tem pelo menos 2 caracteres
        if len(user_data.name.strip()) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O nome deve ter pelo menos 2 caracteres"
            )
        
        global next_user_id
        
        # Cria novo usuário
        new_user = {
            "id": next_user_id,
            "name": user_data.name.strip(),
            "email": user_data.email.lower(),
            "hashed_password": get_password_hash(user_data.password),
            "is_admin": user_data.email.lower().endswith("@ufma.br") and "admin" in user_data.email.lower(),
            "created_at": datetime.now()
        }
        
        # Adiciona ao "banco de dados"
        users_db[user_data.email.lower()] = new_user
        next_user_id += 1
        
        logger.info(f"Novo usuário registrado: {user_data.email}")
        
        return UserResponse(
            id=new_user["id"],
            name=new_user["name"],
            email=new_user["email"],
            is_admin=new_user["is_admin"],
            created_at=new_user["created_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no registro: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno do servidor no registro"
        )

@router.post("/", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Endpoint principal de login com email/senha.
    Retorna token JWT e informações do usuário.
    """
    try:
        # Autentica o usuário
        user = authenticate_user(form_data.username.lower(), form_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou senha incorretos",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Cria token de acesso
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["email"]}, expires_delta=access_token_expires
        )
        
        logger.info(f"Login realizado: {user['email']}")
        
        # Retorna token e dados do usuário
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(
                id=user["id"],
                name=user["name"],
                email=user["email"],
                is_admin=user["is_admin"],
                created_at=user["created_at"]
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno do servidor no login"
        )

@router.post("/google", response_model=Token)
async def google_login(google_data: GoogleLoginRequest):
    """
    Endpoint para login com Google OAuth usando Google Identity Services.
    Valida o token do Google e cria/autentica o usuário.
    """
    try:
        # Configurações do Google
        GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
        
        if not GOOGLE_CLIENT_ID:
            logger.error("GOOGLE_CLIENT_ID não configurado")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth não configurado no servidor"
            )
        
        logger.info(f"Tentativa de login Google com token: {google_data.google_token[:50]}...")
        
        try:
            # Verificar e decodificar o token do Google
            idinfo = id_token.verify_oauth2_token(
                google_data.google_token, 
                google_requests.Request(), 
                GOOGLE_CLIENT_ID
            )
            
            logger.info(f"Token Google verificado com sucesso. Payload: {idinfo}")
            
            # Extrair informações do usuário do token
            google_email = idinfo.get('email')
            google_name = idinfo.get('name')
            google_picture = idinfo.get('picture')
            google_user_id = idinfo.get('sub')
            email_verified = idinfo.get('email_verified', False)
            
            if not google_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email não fornecido pelo Google"
                )
            
            if not email_verified:
                logger.warning(f"Email não verificado para {google_email}")
                # Continuar mesmo assim, mas logar o aviso
            
        except google.auth.exceptions.GoogleAuthError as e:
            logger.error(f"Erro na verificação do token Google: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token do Google inválido"
            )
        except ValueError as e:
            logger.error(f"Erro no token Google (ValueError): {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token do Google malformado"
            )
        except Exception as e:
            logger.error(f"Erro inesperado na verificação do token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Erro na verificação do token Google"
            )
        
        # Verificar se usuário já existe
        user = get_user_by_email(google_email)
        
        if not user:
            # Criar novo usuário automaticamente para login do Google
            global next_user_id
            user = {
                "id": next_user_id,
                "name": google_name or google_email.split('@')[0],
                "email": google_email,
                "hashed_password": get_password_hash(f"google_auth_{google_user_id}"),
                "is_admin": google_email.lower().endswith("@ufma.br") and "admin" in google_email.lower(),
                "created_at": datetime.now(),
                "google_id": google_user_id,
                "picture": google_picture,
                "login_method": "google"
            }
            users_db[google_email] = user
            next_user_id += 1
            logger.info(f"Novo usuário criado via Google: {google_email}")
        else:
            # Atualizar informações do Google se necessário
            if not user.get("google_id"):
                user["google_id"] = google_user_id
            if not user.get("picture") and google_picture:
                user["picture"] = google_picture
            user["login_method"] = "google"
            logger.info(f"Usuário existente logado via Google: {google_email}")
        
        # Criar token de acesso
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["email"]}, expires_delta=access_token_expires
        )
        
        logger.info(f"Login Google realizado com sucesso: {user['email']}")
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(
                id=user["id"],
                name=user["name"],
                email=user["email"],
                is_admin=user["is_admin"],
                created_at=user["created_at"]
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no login Google: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno no login com Google"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_active_user)):
    """
    Endpoint para obter informações do usuário logado.
    Requer token de autenticação.
    """
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        is_admin=current_user["is_admin"],
        created_at=current_user["created_at"]
    )

@router.post("/logout")
async def logout():
    """
    Endpoint de logout.
    NOTA: Com JWT, o logout real seria implementado com blacklist de tokens.
    """
    return {"message": "Logout realizado com sucesso"}

@router.get("/users")
async def list_users(current_user: dict = Depends(get_current_active_user)):
    """
    Endpoint para listar usuários (apenas para admins).
    """
    if not current_user["is_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: apenas administradores"
        )
    
    users_list = []
    for user_data in users_db.values():
        users_list.append(UserResponse(
            id=user_data["id"],
            name=user_data["name"],
            email=user_data["email"],
            is_admin=user_data["is_admin"],
            created_at=user_data["created_at"]
        ))
    
    return {"users": users_list, "total": len(users_list)}

@router.get("/test-auth")
async def test_auth_endpoint(current_user: dict = Depends(get_current_active_user)):
    """
    Endpoint de teste para verificar se a autenticação está funcionando.
    """
    return {
        "message": "Autenticação funcionando!",
        "user": {
            "email": current_user["email"],
            "name": current_user["name"],
            "is_admin": current_user["is_admin"]
        }
    }