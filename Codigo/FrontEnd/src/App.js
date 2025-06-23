// App.js - VERSÃO LIMPA E ORGANIZADA
// Apenas passa configurações e callbacks para o LoginView

import React, { useState, useCallback, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
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

  const quickSuggestions = [
    "Quais são os requisitos para transferência de curso?",
    "Como funciona o sistema de avaliação?",
    "Qual a carga horária mínima para colação de grau?",
    "Quais as regras para aproveitamento de estudos?",
    "Como solicitar trancamento de matrícula?",
  ];

  // === FUNÇÕES DE UTILIDADE PARA TOKEN ===
  const getAuthToken = () => localStorage.getItem('authToken');
  const removeAuthToken = () => localStorage.removeItem('authToken');

  // === CALLBACK PARA QUANDO LOGIN FOR REALIZADO COM SUCESSO ===
// Versão robusta que funciona com 'name', 'username' ou 'email'
const onLoginSuccess = useCallback((userData, token) => {
  const userName = userData.name || userData.username || userData.email.split('@')[0];
  
  localStorage.setItem('authToken', token);
  setUser({
    id: userData.id,
    name: userName,
    email: userData.email,
    isAdmin: userData.is_admin,
    token: token
  });
  setCurrentView('chat');
  
  console.log('✅ Usuário logado:', userName);
}, []);

  // === FUNÇÃO PARA LOGOUT ===
  const handleLogout = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (token) {
        // Chama endpoint de logout (opcional)
        await fetch(`${API_BASE_URL}/api/login/logout`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
          },
        });
      }
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      // Remove token e limpa estado local
      removeAuthToken();
      setUser(null);
      setChatMessages([]);
      setUserHistory([]);
      setCurrentView('login');
      console.log('Logout realizado');
    }
  }, [API_BASE_URL]);

  // === VERIFICAR SE USUÁRIO JÁ ESTÁ LOGADO ===
  const checkExistingAuth = useCallback(async () => {
    const token = getAuthToken();
    if (token) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/login/me`, {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
          },
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            isAdmin: userData.is_admin,
            token: token
          });
          setCurrentView('chat');
        } else {
          // Token inválido ou expirado
          removeAuthToken();
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        removeAuthToken();
      }
    }
  }, [API_BASE_URL]);

  // === FUNÇÕES DO CHAT ===
  const handleInputChange = useCallback((e) => {
    setCurrentMessage(e.target.value);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!currentMessage.trim() || isLoading) return;

    const newUserMessage = { 
      id: Date.now(), 
      text: currentMessage, 
      sender: 'user', 
      timestamp: new Date() 
    };
    setChatMessages((prev) => [...prev, newUserMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question: newUserMessage.text }),
      });

      const data = await response.json();

      if (response.ok) {
        const newAIMessage = {
          id: Date.now() + 1,
          text: data.answer,
          sender: 'ai',
          sources: data.sources || [],
          context: data.context || '',
          feedback: null,
          reported: false,
          timestamp: new Date()
        };
        setChatMessages((prev) => [...prev, newAIMessage]);
      } else {
        if (response.status === 401) {
          alert('Sua sessão expirou. Faça login novamente.');
          handleLogout();
          return;
        }
        const errorMessage = data.detail || 'Erro ao obter resposta do LLM.';
        setChatMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, text: `Erro: ${errorMessage}`, sender: 'ai', error: true, timestamp: new Date() },
        ]);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, text: 'Erro de conexão. Tente novamente.', sender: 'ai', error: true, timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [currentMessage, isLoading, API_BASE_URL, handleLogout]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // === OUTRAS FUNÇÕES (feedback, copy, etc.) ===
  const handleFeedback = useCallback((messageId, feedback) => {
    setChatMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, feedback } : msg))
    );
  }, []);

  const copyToClipboard = useCallback((text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      console.log('Conteúdo copiado para a área de transferência!');
    } catch (err) {
      console.error('Não foi possível copiar o conteúdo:', err);
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

  const reportError = useCallback((messageId) => {
    setChatMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, reported: true } : msg))
    );
  }, []);

  // === FUNÇÕES DE HISTÓRICO ===
  const fetchUserHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/chat/history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const historyWithDates = data.history.map(item => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setUserHistory(historyWithDates || []);
      } else {
        if (response.status === 401) {
          handleLogout();
          return;
        }
        console.error('Erro ao buscar histórico:', data.detail || 'Erro desconhecido');
        setUserHistory([]);
      }
    } catch (error) {
      console.error('Erro de rede ao buscar histórico:', error);
      setUserHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, handleLogout]);

  // === FUNÇÕES ADMIN ===
  const handleUploadDocument = useCallback(async (file) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/admin/upload`, {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
      } else {
        if (response.status === 401) {
          handleLogout();
          return;
        }
        alert('Erro no upload: ' + (data.detail || data.message || 'Erro desconhecido.'));
      }
    } catch (error) {
      console.error('Erro de rede no upload:', error);
      alert('Erro de conexão ao fazer upload. Verifique sua conexão.');
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL, handleLogout]);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/admin/documents`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      const data = await response.json();
      if (response.ok) {
        return data.documents;
      } else {
        if (response.status === 401) {
          handleLogout();
          return [];
        }
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
  }, [API_BASE_URL, handleLogout]);

  // === VERIFICAR AUTH NA INICIALIZAÇÃO ===
  useEffect(() => {
    checkExistingAuth();
  }, [checkExistingAuth]);

  // === CARREGAR HISTÓRICO QUANDO NECESSÁRIO ===
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
  };

  // === PROPS ESPECÍFICAS PARA LOGIN ===
  const loginProps = {
    API_BASE_URL,
    onLoginSuccess, // Callback para quando login der certo
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
      return <LoginView {...loginProps} />;
  }
};

export default UFMAConsultaSystem;