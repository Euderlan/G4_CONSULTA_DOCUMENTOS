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

# Configuração de CORS definitiva para produção e desenvolvimento
# Permite requisições apenas dos domínios autorizados com controle completo
origins = [
    "https://consulta-documento.vercel.app",  # URL de produção principal
    "http://localhost:3000",                  # Ambiente de desenvolvimento React
    "http://localhost:3001"                   # Ambiente de desenvolvimento alternativo
]

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

# O bloco if __name__ == '__main__': não é necessário aqui,
# pois o Uvicorn (uvicorn main:app --reload) já cuida da inicialização.