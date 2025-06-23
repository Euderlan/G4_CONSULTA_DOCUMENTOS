import React, { useState, useCallback, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import LoginView from './components/LoginView/LoginView';
import ChatView from './components/ChatView/ChatView';
import HistoryView from './components/HistoryView/HistoryView';
import AdminView from './components/AdminView/AdminView';
import './App.css';

const UFMAConsultaSystem = () => {
  // === ESTADOS PRINCIPAIS ===
  const [user, setUser] = useState(null); // Objeto { id, name, email, isAdmin, token }
  const [currentView, setCurrentView] = useState('login');
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userHistory, setUserHistory] = useState([]);
  const [documentVersion] = useState('RESOLUÇÃO Nº 1892-CONSEPE - v1.0 (28/06/2019)');
  const [suggestions, setSuggestions] = useState([]);

  // === CONFIGURAÇÕES ===
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  const ADMIN_EMAIL = 'admin.consepe@ufma.br'; // Email do admin para lógica frontend (backend também verifica)

  const quickSuggestions = [
    "Quais são os requisitos para transferência de curso?",
    "Como funciona o sistema de avaliação?",
    "Qual a carga horária mínima para colação de grau?",
    "Quais as regras para aproveitamento de estudos?",
    "Fale sobre a matrícula institucional.",
    "O que diz a resolução sobre o trancamento de curso?",
    "Quais os deveres dos alunos?",
    "Como é feita a integralização curricular?",
  ];

  // === FUNÇÕES DE UTILIDADE PARA TOKEN ===
  const getAuthToken = useCallback(() => localStorage.getItem('authToken'), []);
  const removeAuthToken = useCallback(() => localStorage.removeItem('authToken'), []);

  // === FUNÇÃO PARA REPORTAR ERROS ===
  // Usada para alertar o usuário e logar no console
  const reportError = useCallback((message, isFatal = false) => {
    console.error("Erro na aplicação:", message);
    // Em uma aplicação real, você integraria um serviço de log de erros (ex: Sentry)
    alert(`Erro: ${message}${isFatal ? "\nPor favor, recarregue a página." : ""}`);
  }, []);

  // === CALLBACK PARA QUANDO LOGIN FOR REALIZADO COM SUCESSO ===
  const onLoginSuccess = useCallback((userData, token) => {
    // Armazena o token de forma persistente (localStorage)
    localStorage.setItem('authToken', token);

    // Constrói o objeto de usuário, incluindo a flag isAdmin
    setUser({
      id: userData.id,
      name: userData.name || userData.username || userData.email.split('@')[0], // Tenta nome, username ou parte do email
      email: userData.email,
      isAdmin: userData.is_admin, // Assume que o backend envia is_admin
      token: token // Guarda o token no estado do usuário também
    });
    setCurrentView('chat'); // Redireciona para o chat após o login
    reportError('Login bem-sucedido!', false); // Alerta não fatal
  }, [reportError]);

  // === FUNÇÃO PARA LOGOUT ===
  const handleLogout = useCallback(async () => {
    // Opcional: chamar endpoint de logout no backend se ele invalidar tokens (melhor prática)
    try {
      const token = getAuthToken();
      if (token) {
        // Exemplo de chamada a um endpoint de logout, se existisse no backend
        // await fetch(`${API_BASE_URL}/api/login/logout`, {
        //   method: 'POST',
        //   headers: { 'Authorization': `Bearer ${token}` },
        // });
      }
    } catch (error) {
      console.error('Erro durante o processo de logout (pode ser ignorado se token já inválido):', error);
    } finally {
      removeAuthToken(); // Remove o token do localStorage
      setUser(null); // Limpa o estado do usuário
      setChatMessages([]); // Limpa as mensagens do chat
      setUserHistory([]); // Limpa o histórico
      setCurrentView('login'); // Retorna para a tela de login
      reportError('Sessão encerrada. Você foi desconectado.', false);
    }
  }, [removeAuthToken, reportError]);

  // === VERIFICAR SE USUÁRIO JÁ ESTÁ LOGADO NA INICIALIZAÇÃO ===
  const checkExistingAuth = useCallback(async () => {
    const token = getAuthToken();
    if (token) {
      try {
        // Tenta validar o token com o backend (endpoint /me)
        const response = await fetch(`${API_BASE_URL}/api/login/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });

        if (response.ok) {
          const userData = await response.json();
          // Define o usuário baseado nos dados retornados pelo /me
          setUser({
            id: userData.id,
            name: userData.name || userData.username || userData.email.split('@')[0],
            email: userData.email,
            isAdmin: userData.is_admin,
            token: token
          });
          setCurrentView('chat'); // Volta para o chat se autenticado
        } else {
          // Token inválido, expirado ou erro no backend
          removeAuthToken();
          reportError('Sua sessão expirou. Faça login novamente.', false);
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação existente:', error);
        removeAuthToken();
        reportError('Não foi possível verificar a sessão. Tente fazer login novamente.', false);
      }
    }
  }, [API_BASE_URL, getAuthToken, removeAuthToken, reportError]);

  // === FUNÇÕES DE CHAT ===
  const handleInputChange = useCallback((e) => {
    const text = e.target.value;
    setCurrentMessage(text);

    // Lógica para sugestões rápidas
    if (text.length > 2) {
      const filteredSuggestions = quickSuggestions.filter(
        (sug) => sug.toLowerCase().includes(text.toLowerCase())
      );
      setSuggestions(filteredSuggestions.length > 0 ? filteredSuggestions : []);
    } else {
      setSuggestions([]);
    }
  }, [quickSuggestions]);

  const handleSendMessage = useCallback(async () => {
    if (!currentMessage.trim() || isLoading || !user?.token) return; // Garante que há token

    setIsLoading(true);
    setSuggestions([]); // Limpa as sugestões ao enviar a mensagem

    const userMessage = {
      id: Date.now() + Math.random(), // ID único para a mensagem do usuário
      sender: 'user',
      text: currentMessage,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prevMessages) => [...prevMessages, userMessage]);
    setCurrentMessage(''); // Limpa o input

    try {
      const token = getAuthToken(); // Obtém o token
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Inclui o token JWT
        },
        body: JSON.stringify({ question: userMessage.text }), // Envia apenas a pergunta
      });

      if (!response.ok) {
        if (response.status === 401) {
          reportError('Sessão expirada ou não autorizada. Por favor, faça login novamente.', true);
          handleLogout(); // Força o logout
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.detail || `Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log("Resposta da API de chat:", data);

      const botMessage = {
        id: Date.now() + Math.random(), // ID único para a mensagem do bot
        sender: 'bot',
        text: data.answer, // Resposta gerada pelo LLM
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources || [], // Garante que 'sources' é um array, mesmo que vazio
        context: data.context || '', // Contexto usado para referência
      };

      setChatMessages((prevMessages) => [...prevMessages, botMessage]);

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      reportError(`Falha ao enviar mensagem: ${error.message}`, false);
      setChatMessages((prevMessages) => [
        ...prevMessages,
        {
          id: Date.now() + Math.random(),
          sender: 'bot',
          text: `Desculpe, não consegui obter uma resposta. Erro: ${error.message}`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          isError: true, // Indica que esta é uma mensagem de erro do bot
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [currentMessage, isLoading, user, API_BASE_URL, getAuthToken, reportError, handleLogout]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { // Permite Shift+Enter para quebra de linha
        e.preventDefault(); // Impede a quebra de linha padrão do Enter
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // === OUTRAS FUNÇÕES (feedback, copy, etc.) ===
  const handleFeedback = useCallback(async (messageId, feedbackType) => {
    // Lógica para enviar feedback para o backend (API_BASE_URL/api/feedback ou similar)
    console.log(`Feedback para message ${messageId}: ${feedbackType}`);
    reportError(`Feedback registrado: ${feedbackType}`, false);
    // Atualizar estado da mensagem se precisar mostrar o feedback na UI
  }, [reportError]);

  const copyToClipboard = useCallback((text) => {
    // Tenta usar a Clipboard API moderna, com fallback para textarea (mais compatível)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        reportError('Texto copiado para a área de transferência!', false);
      }).catch(err => {
        console.error('Falha ao copiar via Clipboard API:', err);
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          reportError('Texto copiado (fallback)!', false);
        } catch (execErr) {
          console.error('Falha ao copiar via execCommand:', execErr);
          reportError('Não foi possível copiar o texto.', false);
        }
        document.body.removeChild(textArea);
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        reportError('Texto copiado (fallback)!', false);
      } catch (execErr) {
        console.error('Falha ao copiar via execCommand:', execErr);
        reportError('Não foi possível copiar o texto.', false);
      }
      document.body.removeChild(textArea);
    }
  }, [reportError]);


  // === FUNÇÕES ADMIN E DOCUMENTOS ===
  const handleUploadDocument = useCallback(async (file) => {
    if (!file) {
      reportError("Nenhum arquivo selecionado para upload.", false);
      return;
    }
    setIsLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        reportError("Erro: Usuário não autenticado para upload. Faça login novamente.", true);
        handleLogout();
        return;
      }

      const formData = new FormData();
      formData.append('file', file); // 'file' deve corresponder ao nome do parâmetro no seu endpoint FastAPI

      const response = await fetch(`${API_BASE_URL}/api/admin/upload`, {
        method: 'POST',
        headers: {
          // 'Content-Type': 'multipart/form-data' NÃO é necessário, fetch define para FormData
          'Authorization': `Bearer ${token}`, // Inclui token JWT
        },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401) {
          reportError("Sessão expirada. Faça login novamente.", true);
          handleLogout();
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.detail || `Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      reportError(`Documento "${file.name}" carregado com sucesso! ${result.message}`, false);
      // Você pode querer chamar fetchDocuments() aqui para atualizar a lista na tela de admin
    } catch (error) {
      console.error('Erro no upload do documento:', error);
      reportError(`Falha no upload do documento: ${error