# Sistema de Consultas de Documentos - Backend

Este é o backend do Sistema de Consultas, desenvolvido em FastAPI com Python, que oferece uma API robusta para consultas inteligentes de documentos universitários usando tecnologias de RAG (Retrieval-Augmented Generation).

## 📋 Pré-requisitos

- Python 3.11+ instalado
- pip
- Conta no Pinecone (banco de dados vetorial)
- Chave da API Groq (modelo de linguagem)
- Conta Google Cloud (para OAuth - opcional)

## 🚀 Configuração e Execução

### 1. Configuração do Ambiente

```bash
# Navegue até a pasta do backend
cd BackEnd

# Crie um ambiente virtual
python -m venv venv

# Ative o ambiente virtual
# No Windows:
venv\Scripts\activate
# No Linux/Mac:
source venv/bin/activate

# Instale as dependências
pip install -r requirements.txt
```

### 2. Configuração das Variáveis de Ambiente

Copie o arquivo `.env` e configure suas credenciais:

```bash
# Crie/edite o arquivo .env
touch .env
```

**Variáveis obrigatórias no .env:**

```env
# Groq API (OBRIGATÓRIO)
GROQ_API_KEY=sua_chave_groq_aqui

# Pinecone (OBRIGATÓRIO para RAG)
PINECONE_API_KEY=sua_chave_pinecone_aqui
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=ufma-documents
PINECONE_HOST=https://seu-indice.pinecone.io
EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-mpnet-base-v2
EMBEDDING_DIMENSIONS=768

# Configurações do servidor
PORT=8000
HOST=0.0.0.0
ENVIRONMENT=development

# Autenticação JWT
SECRET_KEY=sua_chave_secreta_muito_forte_aqui
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Google OAuth (OPCIONAL)
GOOGLE_CLIENT_ID=seu_client_id_google
GOOGLE_CLIENT_SECRET=seu_client_secret_google

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://seu-frontend.com
```

### 3. Executar a Aplicação

#### Modo Desenvolvimento
```bash
# Inicia o servidor FastAPI
python main.py

# Ou usando uvicorn diretamente
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### Modo Produção
```bash
# Com Gunicorn (recomendado para produção)
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

A API será disponibilizada em: **http://localhost:8000**

### 4. Verificar se está funcionando

- **Health Check:** http://localhost:8000
- **Documentação Swagger:** http://localhost:8000/docs
- **Documentação ReDoc:** http://localhost:8000/redoc

## 📁 Estrutura do Projeto

```
BackEnd/
├── routes/
│   ├── admin.py               # Endpoints administrativos
│   ├── chat.py                # Sistema de chat RAG
│   ├── history.py             # Histórico de conversas
│   ├── login.py               # Autenticação e usuários
│   ├── document_processor.py  # Processamento de PDFs
│   ├── utils.py               # Utilitários RAG
│   └── __init__.py            # Inicialização do módulo
├── uploads/                   # Diretório de documentos
├── main.py                    # Aplicação principal FastAPI
├── requirements.txt           # Dependências Python
├── runtime.txt                # Versão do Python
├── .env                       # Variáveis de ambiente (não commitado)
└── README.md                  # Este arquivo
```

## 🎯 Principais Funcionalidades

### **Endpoints Disponíveis:**

#### **1. Autenticação (`/api/login`)**
- `POST /api/login/` - Login tradicional
- `POST /api/login/register` - Cadastro de usuários
- `POST /api/login/google` - Login com Google OAuth
- `GET /api/login/me` - Informações do usuário logado
- `GET /api/login/users` - Listar usuários (admin)

#### **2. Chat Inteligente (`/api/chat`)**
- `POST /api/chat` - Enviar pergunta e receber resposta RAG
  - Integração com Groq (LLaMA 3.1)
  - Busca vetorial no Pinecone
  - Geração de embeddings com Sentence Transformers
  - Salvamento automático no histórico

#### **3. Histórico (`/api/history`)**
- `GET /api/history` - Buscar histórico do usuário
- `POST /api/history/save` - Salvar conversa manualmente
- `DELETE /api/history/clear` - Limpar todo histórico
- `DELETE /api/history/{entry_id}` - Remover conversa específica
- `GET /api/history/stats` - Estatísticas do histórico

#### **4. Administração (`/api/admin`)**
- `GET /api/admin/documents` - Listar documentos
- `POST /api/admin/upload` - Upload e processamento automático de PDFs
- `GET /api/admin/download/{file_id}` - Download de documentos
- `DELETE /api/admin/document/{file_id}` - Remover documentos

## 🤖 Sistema RAG (Retrieval-Augmented Generation)

### **Pipeline de Processamento:**

