# Sistema de Consultas de Documentos - Frontend

Este é o frontend do Sistema de Consultas, desenvolvido em React, que oferece uma interface moderna e intuitiva para consultas inteligentes de documentos universitários.

## 📋 Pré-requisitos

- Node.js 16+ instalado
- npm
- Backend da aplicação rodando (porta 8000)

## 🚀 Configuração e Execução

### 1. Instalação das Dependências

```bash
# Navegue até a pasta do frontend
cd FrontEnd

# Instale as dependências
npm install
```

### 2. Executar a Aplicação

#### Modo Desenvolvimento
```bash
# Inicia o servidor de desenvolvimento
npm start

```

A aplicação será aberta automaticamente em: **http://localhost:3000**

### 3. Verificar se está funcionando

- Acesse: http://localhost:3000
- Você deve ver a tela de login do sistema
- Teste o login com as credenciais padrão ou Google OAuth

## 📁 Estrutura do Projeto

```
FrontEnd/
├── public/
│   ├── index.html          # HTML principal
│   └── manifest.json       # Configurações PWA
├── src/
│   ├── components/         # Componentes React
│   │   ├── LoginView/      # Tela de login
│   │   ├── ChatView/       # Interface principal de chat
│   │   ├── HistoryView/    # Histórico de conversas
│   │   ├── AdminView/      # Painel administrativo
│   │   └── GoogleLoginButton/ # Botão de login Google
│   ├── App.js             # Componente principal
│   ├── App.css            # Estilos globais
│   ├── index.js           # Ponto de entrada
│   └── index.css          # Estilos base
├── package.json           # Dependências e scripts
├── .env                   # Variáveis de ambiente (não commitado)
└── README.md             # Este arquivo
```

## 🎨 Principais Funcionalidades

### **Telas Disponíveis:**

1. **LoginView** - Autenticação
   - Login tradicional (email/senha)
   - Login com Google OAuth
   - Cadastro de novos usuários
   - Usuários de teste pré-configurados

2. **ChatView** - Interface Principal
   - Chat inteligente com IA
   - Sugestões de perguntas
   - Exibição de fontes consultadas
   - Sistema de feedback (👍/👎)
   - Histórico de conversa na sessão

3. **HistoryView** - Histórico
   - Visualização de conversas anteriores
   - Busca e expansão de respostas
   - Função de cópia de texto

4. **AdminView** - Painel Administrativo
   - Upload de documentos PDF
   - Gerenciamento de documentos
   - Download de arquivos
   - Controle de acesso restrito

## 🎯 Usuários de Teste

O sistema vem com usuário pré-configurado para teste:

### **Administrador:**
- **Email:** `admin@ufma.br`
- **Senha:** `admin123`
- **Acesso:** Todas as funcionalidades + painel admin

## 🛠️ Dependências Principais

```json
{
  "axios": "^1.10.0",           // Cliente HTTP
  "lucide-react": "^0.515.0",   // Ícones
  "react": "^19.1.0",           // Framework principal
  "react-dom": "^19.1.0",       // DOM do React
  "react-scripts": "5.0.1"      // Scripts de build
}
```

## 🐛 Solução de Problemas

### **Erro: "Cannot connect to backend"**
```bash
# Verifique se o backend está rodando
curl http://localhost:8000

# Confirme a URL no .env
echo $REACT_APP_API_URL
```

### **Erro: "Module not found"**
```bash
# Limpe e reinstale dependências
rm -rf node_modules package-lock.json
npm install
```

## 📱 Responsividade

A aplicação foi desenvolvida com design responsivo:
- **Desktop:** Experiência completa
- **Tablet:** Layout adaptado
- **Mobile:** Interface otimizada para toque

## 🔒 Autenticação e Segurança

### **Tokens JWT:**
- Tokens são armazenados no `localStorage`
- Expiração automática configurável
- Logout automático em caso de token inválido

### **Rotas Protegidas:**
- Redirecionamento automático para login
- Verificação de permissões de admin
- Estados de loading durante autenticação

## 📞 Suporte
No Readme principal

**Desenvolvido para UFMA - Sistema de Consultas Inteligentes**

Licença:

Este projeto está licenciado sob a licença MIT.
