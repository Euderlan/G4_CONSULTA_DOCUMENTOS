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

  // Resposta LLM
  const simulateLLMResponse = useCallback((question) => {
    const responses = [
      {
        answer: "📋 **Transferência de Curso na UFMA**\n\nDe acordo com a RESOLUÇÃO Nº 1892-CONSEPE, para transferência entre cursos você deve:\n\n• Ter compatibilidade curricular mínima de 30%\n• Disponibilidade de vagas no curso desejado\n• Estar regularmente matriculado\n• Não ter pendências acadêmicas\n\nO processo ocorre semestralmente conforme cronograma acadêmico.",
        source: "Art. 8º, incisos I-III da RESOLUÇÃO Nº 1892-CONSEPE"
      },
      {
        answer: "📊 **Sistema de Avaliação dos Cursos**\n\nA avaliação segue critérios rigorosos estabelecidos pela resolução:\n\n• **Avaliação periódica** do projeto pedagógico\n• **Análise de desempenho** acadêmico dos estudantes\n• **Acompanhamento** de indicadores de qualidade\n• **Revisão curricular** quando necessário\n\nTodos os cursos passam por avaliação a cada 3 anos.",
        source: "Capítulo IV, Art. 22 da RESOLUÇÃO Nº 1892-CONSEPE"
      },
      {
        answer: "⏱️ **Carga Horária dos Cursos de Graduação**\n\nAs cargas horárias são definidas conforme as diretrizes nacionais:\n\n• **Bacharelados**: Mínimo estabelecido pelo CNE\n• **Licenciaturas**: Incluem 400h de prática pedagógica\n• **Tecnólogos**: Conforme catálogo nacional\n• **Estágios**: Carga horária específica por área\n\nCada curso tem sua matriz curricular aprovada pelo CONSEPE.",
        source: "Art. 15, § 2º da RESOLUÇÃO Nº 1892-CONSEPE"
      }
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }, []);

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

    const delay = Math.random() * 2000 + 1000;
    
    setTimeout(() => {
      const response = simulateLLMResponse(messageToSend);
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.answer,
        source: response.source,
        timestamp: new Date(),
        feedback: null
      };

      setChatMessages(prev => [...prev, botMessage]);
      
      setUserHistory(prev => [...prev, {
        question: messageToSend,
        answer: response.answer,
        source: response.source,
        timestamp: new Date()
      }]);
      
      setIsLoading(false);
    }, delay);
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