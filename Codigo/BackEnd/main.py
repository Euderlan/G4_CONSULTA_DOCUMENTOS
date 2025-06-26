# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import logging
import os

# Carrega variáveis de ambiente do arquivo .env
load_dotenv()

# Configuração do sistema de logging para monitoramento da aplicação
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Inicializa a aplicação FastAPI
app = FastAPI()

# Configuração de CORS usando variáveis de ambiente
# Le as origens permitidas do arquivo .env
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
environment = os.getenv("ENVIRONMENT", "development")

# Origens base do .env
origins = []
if allowed_origins_env:
    origins.extend(allowed_origins_env.split(","))

# Adiciona origens de desenvolvimento se estiver em ambiente de desenvolvimento
if environment == "development":
    development_origins = [
        "http://localhost:3000",                  # Ambiente de desenvolvimento React
        "http://localhost:3001",                  # Ambiente de desenvolvimento alternativo
        "http://127.0.0.1:3000",                  # Localhost alternativo
        "http://127.0.0.1:3001",                  # Localhost alternativo
        "http://192.168.0.15:3000",               # Seu IP específico atual
        "http://192.168.0.14:3000",               # IPs da rede local
        "http://192.168.0.13:3000",
        "http://192.168.0.12:3000",
        "http://192.168.0.11:3000",
        "http://192.168.0.10:3000",
        "http://192.168.1.15:3000",               # Rede local alternativa
        "http://10.0.0.15:3000",                  # Rede local alternativa
    ]
    origins.extend(development_origins)
    
    # Para desenvolvimento, também permite qualquer origem (menos seguro, só para dev)
    origins.append("*")

logger.info(f"CORS configurado para as origens: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "Origin", "X-Requested-With", "Authorization"],
)

# Importa as rotas modulares
# Certifique-se de que a pasta 'routes' e os arquivos existam e contenham 'router = APIRouter()'
from routes import login, chat, history, admin

# Inclui as rotas das telas na aplicação FastAPI
app.include_router(login.router, prefix="/api/login", tags=["Login"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(history.router, prefix="/api/history", tags=["History"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

# Endpoint de teste na raiz do FastAPI para verificar se a API está de pé
@app.get("/")
async def root():
    return {"message": "UFMA RAG API com FastAPI funcionando! Acesse /docs para a documentação interativa."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

