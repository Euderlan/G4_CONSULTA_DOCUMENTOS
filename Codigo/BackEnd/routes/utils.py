# routes/utils.py
# Módulo para encapsular funcionalidades centrais do Retrieval-Augmented Generation (RAG).
# Inclui a geração de embeddings, interação com o banco de dados vetorial Pinecone,
# e funcionalidades de busca simples para fallback.

import os
import logging
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer # Dependência para geração de embeddings
from pinecone import Pinecone, Index, PodSpec, ServerlessSpec # Dependência para interação com Pinecone

# Configuração do logger para monitoramento e depuração
logger = logging.getLogger(__name__)

# Carrega variáveis de ambiente do arquivo .env
load_dotenv()

# Armazenamento em memória para documentos processados
# EM PRODUÇÃO: Este deve ser substituído por um banco de dados persistente (ex: Firestore, PostgreSQL)
document_store = []

# --- Configuração do Modelo de Embeddings ---
# O modelo de embedding é inicializado uma única vez na carga do módulo para eficiência.
embedding_model = None # Inicializado como None para controle de estado
try:
    # Utiliza o modelo 'all-MiniLM-L6-v2', conhecido por seu bom balanço entre desempenho e tamanho.
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    logger.info("Modelo de embedding 'all-MiniLM-L6-v2' carregado com sucesso.")
except Exception as e:
    logger.error(f"Erro ao carregar o modelo de embedding SentenceTransformer: {e}", exc_info=True)
    # Falhas na carga do modelo impactam diretamente a funcionalidade de geração de embeddings.

def generate_embedding(text: str) -> list[float]:
    """
    Gera um vetor numérico (embedding) para o texto fornecido.
    Estes embeddings são cruciais para a busca de similaridade em bancos de dados vetoriais.

    Raises:
        RuntimeError: Se o modelo de embedding não foi inicializado corretamente.
    """
    if embedding_model is None:
        raise RuntimeError("Modelo de embedding não inicializado. Verifique os logs de inicialização e as configurações.")
    return embedding_model.encode(text).tolist()

# --- Configuração do Pinecone ---
pinecone_client = None
pinecone_index = None

try:
    # Inicializa o cliente Pinecone utilizando apenas a API key (versão atual)
    pinecone_client = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    logger.info("Cliente Pinecone inicializado.")

    index_name = os.getenv("PINECONE_INDEX_NAME")
    
    # Conecta-se diretamente ao índice existente
    try:
        pinecone_index = pinecone_client.Index(index_name)
        
        # Testa a conexão
        stats = pinecone_index.describe_index_stats()
        logger.info(f"Conectado ao índice Pinecone '{index_name}' com sucesso. Estatísticas: {stats}")
        
    except Exception as index_error:
        logger.warning(f"Não foi possível conectar ao índice existente '{index_name}': {index_error}")
        
        # Se não conseguir conectar, verifica se o índice existe
        try:
            available_indexes = pinecone_client.list_indexes()
            logger.info(f"Índices disponíveis: {available_indexes}")
            
            if index_name not in [idx.name for idx in available_indexes.indexes]:
                logger.info(f"Índice '{index_name}' não encontrado. Criando novo índice...")
                
                # Cria um novo índice com as dimensões corretas
                pinecone_client.create_index(
                    name=index_name,
                    dimension=384,  # Dimensão para all-MiniLM-L6-v2
                    metric='cosine',
                    spec=ServerlessSpec(
                        cloud='aws',
                        region='us-east-1'
                    )
                )
                logger.info(f"Índice '{index_name}' criado com sucesso.")
                
                # Aguarda criação
                import time
                time.sleep(10)
            
            # Tenta conectar novamente
            pinecone_index = pinecone_client.Index(index_name)
            logger.info(f"Conectado ao índice Pinecone '{index_name}' após verificação.")
            
        except Exception as create_error:
            logger.error(f"Erro ao verificar/criar índice: {create_error}")
            pinecone_index = None

except Exception as e:
    logger.error(f"Erro crítico ao inicializar o Pinecone: {e}. Funcionalidades RAG podem ser afetadas.", exc_info=True)
    pinecone_index = None # Garante que a variável permaneça None em caso de falha.

