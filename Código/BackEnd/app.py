# app.py - Backend RAG adaptado do código
import os
from langchain_text_splitters import CharacterTextSplitter
from langchain_chroma import Chroma
from langchain_community.embeddings import GPT4AllEmbeddings
from groq import Groq
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import tempfile
import shutil
from flask_cors import CORS
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Configurar uploads
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'docx', 'doc'}

# Criar pasta de uploads
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB máximo

# Configurar CORS para produção
CORS(app, origins=[
    "https://consulta-delta-nine.vercel.app",  # Seu site
    "http://localhost:3000",  # Para desenvolvimento
    "http://localhost:3001"   # Para testes
])

# Inicializar cliente Groq
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def allowed_file(filename):
    """Verifica se o arquivo é permitido"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def open_file(file_path):
    """Função para abrir arquivos de texto"""
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            contents = file.read()
        return contents
    except FileNotFoundError:
        logger.error(f"Arquivo não encontrado: {file_path}")
        return "File not found."
    except Exception as e:
        logger.error(f"Erro ao abrir arquivo: {e}")
        return f"Error: {e}"

def process_uploaded_file(file_path, filename):
    """Processa arquivo carregado e adiciona ao vectorstore"""
    try:
        global vectorstore
        
        # Ler conteúdo baseado no tipo de arquivo
        if filename.lower().endswith('.txt'):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        else:
            # Para PDFs e DOCs, você pode adicionar processamento específico depois
            logger.warning(f"Tipo de arquivo {filename} ainda não suportado completamente")
            return False
        
        if not content.strip():
            logger.warning(f"Arquivo {filename} está vazio")
            return False
        
        # Dividir texto
        text_splitter = CharacterTextSplitter(
            separator="\n\n",
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            is_separator_regex=False,
        )
        
        # Criar documentos
        metadatas = [{"nome do arquivo": filename}]
        splits = text_splitter.create_documents([content], metadatas=metadatas)
        
        # Adicionar ao vectorstore existente
        if vectorstore and splits:
            vectorstore.add_documents(splits)
            logger.info(f"Adicionados {len(splits)} chunks do arquivo {filename}")
            return True
        else:
            logger.error("Vectorstore não inicializado ou sem documentos para adicionar")
            return False
            
    except Exception as e:
        logger.error(f"Erro ao processar arquivo {filename}: {e}")
        return False

def initialize_vectorstore():
    """Inicializa o vectorstore - cria vazio se não existir"""
    try:
        logger.info("Inicializando vectorstore...")
        
        # Verificar se existe database Chroma já criado
        if os.path.exists("chroma"):
            logger.info("Carregando BD existente")
            vectorstore = Chroma(
                embedding_function=GPT4AllEmbeddings(), 
                persist_directory="chroma"
            )
            return vectorstore
        else:
            logger.info("Criando vectorstore vazio - documentos serão adicionados via upload")
            
            # Criar vectorstore vazio
            vectorstore = Chroma(
                embedding_function=GPT4AllEmbeddings(),
                persist_directory="chroma"
            )
            logger.info("Vectorstore vazio criado - pronto para receber documentos")
            return vectorstore
                
    except Exception as e:
        logger.error(f"Erro ao inicializar vectorstore: {e}")
        return None

# Inicializar vectorstore global
logger.info("Inicializando sistema...")
vectorstore = initialize_vectorstore()

def enviar_pergunta(pergunta):
    """Envia pergunta para o modelo Groq"""
    try:
        resposta = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{"role": "user", "content": pergunta}],
            max_tokens=1000,
            temperature=0.3
        )
        return resposta.choices[0].message.content
    except Exception as e:
        logger.error(f"Erro ao enviar pergunta para Groq: {e}")
        return f"Erro ao processar pergunta: {e}"

@app.route('/', methods=['GET'])
def home():
    """Rota principal para verificar se a API está funcionando"""
    return jsonify({
        'status': 'OK',
        'message': 'UFMA RAG API está funcionando!',
        'vectorstore_ready': vectorstore is not None,
        'version': '1.0.0'
    })

@app.route('/chat', methods=['POST'])
def chat():
    """Endpoint principal para chat - compatível com seu frontend"""
    try:
        # Verificar se vectorstore tem documentos
        if not vectorstore:
            return jsonify({
                'error': 'Sistema RAG não inicializado.'
            }), 503
        
        # Verificar se há documentos no vectorstore
        try:
            # Teste rápido para ver se há documentos
            test_results = vectorstore.similarity_search("test", k=1)
            if not test_results:
                return jsonify({
                    'answer': 'Ainda não há documentos carregados no sistema. Por favor, faça upload de documentos da UFMA para começar a fazer perguntas.',
                    'sources': [],
                    'context': ''
                })
        except Exception:
            return jsonify({
                'answer': 'Ainda não há documentos carregados no sistema. Por favor, faça upload de documentos da UFMA para começar a fazer perguntas.',
                'sources': [],
                'context': ''
            })
        
        # Obter dados da requisição
        data = request.json
        question = data.get('question')
        
        if not question:
            return jsonify({'error': 'Pergunta não fornecida'}), 400
        
        logger.info(f"Pergunta recebida: {question}")
        
        # Buscar documentos similares
        docs = vectorstore.similarity_search_with_score(question, k=4)
        
        # Preparar contexto
        context = "\n\n".join([doc[0].page_content for doc in docs])
        
        # Criar prompt melhorado para UFMA
        prompt = f"""Você é um assistente especializado em regulamentos e documentos da UFMA (Universidade Federal do Maranhão).

