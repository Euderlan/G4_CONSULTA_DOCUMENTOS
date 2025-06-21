# app.py - RAG Simplificado sem LangChain
import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
from dotenv import load_dotenv
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)

# Configurar CORS
CORS(app, origins=[
    "https://consulta-delta-nine.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001"
])

# Cliente Groq
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Storage simples em memória para documentos
document_store = []

def simple_text_splitter(text, chunk_size=1000, overlap=200):
    """Divisor de texto simples"""
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
    """Busca simples por palavras-chave"""
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
    
    # Ordenar por score e retornar os melhores
    results.sort(key=lambda x: x['score'], reverse=True)
    return results[:max_results]

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'status': 'OK',
        'message': 'UFMA RAG API Simplificada funcionando!',
        'documents_loaded': len(document_store),
        'version': '2.0.0'
    })

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        question = data.get('question')
        
        if not question:
            return jsonify({'error': 'Pergunta não fornecida'}), 400
        
        logger.info(f"Pergunta recebida: {question}")
        
        # Se não há documentos carregados
        if not document_store:
            return jsonify({
                'answer': 'Ainda não há documentos carregados no sistema. Por favor, faça upload de documentos da UFMA para começar a fazer perguntas.',
                'sources': [],
                'context': ''
            })
        
        # Buscar documentos relevantes
        search_results = simple_search(question, document_store)
        
        if not search_results:
            return jsonify({
                'answer': 'Não encontrei informações relevantes nos documentos carregados para responder sua pergunta.',
                'sources': [],
                'context': ''
            })
        
        # Preparar contexto
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
        
        # Criar prompt para Groq
        prompt = f"""Você é um assistente especializado em documentos da UFMA (Universidade Federal do Maranhão).

Pergunta: {question}

Contexto dos documentos da UFMA:
{context}

Responda de forma clara e precisa baseando-se apenas nas informações fornecidas dos documentos da UFMA:"""
        
        # Enviar para Groq
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
    """Upload de documentos PDF"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Nenhum arquivo enviado'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
        
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Apenas arquivos PDF são aceitos'}), 400
        
        # Processar PDF
        try:
            from PyPDF2 import PdfReader
            import io
            
            # Ler PDF
            pdf_bytes = file.read()
            pdf_file = io.BytesIO(pdf_bytes)
            pdf_reader = PdfReader(pdf_file)
            
            # Extrair texto de todas as páginas
            full_text = ""
            for page in pdf_reader.pages:
                full_text += page.extract_text() + "\n"
            
            if not full_text.strip():
                return jsonify({'error': 'PDF não contém texto legível'}), 400
            
        except Exception as e:
            return jsonify({'error': f'Erro ao processar PDF: {str(e)}'}), 400
        
        # Dividir em chunks
        chunks = simple_text_splitter(full_text)
        
        # Adicionar ao store
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
    """Lista documentos carregados"""
    try:
        # Contar documentos únicos
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
    return jsonify({
        'status': 'OK',
        'message': 'API funcionando',
        'documents_loaded': len(document_store),
        'groq_configured': bool(os.getenv("GROQ_API_KEY"))
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(debug=False, port=port, host='0.0.0.0')