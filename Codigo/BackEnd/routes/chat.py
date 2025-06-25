# routes/chat.py
# Módulo responsável por gerenciar as interações de chat.
# Este componente coordena a recuperação de informações de documentos e a geração de respostas
# utilizando um modelo de linguagem grande (LLM) da Groq.

from fastapi import APIRouter, Body, HTTPException, Depends
from pydantic import BaseModel
from groq import Groq # Cliente para interagir com a API Groq
from dotenv import load_dotenv
import os
import logging

# Importa as funções auxiliares necessárias para o pipeline RAG (Retrieval-Augmented Generation):
#   - generate_embedding: Para converter texto em vetores numéricos.
#   - get_pinecone_index: Para acessar a instância do índice Pinecone.
from routes.utils import generate_embedding, get_pinecone_index

# Importa autenticação e função para salvar histórico
from routes.login import get_current_active_user

# Carrega as variáveis de ambiente definidas no arquivo .env do projeto.
load_dotenv()

# Inicializa o cliente Groq. A chave da API é carregada de forma segura das variáveis de ambiente.
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Configura o logger específico para este módulo para facilitar o rastreamento de eventos e erros.
logger = logging.getLogger(__name__)

# Cria um APIRouter, que permite organizar rotas relacionadas ao chat de forma modular.
router = APIRouter()

# Define o modelo de dados para a requisição de chat.
# Utiliza Pydantic para validação automática da entrada.
class ChatRequest(BaseModel):
    question: str # O único campo esperado na requisição é a pergunta do usuário.

@router.post("")
async def send_message(
    request: ChatRequest = Body(...),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Endpoint principal para o processamento de mensagens de chat.
    Implementa o fluxo de trabalho de Retrieval-Augmented Generation (RAG):
    1.  A pergunta do usuário é convertida em um embedding vetorial.
    2.  Este embedding é usado para buscar documentos relevantes em um banco de dados vetorial (Pinecone).
    3.  Os trechos de documentos recuperados são combinados com a pergunta original
        para formar um prompt contextualizado para o LLM.
    4.  O modelo de linguagem da Groq processa este prompt e gera uma resposta coerente e informada.
    5.  A resposta do LLM, juntamente com as fontes consultadas, é retornada ao cliente.
    6.  A conversa é automaticamente salva no histórico do usuário autenticado.

    Args:
        request (ChatRequest): Objeto contendo a pergunta do usuário.
        current_user (dict): Dados do usuário autenticado.

    Returns:
        dict: Um dicionário contendo a resposta gerada (`answer`),
              as fontes dos documentos utilizados (`sources`) e um trecho do contexto completo (`context`).

    Raises:
        HTTPException: Erros HTTP são levantados para cenários como perguntas ausentes,
                       ou falhas na inicialização/acesso a serviços externos (Pinecone, Groq).
    """
    try: # ESTE É O INÍCIO DO BLOCO TRY
        question = request.question
        
        if not question:
            raise HTTPException(status_code=400, detail='A pergunta do usuário não foi fornecida.')

        # Etapa 1: Geração do embedding da pergunta do usuário.
        # Este vetor numérico é a representação semântica da pergunta.
        question_embedding = generate_embedding(question)

        # Etapa 2: Busca de contexto relevante no Pinecone.
        # Verifica se a instância do índice Pinecone está disponível.
        pinecone_index_instance = get_pinecone_index()
        if not pinecone_index_instance:
            raise HTTPException(status_code=500, detail="O índice Pinecone não foi inicializado ou está inacessível. O serviço de busca de documentos está inoperante.")

        # Realiza a consulta de similaridade no Pinecone.
        # top_k define o número de resultados mais semelhantes a serem retornados.
        # include_metadata=True é fundamental para recuperar o conteúdo textual original dos chunks e seus metadados.
        query_results = pinecone_index_instance.query(
            vector=question_embedding,
            top_k=4, # Configurado para buscar os 4 chunks mais relevantes.
            include_metadata=True 
        )

        context_parts = [] # Lista para armazenar o conteúdo dos chunks recuperados.
        sources = []       # Lista para armazenar informações das fontes para o frontend.

        # Processa cada resultado (match) retornado pelo Pinecone.
        for match in query_results.matches:
            # Extrai o conteúdo e os metadados do chunk. Um valor padrão é usado se a chave não existir.
            content = match.metadata.get('content', 'Conteúdo do chunk não encontrado.')
            filename = match.metadata.get('filename', 'N/A')
            score = match.score # A pontuação de similaridade do Pinecone.
            
            context_parts.append(content) # Adiciona o conteúdo do chunk ao contexto para o LLM.
            sources.append({
                'filename': filename,
                'score': score,
                'conteudo': content[:200] + "..." if len(content) > 200 else content # Trecho do conteúdo para exibição como fonte.
            })
        
        # Concatena todos os conteúdos dos chunks relevantes para formar o contexto completo para o LLM.
        context = "\n\n".join(context_parts) 

        # Etapa 3: Construção do prompt.
        # O prompt é formatado para instruir o LLM a atuar como um assistente especializado e
        # a basear sua resposta no contexto fornecido.
        prompt = f"""Você é um assistente especializado em documentos da UFMA (Universidade Federal do Maranhão).

Pergunta: {question}

Contexto dos documentos da UFMA:
{context}

Responda de forma clara e precisa baseando-se apenas nas informações fornecidas dos documentos da UFMA:""" # <<< ESTA LINHA FECHA A STRING PROMPT
        
        # Etapa 4: Geração da resposta utilizando o modelo de linguagem da Groq.
        try: # Bloco 'try' interno para a chamada da API Groq
            response = client.chat.completions.create(
                model="llama3-8b-8192", # Especifica o modelo LLM a ser utilizado.
                messages=[{"role": "user", "content": prompt}], # O prompt é passado como uma mensagem do usuário.
                max_tokens=1000, # Define o limite máximo de tokens para a resposta do LLM.
                temperature=0.3 # Controla a criatividade da resposta (valores menores = mais diretos/factuais).
            )
            
            answer = response.choices[0].message.content # Extrai o texto da resposta do LLM.
            
        except Exception as e: # Bloco 'except' interno
            logger.error(f"Erro ao processar a requisição com o modelo Groq: {e}", exc_info=True)
            answer = f"Ocorreu um erro ao processar a resposta do modelo de linguagem: {str(e)}"
        
        # Etapa 5: Salvar no histórico do usuário
        try:
            # Importa a função para salvar histórico (evita importação circular)
            from routes.history import add_chat_entry
            
            user_email = current_user["email"]
            add_chat_entry(
                user_email=user_email,
                question=question,
                answer=answer,
                sources=sources
            )
            logger.info(f"Conversa salva no histórico para usuário {user_email}")
        except Exception as history_error:
            # Não falha a resposta se houver erro ao salvar histórico
            logger.warning(f"Erro ao salvar no histórico: {history_error}")

        return {
            'answer': answer,
            'sources': sources,
            'context': context[:500] + "..." if len(context) > 500 else context # Trecho do contexto completo para visualização.
        }
        
    except Exception as e: # ESTE É O BLOCO EXCEPT QUE FINALIZA O TRY PRINCIPAL
        logger.error(f"Erro interno ao processar a mensagem do chat: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")