Pergunta: {question}

Use as informações a seguir dos documentos da UFMA como referência para responder de forma precisa e detalhada:

{context}

Resposta baseada nos documentos da UFMA:"""
        
        # Enviar para Groq
        resposta = enviar_pergunta(prompt)
        
        # Preparar sources no formato esperado pelo frontend
        sources = []
        for doc_score in docs:
            doc = doc_score[0]
            sources.append({
                'nome do arquivo': doc.metadata.get('nome do arquivo', 'Documento'),
                'score': doc_score[1] if len(doc_score) > 1 else 1.0,
                'conteudo': doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content
            })
        
        logger.info(f"Resposta gerada com {len(sources)} fontes")
        
        return jsonify({
            'answer': resposta,
            'sources': sources,
            'context': context[:500] + "..." if len(context) > 500 else context
        })
        
    except Exception as e:
        logger.error(f"Erro no endpoint chat: {e}")
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@app.route('/upload', methods=['POST'])
def upload_document():
    """Upload de documentos para o RAG"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Nenhum arquivo enviado'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Tipo de arquivo não permitido. Use: txt, pdf, docx, doc'}), 400
        
        # Salvar arquivo com nome seguro
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Processar arquivo e adicionar ao vectorstore
        success = process_uploaded_file(file_path, filename)
        
        if success:
            file_size = os.path.getsize(file_path)
            return jsonify({
                'message': f'Documento {filename} carregado e processado com sucesso!',
                'filename': filename,
                'size': file_size
            })
        else:
            # Remover arquivo se processamento falhou
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({'error': 'Erro ao processar o documento'}), 500
        
    except Exception as e:
        logger.error(f"Erro no upload: {e}")
        return jsonify({'error': f'Erro no upload: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check para monitoramento"""
    return jsonify({
        'status': 'OK', 
        'message': 'API funcionando',
        'vectorstore_status': 'ready' if vectorstore else 'not_ready',
        'groq_key_configured': bool(os.getenv("GROQ_API_KEY"))
    })

@app.route('/documents', methods=['GET'])
def list_documents():
    """Lista documentos carregados"""
    try:
        available_docs = []
        
        # Listar arquivos na pasta uploads
        if os.path.exists(UPLOAD_FOLDER):
            for filename in os.listdir(UPLOAD_FOLDER):
                if allowed_file(filename):
                    file_path = os.path.join(UPLOAD_FOLDER, filename)
                    size = os.path.getsize(file_path)
                    available_docs.append({
                        'filename': filename,
                        'size': size,
                        'status': 'processed'
                    })
        
        return jsonify({
            'documents': available_docs,
            'total': len(available_docs)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/documents/<filename>', methods=['DELETE'])
def delete_document(filename):
    """Remove um documento"""
    try:
        secure_name = secure_filename(filename)
        file_path = os.path.join(UPLOAD_FOLDER, secure_name)
        
        if not os.path.exists(file_path):
            return jsonify({'error': 'Documento não encontrado'}), 404
        
        # Remover arquivo
        os.remove(file_path)
        
        # Recriar vectorstore sem esse documento
        # (Implementação simples - recreia tudo)
        global vectorstore
        if os.path.exists("chroma"):
            shutil.rmtree("chroma")
        
        vectorstore = Chroma(
            embedding_function=GPT4AllEmbeddings(),
            persist_directory="chroma"
        )
        
        # Reprocessar arquivos restantes
        for remaining_file in os.listdir(UPLOAD_FOLDER):
            if allowed_file(remaining_file) and remaining_file != secure_name:
                remaining_path = os.path.join(UPLOAD_FOLDER, remaining_file)
                process_uploaded_file(remaining_path, remaining_file)
        
        return jsonify({'message': f'Documento {filename} removido com sucesso'})
        
    except Exception as e:
        logger.error(f"Erro ao remover documento: {e}")
        return jsonify({'error': f'Erro ao remover documento: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(debug=False, port=port, host='0.0.0.0')