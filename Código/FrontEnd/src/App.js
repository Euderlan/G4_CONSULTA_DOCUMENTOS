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

  // Resposta LLM via API RAG
  const simulateLLMResponse = useCallback(async (question) => {
    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return {
        answer: data.answer,
        source: data.sources && data.sources.length > 0 
          ? data.sources.map(s => s['nome do arquivo']).join(', ')
          : "Documentos da UFMA"
      };
    } catch (error) {
      console.error('Erro ao conectar com a API:', error);
      
      return {
        answer: "❌ **Erro de Conexão**\n\nNão foi possível conectar com o sistema de documentos. Verifique se a API está rodando.",
        source: "Sistema - Erro de Conexão"
      };
    }
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
    
    setTimeout(async () => {
      const response = await simulateLLMResponse(messageToSend);
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