1. **Upload de PDF** → Extração de texto (PyPDF)
2. **Chunking Inteligente** → LangChain RecursiveCharacterTextSplitter
3. **Geração de Embeddings** → Sentence Transformers multilingual
4. **Indexação Vetorial** → Armazenamento no Pinecone
5. **Busca Semântica** → Recuperação de chunks relevantes
6. **Geração de Resposta** → LLM Groq com contexto

### **Configurações Otimizadas:**
```python
chunk_size = 2500        # Chunks maiores para mais contexto
chunk_overlap = 600      # Sobreposição para continuidade
top_k = 15              # Busca 15 chunks mais relevantes
temperature = 0.05       # Baixa para máxima precisão
```

## 🎯 Usuários de Teste

O sistema vem com usuários pré-configurados:

### **Administrador:**
- **Email:** `admin@ufma.br`
- **Senha:** `admin123`
- **Acesso:** Todas as funcionalidades + painel admin

### **Usuário Comum:**
- **Email:** `usuario@ufma.br`
- **Senha:** `user123`
- **Acesso:** Chat e histórico

## 🛠️ Dependências Principais

```txt
# API Framework
fastapi>=0.104.0          # Framework web moderno
uvicorn==0.34.3           # Servidor ASGI
gunicorn==21.2.0          # Servidor de produção

# LLM e IA
groq>=0.8.0               # Cliente Groq
sentence-transformers==2.7.0  # Embeddings

# RAG e Vetores
pinecone-client==3.2.1    # Banco vetorial
langchain-text-splitters>=0.2.0  # Chunking inteligente

# Processamento de Documentos
pypdf==4.0.1              # Extração de texto PDF

# Autenticação
passlib[bcrypt]>=1.7.4    # Hash de senhas
python-jose[cryptography]==3.3.0  # JWT
google-auth==2.23.4       # Google OAuth

# Utilitários
python-dotenv==1.0.0      # Variáveis de ambiente
email-validator>=2.0.0    # Validação de email
requests==2.31.0          # Cliente HTTP
```

## 🐛 Solução de Problemas

### **Erro: "Pinecone not initialized"**
```bash
# Verifique suas credenciais Pinecone
echo $PINECONE_API_KEY

# Teste a conexão
python -c "from pinecone import Pinecone; pc = Pinecone(api_key='sua_chave'); print(pc.list_indexes())"
```

### **Erro: "Groq API error"**
```bash
# Verifique sua chave Groq
echo $GROQ_API_KEY

# Teste a API
curl -H "Authorization: Bearer $GROQ_API_KEY" https://api.groq.com/openai/v1/models
```

### **Erro: "Module not found"**
```bash
# Reinstale dependências
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

### **Erro: "Permission denied" no upload**
```bash
# Verifique permissões da pasta uploads
mkdir -p uploads
chmod 755 uploads
```

## 🔒 Segurança e Autenticação

### **JWT Tokens:**
- Tokens assinados com HS256
- Expiração configurável (padrão: 30 minutos)
- Refresh automático no frontend

### **Validações:**
- Sanitização de entrada de dados
- Validação de tipos com Pydantic
- Rate limiting implícito via FastAPI

### **CORS:**
- Configuração flexível de origens permitidas
- Suporte a credenciais para cookies

## 📊 Monitoramento e Logs

### **Logs Estruturados:**
```python
# Configuração de logging em main.py
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

### **Métricas Disponíveis:**
- Tempo de processamento de documentos
- Qualidade dos embeddings
- Performance das consultas
- Estatísticas de uso por usuário

## 🚀 Deploy em Produção

### **Variáveis de Ambiente Adicionais:**
```env
ENVIRONMENT=production
ALLOWED_ORIGINS=https://seu-dominio.com
DATABASE_URL=postgresql://...  # Para banco real
REDIS_URL=redis://...          # Para cache
```

### **Recomendações:**
- Use PostgreSQL ao invés do armazenamento em memória
- Configure Redis para cache de embeddings
- Implemente rate limiting
- Configure SSL/TLS
- Use Docker para containerização

## 📈 Performance

### **Otimizações Implementadas:**
- Processamento em lotes de embeddings
- Cache de modelos em memória
- Chunking inteligente com LangChain
- Conexão persistente com Pinecone
- Compressão de respostas

### **Benchmarks Típicos:**
- Upload + processamento PDF: ~30s para 100 páginas
- Consulta RAG: ~2-3s para resposta completa
- Geração de embedding: ~100ms para texto médio

## 📞 Suporte e Contribuição

### **Logs Importantes:**
```bash
# Ver logs em tempo real
tail -f app.log

# Verificar status dos serviços
curl http://localhost:8000
curl http://localhost:8000/docs
```

### **Desenvolvimento:**
```bash
# Executar testes
python -m pytest

# Verificar código
black . --check
flake8 .
```

**Desenvolvido para UFMA - Sistema de Consultas Inteligentes**

---

## 📄 Licença

Este projeto está licenciado sob a licença MIT.