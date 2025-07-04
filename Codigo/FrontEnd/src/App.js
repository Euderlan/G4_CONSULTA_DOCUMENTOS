import React, { useState, useCallback, useEffect, useMemo } from 'react';
import LoginView from './components/LoginView/LoginView';
import ChatView from './components/ChatView/ChatView';
import HistoryView from './components/HistoryView/HistoryView';
import AdminView from './components/AdminView/AdminView';
import './App.css';

const UFMAConsultaSystem = () => {
  // === ESTADOS PRINCIPAIS DA APLICAÇÃO ===
  const [user, setUser] = useState(null); // Dados do usuário logado
  const [currentView, setCurrentView] = useState('login'); // Controla qual tela está ativa
  const [chatMessages, setChatMessages] = useState([]); // Histórico de mensagens do chat atual
  const [currentMessage, setCurrentMessage] = useState(''); // Mensagem sendo digitada
  const [isLoading, setIsLoading] = useState(false); // Estado de carregamento global
  const [userHistory, setUserHistory] = useState([]); // Histórico de conversas salvas
  const [documentVersion] = useState('RESOLUÇÃO Nº 1892-CONSEPE - v1.0 (28/06/2019)'); // Versão dos documentos
  const [suggestions, setSuggestions] = useState([]); // Sugestões dinâmicas de perguntas

  // === CONFIGURAÇÕES E CONSTANTES ===
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  const ADMIN_EMAIL = 'admin@ufma.br'; // Email que define usuário admin

  // === SUGESTÕES RÁPIDAS MEMORIZADAS ===
  // useMemo evita recriação desnecessária do array a cada render
  const quickSuggestions = useMemo(() => [
    "Quais são os requisitos para transferência de curso?",
    "Como funciona o sistema de avaliação?",
    "Qual a carga horária mínima para colação de grau?",
    "Quais as regras para aproveitamento de estudos?",
    "Documentos necessários para matrícula."
  ], []);

  // === EFFECT PARA CARREGAR USUÁRIO DO LOCALSTORAGE ===
  // Verifica se há sessão salva ao inicializar a aplicação
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
        // Remove dados corrompidos
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  // === FUNÇÃO PARA VERIFICAR PRIVILÉGIOS DE ADMINISTRADOR ===
  const isUserAdmin = useCallback((userData) => {
    return userData?.isAdmin === true || userData?.email === ADMIN_EMAIL;
  }, [ADMIN_EMAIL]);

  // === FUNÇÃO PARA VERIFICAR SE USUÁRIO VIROU ADMIN ===
  // Verifica periodicamente se o usuário foi promovido a admin
  const checkUserAdminStatus = useCallback(async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/login/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        // Se o status de admin mudou, atualiza o usuário
        if (userData.is_admin !== user.isAdmin) {
          const updatedUser = {...user, isAdmin: userData.is_admin};
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          
          if (userData.is_admin) {
            alert('🎉 Parabéns! Você foi promovido a administrador!');
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status admin:', error);
    }
  }, [user, API_BASE_URL]);

  // === EFFECT PARA VERIFICAR STATUS ADMIN PERIODICAMENTE ===
  useEffect(() => {
    if (user && !user.isAdmin) {
      // Verifica a cada 30 segundos se o usuário foi promovido
      const interval = setInterval(checkUserAdminStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [user, checkUserAdminStatus]);

  // === FUNÇÕES DE AUTENTICAÇÃO ===
  // Callback executado após login bem-sucedido
  const onLoginSuccess = useCallback((userData, token) => {
    console.log('Login Success - User:', userData, 'Token:', token);
    
    setUser(userData);
    setCurrentView('chat');
    
    // Salvar dados da sessão no localStorage para persistência
    if (token) {
      localStorage.setItem('token', token);
    }
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    }
  }, []);

  // Função para fazer logout e limpar sessão
  const handleLogout = useCallback(() => {
    setUser(null);
    setChatMessages([]);
    setCurrentView('login');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    alert('Você foi desconectado.');
  }, []);

  // === FUNÇÃO PERSONALIZADA PARA MUDANÇA DE VIEW COM VALIDAÇÃO ===
  const handleViewChange = useCallback((newView) => {
    console.log('Tentando mudar para view:', newView);
    console.log('Usuário atual:', user);
    console.log('É admin?', isUserAdmin(user));

    // Verificação de segurança para área administrativa
    if (newView === 'admin') {
      if (!isUserAdmin(user)) {
        alert('Acesso negado: Apenas administradores podem acessar esta área.');
        return;
      }
    }

    setCurrentView(newView);
    console.log('View mudou para:', newView);
  }, [user, isUserAdmin]);

  // === FUNÇÃO PARA REPORTAR ERROS ===
  const reportError = useCallback((errorDetails) => {
    console.error("Erro reportado:", errorDetails);
    alert(`Um erro foi reportado: ${errorDetails}`);
  }, []);

  // === FUNÇÕES DO SISTEMA DE CHAT ===
  // Gerencia mudanças no input de mensagem e filtra sugestões
  const handleInputChange = useCallback((event) => {
    setCurrentMessage(event.target.value);
    if (event.target.value === '') {
      setSuggestions([]);
    } else {
      // Filtra sugestões baseadas no texto digitado
      const filteredSuggestions = quickSuggestions.filter(s =>
        s.toLowerCase().includes(event.target.value.toLowerCase())
      );
      setSuggestions(filteredSuggestions);
    }
  }, [quickSuggestions]);

  // Função principal para enviar mensagem ao backend
  const handleSendMessage = useCallback(async () => {
    if (!currentMessage.trim() || isLoading) return;

    setIsLoading(true);
    setSuggestions([]);

    // Cria mensagem do usuário
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

      // Verifica se a sessão ainda é válida
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

      // Cria mensagem de resposta do bot
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
      // Adiciona mensagem de erro ao chat
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

  // Permite envio de mensagem com tecla Enter
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' && !isLoading) {
      handleSendMessage();
    }
  }, [handleSendMessage, isLoading]);

  // Processa feedback do usuário sobre as respostas
  const handleFeedback = useCallback(async (messageId, feedbackType) => {
    alert(`Feedback "${feedbackType}" registrado para a mensagem ${messageId}.`);
  }, []);

  // Copia texto para área de transferência
  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Texto copiado para a área de transferência!');
    }).catch(err => {
      console.error('Erro ao copiar texto: ', err);
    });
  }, []);

  // === FUNÇÕES ADMINISTRATIVAS E GERENCIAMENTO DE DOCUMENTOS ===
  // Faz upload de documento para o sistema
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

  // Busca lista de documentos do sistema
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

  // Busca histórico de conversas do usuário
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

  // Effect para carregar histórico quando usuário acessa a tela de histórico
  useEffect(() => {
    if (user && currentView === 'history') {
      fetchUserHistory();
    }
  }, [user, currentView, fetchUserHistory]);

  // === CONFIGURAÇÃO DE PROPS COMPARTILHADAS ===
  // Objeto com todas as props que são passadas para os componentes filhos
  const sharedProps = {
    user,
    setUser,
    currentView,
    setCurrentView: handleViewChange, // Usar a função personalizada com validação
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
    fetchUserHistory,
    isUserAdmin
  };

  // Props específicas para o componente de login
  const loginProps = {
    API_BASE_URL,
    onLoginSuccess,
    isLoading,
    setIsLoading
  };

  // === RENDERIZAÇÃO CONDICIONAL BASEADA NO ESTADO ===
  // Se não há usuário logado, mostra tela de login
  if (!user) {
    return <LoginView {...loginProps} />;
  }

  // Debug logs para desenvolvimento
  console.log('Current View:', currentView);
  console.log('User:', user);
  console.log('Is Admin:', isUserAdmin(user));

  // Switch para renderizar a tela apropriada baseada na view atual
  switch (currentView) {
    case 'chat':
      return <ChatView {...sharedProps} />;
    case 'history':
      return <HistoryView {...sharedProps} />;
    case 'admin':
      // Verificação adicional de segurança para área admin
      if (isUserAdmin(user)) {
        return <AdminView {...sharedProps} />;
      } else {
        console.log('Acesso negado à área admin, redirecionando para chat');
        // Se chegou aqui sem ser admin, volta para o chat
        setTimeout(() => handleViewChange('chat'), 0);
        return <ChatView {...sharedProps} />;
      }
    default:
      // Fallback padrão para o chat
      return <ChatView {...sharedProps} />;
  }
};

export default UFMAConsultaSystem;