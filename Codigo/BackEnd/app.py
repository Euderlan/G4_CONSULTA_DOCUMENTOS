# app.py - RAG Simplificado sem LangChain
import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
from dotenv import load_dotenv
import logging

# Configuração do sistema de logging para monitoramento da aplicação
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)

# Configuração de CORS para permitir requisições dos domínios autorizados
# Incluindo tanto a URL de produção quanto ambientes de desenvolvimento
CORS(app, origins=[
    "https://consulta-documento.vercel.app",  # URL de produção principal
    "https://consulta-delta-nine.vercel.app",  # URL alternativa para compatibilidade
    "http://localhost:3000",  # Ambiente de desenvolvimento React
    "http://localhost:3001"   # Ambiente de desenvolvimento alternativo
])

# Inicialização do cliente Groq para processamento de linguagem natural
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Armazenamento em memória para documentos processados
# Em produção, considera-se migrar para banco de dados persistente
document_store = []

def simple_text_splitter(text, chunk_size=1000, overlap=200):
    """
    Implementação de divisor de texto para otimizar processamento de documentos grandes
    Divide texto em chunks com sobreposição para manter contexto entre segmentos
    """
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        
        if chunk:
            chunks.append(chunk)
        
        start = end - overlap
        if start >= len(text):
            break
    
    return chunks

def simple_search(query, documents, max_results=3):
    """
    Sistema de busca por relevância baseado em contagem de palavras-chave
    Implementa scoring simples mas eficaz para recuperação de informações
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

@app.route('/', methods=['GET'])
def home():
    """Endpoint de status para verificação de saúde da API"""
    return jsonify({
        'status': 'OK',
        'message': 'UFMA RAG API Simplificada funcionando!',
        'documents_loaded': len(document_store),
        'version': '2.0.0'
    })

@app.route('/chat', methods=['POST'])
def chat():
    """
    Endpoint principal para processamento de perguntas dos usuários
    Implementa pipeline completo: busca de contexto → geração de resposta → formatação
    """
    try:
        data = request.json
        question = data.get('question')
        
        if not question:
            return jsonify({'error': 'Pergunta não fornecida'}), 400
        
        logger.info(f"Pergunta recebida: {question}")
        
        # Verificação de disponibilidade de documentos no sistema
        if not document_store:
            return jsonify({
                'answer': 'Ainda não há documentos carregados no sistema. Por favor, faça upload de documentos da UFMA para começar a fazer perguntas.',
                'sources': [],
                'context': ''
            })
        
        # Execução da busca por documentos relevantes à pergunta
        search_results = simple_search(question, document_store)
        
        if not search_results:
            return jsonify({
                'answer': 'Não encontrei informações relevantes nos documentos carregados para responder sua pergunta.',
                'sources': [],
                'context': ''
            })
        
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
                model="llama3-8b-8192",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1000,
                temperature=0.3
            )
            
            answer = response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Erro no Groq: {e}")
            answer = f"Erro ao processar resposta: {str(e)}"
        
        return jsonify({
            'answer': answer,
            'sources': sources,
            'context': context[:500] + "..." if len(context) > 500 else context
        })
        
    except Exception as e:
        logger.error(f"Erro no chat: {e}")
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@app.route('/upload', methods=['POST'])
def upload_document():
    """
    Sistema de upload e processamento de documentos PDF
    Implementa validação, extração de texto e segmentação automática
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Nenhum arquivo enviado'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
        
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Apenas arquivos PDF são aceitos'}), 400
        
        # Pipeline de processamento de documentos PDF
        try:
            from PyPDF2 import PdfReader
            import io
            
            # Leitura e parsing do arquivo PDF
            pdf_bytes = file.read()
            pdf_file = io.BytesIO(pdf_bytes)
            pdf_reader = PdfReader(pdf_file)
            
            # Extração de texto de todas as páginas do documento
            full_text = ""
            for page in pdf_reader.pages:
                full_text += page.extract_text() + "\n"
            
            if not full_text.strip():
                return jsonify({'error': 'PDF não contém texto legível'}), 400
            
        except Exception as e:
            return jsonify({'error': f'Erro ao processar PDF: {str(e)}'}), 400
        
        # Segmentação do texto em chunks para otimizar busca e processamento
        chunks = simple_text_splitter(full_text)
        
        # Armazenamento dos chunks processados no sistema
        for chunk in chunks:
            document_store.append({
                'content': chunk,
                'filename': file.filename
            })
        
        logger.info(f"PDF {file.filename} processado: {len(chunks)} chunks")
        
        return jsonify({
            'message': f'PDF {file.filename} carregado com sucesso!',
            'filename': file.filename,
            'chunks': len(chunks),
            'total_documents': len(document_store)
        })
        
    except Exception as e:
        logger.error(f"Erro no upload: {e}")
        return jsonify({'error': f'Erro no upload: {str(e)}'}), 500

@app.route('/documents', methods=['GET'])
def list_documents():
    """Endpoint para listagem e monitoramento de documentos carregados no sistema"""
    try:
        # Agregação de estatísticas dos documentos únicos
        filenames = set()
        for doc in document_store:
            filenames.add(doc['filename'])
        
        documents = []
        for filename in filenames:
            chunks = sum(1 for doc in document_store if doc['filename'] == filename)
            documents.append({
                'filename': filename,
                'chunks': chunks,
                'status': 'processed'
            })
        
        return jsonify({
            'documents': documents,
            'total': len(documents),
            'total_chunks': len(document_store)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Endpoint de monitoramento para verificação de status da aplicação"""
    return jsonify({
        'status': 'OK',
        'message': 'API funcionando',
        'documents_loaded': len(document_store),
        'groq_configured': bool(os.getenv("GROQ_API_KEY"))
    })

if __name__ == '__main__':
    # Configuração para deploy em ambiente de produção
    port = int(os.environ.get('PORT', 8000))
    app.run(debug=False, port=port, host='0.0.0.0')