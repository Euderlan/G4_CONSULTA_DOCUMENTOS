# routes/chat.py
from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
import os
import logging

# Importa as funções e a document_store do módulo utils
# CERTIFIQUE-SE QUE ESTA LINHA ESTÁ CORRETA, IMPORTANDO DE routes.utils
from routes.utils import simple_search, document_store

# Carrega variáveis de ambiente
load_dotenv()

# Inicializa o cliente Groq
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Configura o logger
logger = logging.getLogger(__name__)

# Cria um APIRouter para agrupar as rotas do chat
router = APIRouter()

# Define o modelo de requisição para o endpoint de chat
class ChatRequest(BaseModel):
    question: str

@router.post("")
async def send_message(request: ChatRequest = Body(...)):
    """
    Endpoint principal para processamento de perguntas dos usuários.
    Implementa pipeline completo: busca de contexto → geração de resposta → formatação.
    
    Args:
        request (ChatRequest): Objeto contendo a pergunta do usuário.

    Returns:
        dict: Dicionário com a resposta do LLM, fontes e contexto.
    """
    try:
        question = request.question
        
        if not question:
            raise HTTPException(status_code=400, detail='Pergunta não fornecida.')
        
        logger.info(f"Pergunta recebida: {question}")
        
        # Verificação de disponibilidade de documentos no sistema
        if not document_store:
            return {
                'answer': 'Ainda não há documentos carregados no sistema. Por favor, faça upload de documentos da UFMA para começar a fazer perguntas.',
                'sources': [],
                'context': ''
            }
        
        # Execução da busca por documentos relevantes à pergunta
        search_results = simple_search(question, document_store)
        
        if not search_results:
            return {
                'answer': 'Não encontrei informações relevantes nos documentos carregados para responder sua pergunta.',
                'sources': [],
                'context': ''
            }
        
        # Preparação do contexto agregado para o modelo de linguagem
        context_parts = []
        sources = []
        
        for result in search_results:
            context_parts.append(result['content'])
            sources.append({
                'nome do arquivo': result['filename'],
                'score': result['score'],
                'conteudo': result['content'][:200] + "..." if len(result['content']) > 200 else result['content']
            })
        
        context = "\n\n".join(context_parts)
        
        # Construção do prompt especializado para documentos da UFMA
        prompt = f"""Você é um assistente especializado em documentos da UFMA (Universidade Federal do Maranhão).

Pergunta: {question}

Contexto dos documentos da UFMA:
{context}

Responda de forma clara e precisa baseando-se apenas nas informações fornecidas dos documentos da UFMA:"""
        
        # Processamento da resposta através do modelo Groq LLM
        try:
            response = client.chat.completions.create(
                model="llama3-8b-8192", # Modelo Groq
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1000,
                temperature=0.3
            )
            
            answer = response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Erro no Groq: {e}")
            answer = f"Erro ao processar resposta do modelo de linguagem: {str(e)}"
        
        return {
            'answer': answer,
            'sources': sources,
            'context': context[:500] + "..." if len(context) > 500 else context
        }
        
    except Exception as e:
        logger.error(f"Erro no chat: {e}")
        raise HTTPException(status_code=500, detail=f'Erro interno do servidor: {str(e)}')