def get_pinecone_index() -> Index:
    """
    Fornece a instância do índice Pinecone para outros módulos.
    Isso centraliza o acesso ao índice, garantindo uma única fonte de verdade.

    Raises:
        RuntimeError: Se o índice Pinecone não foi inicializado corretamente.
    """
    if pinecone_index is None:
        raise RuntimeError("Pinecone index não inicializado. Verifique logs e variáveis de ambiente.")
    return pinecone_index

# --- Função de Divisão de Texto (Text Splitter Customizado) ---
def create_documents_from_text_manual(text: str, filename: str, chunk_size: int = 1000, overlap: int = 200) -> list[dict]:
    """
    Implementa um divisor de texto customizado para segmentar documentos longos em "chunks" menores.
    Inclui sobreposição entre chunks para preservar o contexto.
    Essa abordagem substitui a necessidade de bibliotecas de text splitting mais pesadas como Langchain.

    Args:
        text (str): O conteúdo textual completo do documento.
        filename (str): O nome do arquivo original, usado nos metadados dos chunks.
        chunk_size (int): O tamanho máximo desejado para cada chunk.
        overlap (int): O número de caracteres de sobreposição entre chunks consecutivos.

    Returns:
        list[dict]: Uma lista de dicionários, onde cada dicionário representa um chunk
                    e contém seu 'content' e 'metadata'.
    """
    chunks_data = []
    text_length = len(text)
    start = 0
    chunk_order = 0 # Mantém a ordem dos chunks para metadados

    while start < text_length:
        end = min(start + chunk_size, text_length)
        chunk_content = text[start:end]
        
        if not chunk_content.strip(): # Ignora chunks vazios ou contendo apenas espaços em branco
            # Ajusta o ponto de partida para o próximo chunk, evitando loops em texto residual vazio
            start = end - overlap if end - overlap >= 0 else 0
            if start >= text_length: 
                break 
            continue

        # Associa o conteúdo do chunk com metadados relevantes para indexação no Pinecone.
        chunks_data.append({
            "content": chunk_content,
            "metadata": {
                "filename": filename,
                "chunk_order": chunk_order,
                "start_char": start,
                "end_char": end,
                # Metadados adicionais, como número da página, podem ser incluídos se extraídos.
            }
        })
        
        chunk_order += 1 
        start = end - overlap 
        if start < 0: start = 0 

    return chunks_data

def simple_text_splitter(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """
    Implementação alternativa de divisor de texto para otimizar processamento de documentos grandes.
    Divide texto em chunks com sobreposição para manter contexto entre segmentos.
    Retorna apenas o conteúdo dos chunks (sem metadados).
    """
    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = min(start + chunk_size, text_length) # Garante que 'end' não exceda o tamanho do texto
        chunk = text[start:end]
        
        if chunk:
            chunks.append(chunk)
        
        # Ajusta o 'start' para o próximo chunk com sobreposição
        start = end - overlap
        if start < 0: # Evita start negativo no início
            start = 0
    
    return chunks

def simple_search(query: str, documents: list[dict], max_results: int = 3) -> list[dict]:
    """
    Sistema de busca por relevância baseado em contagem de palavras-chave.
    Implementa scoring simples mas eficaz para recuperação de informações.
    Funciona como fallback quando o Pinecone não está disponível.
    
    Args:
        query (str): A pergunta do usuário para a busca.
        documents (list[dict]): Lista de documentos (chunks) no formato {'content': '...', 'filename': '...'}.
        max_results (int): Número máximo de resultados a serem retornados.

    Returns:
        list[dict]: Lista de documentos relevantes ordenados por score.
    """
    query_words = query.lower().split()
    results = []
    
    for doc in documents:
        score = 0
        content_lower = doc['content'].lower()
        
        for word in query_words:
            score += content_lower.count(word)
        
        if score > 0:
            results.append({
                'content': doc['content'],
                'filename': doc['filename'],
                'score': score
            })
    
    # Ordenação por relevância para retornar os resultados mais pertinentes
    results.sort(key=lambda x: x['score'], reverse=True)
    return results[:max_results]