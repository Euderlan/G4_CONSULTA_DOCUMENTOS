# routes/utils.py

# Armazenamento em memória para documentos processados
# EM PRODUÇÃO: Este deve ser substituído por um banco de dados persistente (ex: Firestore, PostgreSQL)
document_store = []

def simple_text_splitter(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """
    Implementação de divisor de texto para otimizar processamento de documentos grandes.
    Divide texto em chunks com sobreposição para manter contexto entre segmentos.
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