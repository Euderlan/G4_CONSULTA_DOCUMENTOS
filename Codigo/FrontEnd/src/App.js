import React, { useState, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import LoginView from './components/LoginView/LoginView';
import ChatView from './components/ChatView/ChatView';
import HistoryView from './components/HistoryView/HistoryView';
import AdminView from './components/AdminView/AdminView';
import './App.css';

const UFMAConsultaSystem = () => {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userHistory, setUserHistory] = useState([]);
  const [documentVersion] = useState('RESOLUÇÃO Nº 1892-CONSEPE - v1.0 (28/06/2019)');
  const [suggestions, setSuggestions] = useState([]);

  // Configuração da URL da API do Render.com
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://ufma-rag-api.onrender.com';

  // Email do administrador responsável
  const ADMIN_EMAIL = 'admin.consepe@ufma.br';

  // Sugestões interativas
  const quickSuggestions = [
    "Quais são os requisitos para transferência de curso?",
    "Como funciona o sistema de avaliação?",
    "Qual a carga horária mínima dos cursos?",
    "Normas sobre estágio supervisionado",
    "Procedimentos para colação de grau"
  ];

  // Simulação de login via Google
  const handleGoogleLogin = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      const userData = {
        id: Date.now(),
        username: 'João Silva',
        email: 'joao.silva@discente.ufma.br',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=user${Date.now()}`,
        isAdmin: false,
        loginTime: new Date().toISOString(),
        loginMethod: 'google'
      };
      setUser(userData);
      setCurrentView('chat');
      setIsLoading(false);
    }, 2000);
  }, []);

  // Login tradicional
  const handleLogin = useCallback((username, password, isAdmin = false) => {
    setIsLoading(true);
    setTimeout(() => {
      const isAdminLogin = username.toLowerCase() === 'admin.consepe' || username.toLowerCase() === 'admin';
      const email = isAdminLogin ? ADMIN_EMAIL : `${username.toLowerCase().replace(' ', '.')}@discente.ufma.br`;
      
      const userData = {
        id: Date.now(),
        username: isAdminLogin ? 'Administrador CONSEPE' : username,
        email: email,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        isAdmin: isAdminLogin,
        loginTime: new Date().toISOString(),
        loginMethod: 'traditional'
      };
      setUser(userData);
      setCurrentView('chat');
      setIsLoading(false);
    }, 1500);
  }, []);

  // Cadastro
  const handleRegister = useCallback((formData) => {
    setIsLoading(true);
    setTimeout(() => {
      const userData = {
        id: Date.now(),
        username: formData.name,
        email: formData.email,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name}`,
        isAdmin: false,
        loginTime: new Date().toISOString(),
        loginMethod: 'register'
      };
      setUser(userData);
      setCurrentView('chat');
      setIsLoading(false);
    }, 2000);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setCurrentView('login');
    setChatMessages([]);
    setCurrentMessage('');
  }, []);

  // Sistema de digitação
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setCurrentMessage(value);
    
    if (value.length > 2) {
      const filtered = quickSuggestions.filter(s => 
        s.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 3));
    } else {
      setSuggestions([]);
    }
  }, []);

  // Função responsável por se comunicar com a API RAG e obter respostas do modelo LLM
  const simulateLLMResponse = useCallback(async (question) => {
    try {
      // Realiza requisição POST para o endpoint de chat da API backend
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
          // Origin é definido automaticamente pelo navegador para evitar conflitos de CORS
        },
        body: JSON.stringify({ question: question }),
      });
      
      // Validação do status HTTP da resposta
      if (!response.ok) {
        // Tentativa de extrair detalhes específicos do erro da resposta
        let errorMessage = `Erro HTTP: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Fallback para mensagem padrão se não conseguir parsear o JSON de erro
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Verificação adicional de erros na estrutura da resposta da API
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Formatação e retorno dos dados da resposta
      return {
        answer: data.answer || "Desculpe, não consegui gerar uma resposta.",
        source: data.sources && data.sources.length > 0 
          ? data.sources.map(s => s['nome do arquivo']).join(', ')
          : "Documentos da UFMA"
      };
    } catch (error) {
      console.error('Erro ao conectar com a API:', error);
      
      // Sistema de tratamento de erros com mensagens específicas para diferentes cenários
      let errorMessage = "Erro de Conexão\n\n";
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage += "Não foi possível conectar com o servidor. Verifique sua conexão com a internet.";
      } else if (error.message.includes('CORS')) {
        errorMessage += "Erro de CORS. A API pode estar bloqueando requisições do frontend.";
      } else if (error.message.includes('404')) {
        errorMessage += "Endpoint não encontrado. Verifique se a API está funcionando corretamente.";
      } else if (error.message.includes('500')) {
        errorMessage += "Erro interno do servidor. Tente novamente em alguns instantes.";
      } else {
        errorMessage += `Detalhes: ${error.message}`;
      }
      
      return {
        answer: errorMessage,
        source: "Sistema - Erro de Conexão"
      };
    }
  }, [API_BASE_URL]);

  // Função para processar e enviar mensagens do usuário para a API
  const handleSendMessage = useCallback(() => {
    if (!currentMessage.trim() || isLoading) return;

    const messageToSend = currentMessage.trim();
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: messageToSend,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setSuggestions([]);
    setIsLoading(true);

    // Execução da requisição para API sem delays artificiais para melhor performance
    simulateLLMResponse(messageToSend)
      .then(response => {
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: response.answer,
          source: response.source,
          timestamp: new Date(),
          feedback: null
        };

        setChatMessages(prev => [...prev, botMessage]);
        
        // Atualização do histórico do usuário com a nova interação
        setUserHistory(prev => [...prev, {
          question: messageToSend,
          answer: response.answer,
          source: response.source,
          timestamp: new Date()
        }]);
      })
      .catch(error => {
        console.error('Erro ao processar mensagem:', error);
        const errorMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: "Ocorreu um erro inesperado. Tente novamente.",
          source: "Sistema - Erro",
          timestamp: new Date(),
          feedback: null
        };
        setChatMessages(prev => [...prev, errorMessage]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [currentMessage, isLoading, simulateLLMResponse]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleFeedback = useCallback((messageId, feedback) => {
    setChatMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, feedback } : msg
      )
    );
  }, []);

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text);
  }, []);

  const reportError = useCallback((messageId) => {
    setChatMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, reported: true } : msg
      )
    );
  }, []);

  // Props compartilhadas
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
    reportError
  };

  // Main render logic
  if (!user) return <LoginView {...sharedProps} />;
  
  switch (currentView) {
    case 'chat':
      return <ChatView {...sharedProps} />;
    case 'history':
      return <HistoryView {...sharedProps} />;
    case 'admin':
      return user.isAdmin ? <AdminView {...sharedProps} /> : <ChatView {...sharedProps} />;
    default:
      return <ChatView {...sharedProps} />;
  }
};

export default UFMAConsultaSystem;