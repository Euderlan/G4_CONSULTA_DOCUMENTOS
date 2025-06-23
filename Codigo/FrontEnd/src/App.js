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
    "Documentos necessários para matrícula."
  ];

  // === AUTENTICAÇÃO E USUÁRIO ===
  const onLoginSuccess = useCallback((userData) => {
    setUser(userData);
    setCurrentView('chat'); // Redireciona para o chat após o login
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setChatMessages([]);
    setCurrentView('login');
    localStorage.removeItem('token'); // Limpa o token ao deslogar
    alert('Você foi desconectado.');
  }, []);

  // === FUNÇÕES DO CHAT ===
  const handleInputChange = useCallback((event) => {
    setCurrentMessage(event.target.value);
    // Lógica para sugestões (pode ser aprimorada com uma API de sugestões futuras)
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
    setSuggestions([]); // Limpa as sugestões ao enviar a mensagem

    const newUserMessage = {
      id: chatMessages.length + 1,
      text: currentMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString(),
      sources: [] // Usuário não tem fontes
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
          'Authorization': `Bearer ${token}` // Inclui o token JWT
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
      console.log("Resposta da API de chat:", data); // Para depuração

      const botMessage = {
        id: chatMessages.length + 2,
        text: data.answer, // A resposta do LLM
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString(),
        sources: data.sources.map(source => ({ // Mapeia as fontes recebidas do backend
          filename: source.filename,
          content: source.content, // O conteúdo do chunk, se desejar exibir
          chunk_order: source.chunk_order, // Pode ser útil para ordenação ou depuração
          start_char: source.start_char,
          end_char: source.end_char
        }))
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
    // Implementar lógica de API para enviar feedback ao backend
  }, []);

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Texto copiado para a área de transferência!');
    }).catch(err => {
      console.error('Erro ao copiar texto: ', err);
    });
  }, []);

  const reportError = useCallback((errorDetails) => {
    console.error("Erro reportado:", errorDetails);
    // Aqui você pode integrar um serviço de log de erros ou notificação
    alert(`Um erro foi reportado: ${errorDetails}`);
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
          'Authorization': `Bearer ${token}` // Incluir token JWT
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        alert(`Documento "${file.name}" carregado com sucesso! ${data.message}`);
        // Atualizar lista de documentos ou stats após upload
      } else {
        throw new Error(data.detail || `Erro ao carregar documento: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Erro no upload do documento:', error);
      alert(`Falha ao carregar documento: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL]);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/documents`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}` // Incluir token JWT
        }
      });
      const data = await response.json();
      if (response.ok) {
        console.log("Documentos Carregados:", data.documents);
        return data.documents; // Retorna os documentos
      } else {
        throw new Error(data.detail || `Erro ao buscar documentos: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
      alert(`Falha ao buscar documentos: ${error.message}`);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL]);

  // === CARREGAR HISTÓRICO QUANDO NECESSÁRIO ===
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
      setUserHistory(data.history); // Assumindo que o backend retorna { history: [...] }
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      reportError(`Erro ao carregar histórico: ${error.message}`);
      setUserHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, API_BASE_URL, reportError]);

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
        setCurrentView('chat'); // Redireciona para o chat se não for admin
        return <ChatView {...sharedProps} />;
      }
    default:
      return <ChatView {...sharedProps} />;
  }
};

export default UFMAConsultaSystem;