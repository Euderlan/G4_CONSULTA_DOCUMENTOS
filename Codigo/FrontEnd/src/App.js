import React, { useState, useCallback, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import LoginView from './components/LoginView/LoginView';
import ChatView from './components/ChatView/ChatView';
import HistoryView from './components/HistoryView/HistoryView';
import AdminView from './components/AdminView/AdminView';
import './App.css'; // Certifique-se de que seu CSS está presente

const UFMAConsultaSystem = () => {
  // Estado para armazenar informações do usuário logado
  const [user, setUser] = useState(null); // Objeto { email: 'user@example.com', isAdmin: true }
  // Estado para controlar a visão atual da aplicação
  const [currentView, setCurrentView] = useState('login'); // 'login', 'chat', 'history', 'admin'
  // Estado para armazenar as mensagens do chat
  const [chatMessages, setChatMessages] = useState([]);
  // Estado para o conteúdo da mensagem atual sendo digitada
  const [currentMessage, setCurrentMessage] = useState('');
  // Estado para indicar se uma operação de carregamento está em andamento
  const [isLoading, setIsLoading] = useState(false);
  // Estado para armazenar o histórico de conversas do usuário
  const [userHistory, setUserHistory] = useState([]);
  // Versão do documento principal (estática para este exemplo)
  const [documentVersion] = useState('RESOLUÇÃO Nº 1892-CONSEPE - v1.0 (28/06/2019)');
  // Estado para armazenar sugestões dinâmicas (não implementado neste App.js, mas mantido para extensibilidade)
  const [suggestions, setSuggestions] = useState([]);

  // Configuração da URL base da API do Render.com ou localhost
  // Certifique-se de que REACT_APP_API_URL esteja definida no .env do frontend
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000'; // Default para localhost em desenvolvimento

  // Email do administrador responsável (para verificação de UI, a autenticação real é no backend)
  const ADMIN_EMAIL = 'admin.consepe@ufma.br';

  // Sugestões rápidas interativas para o chat
  const quickSuggestions = [
    "Quais são os requisitos para transferência de curso?",
    "Como funciona o sistema de avaliação?",
    "Qual a carga horária mínima para colação de grau?",
    "Quais as regras para aproveitamento de estudos?",
    "Como solicitar trancamento de matrícula?",
  ];

  // --- Funções do Histórico ---
  // MOVIDO PARA CIMA PARA GARANTIR INICIALIZAÇÃO ANTES DO useEffect
  // Buscar o histórico de conversas do usuário
  const fetchUserHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      // Endpoint FastAPI para o histórico
      const response = await fetch(`${API_BASE_URL}/api/history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${user.token}` // Se for usar token de autenticação
        },
      });
      const data = await response.json();
      if (response.ok) {
        // Mapear timestamps do histórico se eles vierem como strings do backend
        const historyWithDates = data.history.map(item => ({
          ...item,
          timestamp: item.timestamp ? new Date(item.timestamp) : new Date() // Converte ou cria nova data
        }));
        setUserHistory(historyWithDates || []); // Atualiza o estado do histórico
      } else {
        console.error('Erro ao buscar histórico:', data.message || 'Erro desconhecido');
        setUserHistory([]); // Limpa o histórico em caso de erro
      }
    } catch (error) {
      console.error('Erro de rede ao buscar histórico:', error);
      setUserHistory([]); // Limpa o histórico em caso de erro de conexão
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL]); // Dependência da URL da API

  // Efeito para carregar o histórico do usuário quando a visão muda para 'history' e o usuário está logado
  useEffect(() => {
    if (user && currentView === 'history') {
      fetchUserHistory();
    }
  }, [user, currentView, fetchUserHistory]); // Adicionado fetchUserHistory às dependências para useCallback

  // --- Funções de Autenticação ---

  // Lidar com o login via Google (simulado)
  const handleGoogleLogin = useCallback(async () => {
    setIsLoading(true);
    try {
      // Endpoint FastAPI para login do Google (simulado no backend)
      const response = await fetch(`${API_BASE_URL}/api/login/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) {
        // Supondo que o backend retorne informações do usuário ou um token
        // Aqui, simulamos um usuário logado
        setUser({ email: 'google.user@example.com', isAdmin: false });
        setCurrentView('chat'); // Redireciona para o chat
      } else {
        console.error('Erro ao fazer login com Google:', data.detail || 'Erro desconhecido');
        // Exibe uma mensagem amigável para o usuário
        alert('Erro ao fazer login com Google. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro de rede ou servidor ao tentar login com Google:', error);
      alert('Erro de conexão ao tentar fazer login com Google. Verifique sua conexão.');
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL]); // Dependência da URL base da API

  // Lidar com o login tradicional (email/senha)
  const handleLogin = useCallback(async (email, password) => {
    setIsLoading(true);
    try {
      // Endpoint FastAPI para login tradicional
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        // OAuth2PasswordRequestForm no FastAPI espera application/x-www-form-urlencoded
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: email, password: password }).toString(),
      });
      const data = await response.json();
      if (response.ok) {
        // Simulação de verificação de admin baseado no email (lógica real deve vir do token/backend)
        const userIsAdmin = email === ADMIN_EMAIL;
        setUser({ email: email, isAdmin: userIsAdmin });
        setCurrentView('chat'); // Redireciona para o chat após o login
      } else {
        console.error('Erro no login:', data.detail || 'Credenciais inválidas');
        alert('Erro no login: ' + (data.detail || 'Usuário ou senha inválidos.'));
      }
    } catch (error) {
      console.error('Erro de rede ou servidor ao tentar login:', error);
      alert('Erro de conexão ao tentar fazer login. Verifique sua conexão.');
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, ADMIN_EMAIL]); // Dependências da URL base da API e email do admin

  // Lidar com o registro de novos usuários (simulado)
  const handleRegister = useCallback(async (email, password) => {
    setIsLoading(true);
    try {
      // Endpoint FastAPI para registro (se houver, senão, isto é apenas um mock)
      // Exemplo de como seria uma chamada real:
      // const response = await fetch(`${API_BASE_URL}/api/register`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, password }),
      // });
      // const data = await response.json();
      
      // Simulação de registro bem-sucedido
      if (email && password) {
        alert('Registro realizado com sucesso! Agora você pode fazer login.');
        // Após o registro, geralmente redireciona para a tela de login
        setCurrentView('login');
      } else {
        alert('Erro no registro. Por favor, preencha todos os campos.');
      }
    } catch (error) {
      console.error('Erro no registro:', error);
      alert('Erro de conexão ao tentar registrar. Verifique sua conexão.');
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL]); // Dependência da URL base da API

  // Lidar com o logout
  const handleLogout = useCallback(() => {
    setUser(null); // Limpa as informações do usuário
    setChatMessages([]); // Limpa as mensagens do chat
    setUserHistory([]); // Limpa o histórico do usuário
    setCurrentView('login'); // Retorna para a tela de login
  }, []);

  // --- Funções do Chat ---

  // Lidar com a mudança no campo de entrada de texto
  const handleInputChange = useCallback((e) => {
    setCurrentMessage(e.target.value);
  }, []);

  // Lidar com o envio de mensagens para o backend
  const handleSendMessage = useCallback(async () => {
    // Evita enviar mensagens vazias ou se já estiver carregando
    if (!currentMessage.trim() || isLoading) return;

    // Adicionando timestamp como um objeto Date
    const newUserMessage = { id: Date.now(), text: currentMessage, sender: 'user', timestamp: new Date() };
    setChatMessages((prev) => [...prev, newUserMessage]); // Adiciona a mensagem do usuário ao chat
    setCurrentMessage(''); // Limpa o campo de entrada
    setIsLoading(true); // Ativa o estado de carregamento

    try {
      // Endpoint FastAPI para o chat
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Se estiver usando token de autenticação, adicione-o aqui:
          // 'Authorization': `Bearer ${user.token}` 
        },
        body: JSON.stringify({ question: newUserMessage.text }), // Envia a pergunta no formato JSON
      });

      const data = await response.json(); // Analisa a resposta JSON

      if (response.ok) {
        // Se a resposta for bem-sucedida, adiciona a mensagem do AI e as fontes
        // Adicionando timestamp como um objeto Date
        const newAIMessage = {
          id: Date.now() + 1,
          text: data.answer,
          sender: 'ai',
          sources: data.sources || [],
          context: data.context || '',
          feedback: null, // Campo para feedback do usuário
          reported: false, // Campo para indicar se a mensagem foi reportada
          timestamp: new Date() // Adicionando timestamp aqui também
        };
        setChatMessages((prev) => [...prev, newAIMessage]);
      } else {
        // Em caso de erro na resposta da API
        const errorMessage = data.detail || 'Erro ao obter resposta do LLM.';
        setChatMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, text: `Erro: ${errorMessage}`, sender: 'ai', error: true, timestamp: new Date() },
        ]);
        console.error('Erro na resposta da API:', data);
      }
    } catch (error) {
      // Em caso de erro de rede ou servidor
      console.error('Erro de rede ao enviar mensagem:', error);
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, text: 'Erro de conexão. Tente novamente.', sender: 'ai', error: true, timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false); // Desativa o estado de carregamento
    }
  }, [currentMessage, isLoading, API_BASE_URL]); // Dependências do estado e URL da API

  // Lidar com a tecla 'Enter' para enviar mensagens no chat
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Previne a quebra de linha padrão
        handleSendMessage(); // Chama a função de envio de mensagem
      }
    },
    [handleSendMessage]
  ); // Dependência da função de envio de mensagem

  // Lidar com o feedback do usuário para uma mensagem específica
  const handleFeedback = useCallback((messageId, feedback) => {
    setChatMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, feedback } : msg))
    );
  }, []);

  // Copiar texto para a área de transferência
  const copyToClipboard = useCallback((text) => {
    // Uso de document.execCommand('copy') para maior compatibilidade em iframes
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      console.log('Conteúdo copiado para a área de transferência!');
    } catch (err) {
      console.error('Não foi possível copiar o conteúdo:', err);
      // Fallback para caso document.execCommand não funcione (ex: navegadores mais recentes fora de iframes)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          console.log('Conteúdo copiado via Clipboard API!');
        }).catch(e => {
          console.error('Falha ao copiar via Clipboard API:', e);
        });
      }
    }
    document.body.removeChild(textArea);
  }, []);

  // Reportar um erro em uma mensagem (marcar como reportada)
  const reportError = useCallback((messageId) => {
    setChatMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, reported: true } : msg))
    );
  }, []);

  // --- Funções Administrativas (Exemplo - detalhadas em AdminView) ---

  // Exemplo: Função para upload de documentos
  const handleUploadDocument = useCallback(async (file) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file); // 'file' deve corresponder ao nome do parâmetro no FastAPI (@router.post("/upload", file: UploadFile = File(...)))

    try {
      // Endpoint FastAPI para upload de documentos
      const response = await fetch(`${API_BASE_URL}/api/admin/upload`, {
        method: 'POST',
        body: formData, // FormData não precisa de 'Content-Type' manual
        // Se estiver usando token de autenticação, adicione aqui:
        // headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        // Opcional: Atualizar a lista de documentos após o upload bem-sucedido
      } else {
        console.error('Erro no upload:', data.detail || data.message || 'Erro desconhecido');
        alert('Erro no upload: ' + (data.detail || data.message || 'Erro desconhecido.'));
      }
    } catch (error) {
      console.error('Erro de rede no upload:', error);
      alert('Erro de conexão ao fazer upload. Verifique sua conexão.');
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL]);

  // Exemplo: Função para listar documentos (será chamada pelo AdminView)
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      // Endpoint FastAPI para listar documentos
      const response = await fetch(`${API_BASE_URL}/api/admin/documents`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) {
        return data.documents; // Retorna a lista de documentos
      } else {
        console.error('Erro ao listar documentos:', data.detail || 'Erro desconhecido');
        alert('Erro ao listar documentos: ' + (data.detail || 'Erro desconhecido.'));
        return [];
      }
    } catch (error) {
      console.error('Erro de rede ao listar documentos:', error);
      alert('Erro de conexão ao listar documentos. Verifique sua conexão.');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL]);


  // Props compartilhadas entre as views para evitar repetição
  const sharedProps = {
    user,
    setUser,
    currentView,
    setCurrentView,
    chatMessages,
    setChatMessages,
    currentMessage,
    setCurrentMessage,
    isLoading,
    setIsLoading,
    userHistory,
    setUserHistory,
    documentVersion,
    suggestions,
    setSuggestions,
    quickSuggestions,
    handleGoogleLogin,
    handleLogin,
    handleRegister,
    handleLogout,
    handleInputChange,
    handleSendMessage,
    handleKeyDown,
    handleFeedback,
    copyToClipboard,
    reportError,
    API_BASE_URL, // Passa a URL base da API para os componentes filhos
    ADMIN_EMAIL,  // Passa o email do admin para componentes filhos, se necessário para lógica de UI
    handleUploadDocument, // Nova prop para upload
    fetchDocuments,       // Nova prop para listar documentos
  };

  // Lógica principal de renderização baseada na visão atual
  // Se não houver usuário logado, mostra a tela de login
  if (!user) return <LoginView {...sharedProps} />;
  
  // Renderiza a view apropriada com base no currentView
  switch (currentView) {
    case 'chat':
      return <ChatView {...sharedProps} />;
    case 'history':
      return <HistoryView {...sharedProps} />;
    case 'admin':
      // Garante que apenas usuários administradores possam acessar a tela de admin
      if (user && user.isAdmin) {
        return <AdminView {...sharedProps} />;
      } else {
        // Se não for admin, redireciona para a tela de chat
        setCurrentView('chat');
        return <ChatView {...sharedProps} />;
      }
    default:
      // Caso padrão, retorna para a tela de login
      return <LoginView {...sharedProps} />;
  }
};

export default UFMAConsultaSystem;
