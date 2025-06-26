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
              as fontes dos documentos utilizados (`sources`), um trecho do contexto completo (`context`),
              e informações de debug (`debug_info`).

    Raises:
        HTTPException: Erros HTTP são levantados para cenários como perguntas ausentes,
                       ou falhas na inicialização/acesso a serviços externos (Pinecone, Groq).
    """
    try:
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

        # Realiza a consulta de similaridade no Pinecone com busca muito expandida para máxima cobertura.
        # top_k define o número de resultados mais semelhantes a serem retornados.
        # include_metadata=True é fundamental para recuperar o conteúdo textual original dos chunks e seus metadados.
        query_results = pinecone_index_instance.query(
            vector=question_embedding,
            top_k=15, # Configurado para buscar os 15 chunks mais relevantes para máxima cobertura.
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
            
            # Verifica se o conteúdo não está vazio antes de adicionar
            if content.strip():
                # Adiciona identificação do documento para melhor contexto
                context_parts.append(f"[DOCUMENTO: {filename}]\n{content}")
                sources.append({
                    'filename': filename,
                    'score': score,
                    'conteudo': content[:200] + "..." if len(content) > 200 else content # Trecho do conteúdo para exibição como fonte.
                })

        # Sistema de fallback: se temos poucos resultados, busca mais agressivamente
        if len(context_parts) < 5:
            logger.info("Poucos chunks encontrados, executando busca expandida")
            
            expanded_query = pinecone_index_instance.query(
                vector=question_embedding,
                top_k=25,  # Busca muito mais ampla
                include_metadata=True 
            )
            
            # Adiciona resultados adicionais sem threshold muito restritivo
            for match in expanded_query.matches[len(context_parts):]:
                content = match.metadata.get('content', '')
                filename = match.metadata.get('filename', 'Documento')
                score = match.score
                
                if content.strip() and len(context_parts) < 12:  # Limita a 12 chunks totais
                    context_parts.append(f"[FONTE: {filename} - Score: {score:.2f}]\n{content}")
                    sources.append({
                        'filename': filename,
                        'score': score,
                        'conteudo': content[:150] + "..."
                    })
        
        # Concatena todos os conteúdos dos chunks relevantes para formar o contexto completo para o LLM.
        context = "\n\n".join(context_parts) 

        # Log detalhado para monitoramento e debug da qualidade da busca
        logger.info(f"Pergunta recebida: {question}")
        logger.info(f"Chunks encontrados: {len(context_parts)}")
        logger.info(f"Tamanho do contexto gerado: {len(context)} caracteres")
        if query_results.matches:
            scores = [f'{m.score:.3f}' for m in query_results.matches[:3]]
            logger.info(f"Principais scores de similaridade: {scores}")

        # Etapa 3: Construção do prompt muito flexível e otimizado.
        # O prompt é formatado para instruir o LLM a ser maximamente útil
        # priorizando qualquer informação que possa ajudar o usuário.
        prompt = f"""Você é um assistente especializado em documentos da UFMA (Universidade Federal do Maranhão).

Pergunta do usuário: {question}

Contexto dos documentos:
{context}

Instruções:
- Use QUALQUER informação relevante do contexto, mesmo que seja parcial
- Se não há resposta exata, forneça informações relacionadas que possam ajudar
- Seja proativo em explicar conceitos relacionados encontrados nos documentos
- Se encontrar procedimentos similares ou regras gerais, mencione-os
- Sempre tente ser útil, mesmo com informações incompletas
- Cite especificamente quais documentos você está consultando

Resposta detalhada:"""
        
        # Etapa 4: Geração da resposta utilizando o modelo de linguagem da Groq.
        try:
            response = client.chat.completions.create(
                model="llama3-8b-8192", # Especifica o modelo LLM a ser utilizado.
                messages=[{"role": "user", "content": prompt}], # O prompt é passado como uma mensagem do usuário.
                max_tokens=2000, # Define o limite máximo de tokens para respostas mais completas.
                temperature=0.05, # Temperatura muito baixa para máxima precisão e consistência.
                top_p=0.95 # Controle adicional da diversidade de resposta
            )
            
            answer = response.choices[0].message.content # Extrai o texto da resposta do LLM.
            logger.info(f"Resposta gerada: {answer[:100]}...")
            
        except Exception as e:
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
            'context': context[:800] + "..." if len(context) > 800 else context, # Trecho maior do contexto para visualização.
            'debug_info': {  # Informações de debug para monitoramento da qualidade
                'chunks_found': len(context_parts),
                'context_length': len(context),
                'similarity_scores': [f"{s['score']:.3f}" for s in sources[:5]],
                'total_results': len(query_results.matches)
            }
        }
        
    except Exception as e:
        logger.error(f"Erro interno ao processar a mensagem do chat: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")