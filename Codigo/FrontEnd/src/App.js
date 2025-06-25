// FrontEnd/src/App.js
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import LoginView from './components/LoginView/LoginView';
import ChatView from './components/ChatView/ChatView';
import HistoryView from './components/HistoryView/HistoryView';
import AdminView from './components/AdminView/AdminView';
import './App.css';

const UFMAConsultaSystem = () => {
  // === ESTADOS PRINCIPAIS ===
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userHistory, setUserHistory] = useState([]);
  const [documentVersion] = useState('RESOLUÇÃO Nº 1892-CONSEPE - v1.0 (28/06/2019)');
  const [suggestions, setSuggestions] = useState([]);

  // === CONFIGURAÇÕES ===
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  const ADMIN_EMAIL = 'admin@ufma.br';

  // === SUGESTÕES MEMORIZADAS ===
  const quickSuggestions = useMemo(() => [
    "Quais são os requisitos para transferência de curso?",
    "Como funciona o sistema de avaliação?",
    "Qual a carga horária mínima para colação de grau?",
    "Quais as regras para aproveitamento de estudos?",
    "Documentos necessários para matrícula."
  ], []);

  // === CARREGAR USUÁRIO DO LOCALSTORAGE ===
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setCurrentView('chat');
      } catch (error) {
        console.error('Erro ao carregar usuário salvo:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  // === AUTENTICAÇÃO E USUÁRIO ===
  const onLoginSuccess = useCallback((userData, token) => {
    console.log('Login Success - User:', userData, 'Token:', token);
    
    setUser(userData);
    setCurrentView('chat');
    
    // Salvar no localStorage
    if (token) {
      localStorage.setItem('token', token);
    }
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    }
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setChatMessages([]);
    setCurrentView('login');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    alert('Você foi desconectado.');
  }, []);

  // === FEEDBACK E ERROS ===
  const reportError = useCallback((errorDetails) => {
    console.error("Erro reportado:", errorDetails);
    alert(`Um erro foi reportado: ${errorDetails}`);
  }, []);

  // === FUNÇÕES DO CHAT ===
  const handleInputChange = useCallback((event) => {
    setCurrentMessage(event.target.value);
    if (event.target.value === '') {
      setSuggestions([]);
    } else {
      const filteredSuggestions = quickSuggestions.filter(s =>
        s.toLowerCase().includes(event.target.value.toLowerCase())
      );
      setSuggestions(filteredSuggestions);
    }
  }, [quickSuggestions]);

  const handleSendMessage = useCallback(async () => {
    if (!currentMessage.trim() || isLoading) return;

    setIsLoading(true);
    setSuggestions([]);

    const newUserMessage = {
      id: chatMessages.length + 1,
      text: currentMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString(),
      sources: []
    };

    setChatMessages((prevMessages) => [...prevMessages, newUserMessage]);
    const questionToSend = currentMessage;
    setCurrentMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question: questionToSend }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert('Sessão expirada ou não autorizada. Por favor, faça login novamente.');
          handleLogout();
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Resposta da API de chat:", data);

      const botMessage = {
        id: chatMessages.length + 2,
        text: data.answer,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString(),
        sources: data.sources?.map(source => ({
          filename: source.filename || 'Documento',
          content: source.conteudo || source.content,
          score: source.score,
          chunk_order: source.chunk_order,
          start_char: source.start_char,
          end_char: source.end_char
        })) || []
      };

      setChatMessages((prevMessages) => [...prevMessages, botMessage]);

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setChatMessages((prevMessages) => [
        ...prevMessages,
        {
          id: prevMessages.length + 2,
          text: `Desculpe, não consegui obter uma resposta. Por favor, tente novamente. (Erro: ${error.message})`,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString(),
          isError: true,
        },
      ]);
      reportError(`Erro ao enviar mensagem: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentMessage, isLoading, chatMessages.length, API_BASE_URL, handleLogout, reportError]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' && !isLoading) {
      handleSendMessage();
    }
  }, [handleSendMessage, isLoading]);

  const handleFeedback = useCallback(async (messageId, feedbackType) => {
    alert(`Feedback "${feedbackType}" registrado para a mensagem ${messageId}.`);
  }, []);

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Texto copiado para a área de transferência!');
    }).catch(err => {
      console.error('Erro ao copiar texto: ', err);
    });
  }, []);

  // === FUNÇÕES DE ADMIN E DOCUMENTOS ===
  const handleUploadDocument = useCallback(async (file) => {
    if (!file) {
      alert("Nenhum arquivo selecionado.");
      return;
    }
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        alert(`Documento "${file.name}" carregado com sucesso! ${data.message}`);
      } else {
        throw new Error(data.detail || `Erro ao carregar documento: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Erro no upload do documento:', error);
      reportError(`Falha no upload do documento: ${error.message}`);
      alert(`Falha ao carregar documento: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, reportError]);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/documents`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        console.log("Documentos Carregados:", data.documents);
        return data.documents;
      } else {
        throw new Error(data.detail || `Erro ao buscar documentos: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
      reportError(`Falha ao buscar documentos: ${error.message}`);
      alert(`Falha ao buscar documentos: ${error.message}`);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, reportError]);

  const fetchUserHistory = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/history`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setUserHistory(data.history);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      reportError(`Erro ao carregar histórico: ${error.message}`);
      setUserHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, API_BASE_URL, reportError]);

  useEffect(() => {
    if (user && currentView === 'history') {
      fetchUserHistory();
    }
  }, [user, currentView, fetchUserHistory]);

  // === PROPS COMPARTILHADAS ===
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
    handleLogout,
    handleInputChange,
    handleSendMessage,
    handleKeyDown,
    handleFeedback,
    copyToClipboard,
    reportError,
    API_BASE_URL,
    ADMIN_EMAIL,
    handleUploadDocument,
    fetchDocuments,
    fetchUserHistory
  };

  const loginProps = {
    API_BASE_URL,
    onLoginSuccess,
    isLoading,
    setIsLoading
  };

  // === RENDERIZAÇÃO ===
  if (!user) {
    return <LoginView {...loginProps} />;
  }

  switch (currentView) {
    case 'chat':
      return <ChatView {...sharedProps} />;
    case 'history':
      return <HistoryView {...sharedProps} />;
    case 'admin':
      if (user && user.isAdmin) {
        return <AdminView {...sharedProps} />;
      } else {
        setCurrentView('chat');
        return <ChatView {...sharedProps} />;
      }
    default:
      return <ChatView {...sharedProps} />;
  }
};

export default UFMAConsultaSystem;