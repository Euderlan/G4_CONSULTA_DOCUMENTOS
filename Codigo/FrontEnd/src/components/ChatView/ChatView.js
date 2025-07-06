import React, { useState } from 'react';
import {
  MessageSquare,
  History,
  Shield,
  LogOut,
  Zap,
  Send,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Copy,
  FileText,
  Clock
} from 'lucide-react';
import './ChatView.css';
import AdminRequestButton from '../AdminRequestButton/AdminRequestButton';
import DocumentSelector from '../DocumentSelector/DocumentSelector'; 

const ChatView = ({
  user,
  setCurrentView,
  chatMessages,
  setChatMessages,
  currentMessage,
  isLoading,
  suggestions,
  quickSuggestions,
  documentVersion,
  handleLogout,
  handleInputChange,
  handleSendMessage,
  handleKeyDown,
  handleFeedback,
  copyToClipboard,
  reportError,
  setCurrentMessage,
  setSuggestions,
  API_BASE_URL
}) => {
  // Estado local para rastrear feedback dado pelo usuário em cada mensagem
  const [messageFeedback, setMessageFeedback] = useState({});
  
  // Estado para documento selecionado
  const [selectedDocument, setSelectedDocument] = useState('all');
  
  // Estado para controlar se o seletor de documentos está visível
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);

  // Função wrapper para gerenciar feedback com estado visual local
  const handleFeedbackWithState = (messageId, feedbackType) => {
    // Atualizar estado local para mostrar feedback visual imediato
    setMessageFeedback(prev => ({
      ...prev,
      [messageId]: feedbackType
    }));
    
    // Chamar função original de feedback passada como prop
    handleFeedback(messageId, feedbackType);
  };

  // Função para lidar com seleção de documento
  const handleDocumentSelect = (docId) => {
    setSelectedDocument(docId);
    setShowDocumentSelector(false);
  };

  // Função para mostrar/esconder o seletor de documentos
  const toggleDocumentSelector = () => {
    setShowDocumentSelector(!showDocumentSelector);
  };

  // Função para alterar documento
  const handleChangeDocument = () => {
    setShowDocumentSelector(true);
  };

  // Função personalizada para enviar mensagem com documento selecionado
  const handleSendMessageWithDocument = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const questionToSend = currentMessage;
    setCurrentMessage('');
    setSuggestions([]);

    // Cria mensagem do usuário
    const newUserMessage = {
      id: chatMessages.length + 1,
      text: questionToSend,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString(),
      sources: []
    };

    setChatMessages((prevMessages) => [...prevMessages, newUserMessage]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          question: questionToSend,
          selected_document: selectedDocument
        }),
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
    }
  };

  // Permite envio de mensagem com tecla Enter usando nova função
  const handleKeyDownWithDocument = (event) => {
    if (event.key === 'Enter' && !isLoading) {
      handleSendMessageWithDocument();
    }
  };

  return (
    <div className="chat-container">
      {/* Cabeçalho da aplicação de chat */}
      <header className="chat-header">
        <div className="header-content">
          {/* Lado esquerdo: Logo e informações do sistema */}
          <div className="header-left">
            <div className="header-logo">
              <MessageSquare size={24} />
            </div>
            <div className="header-text">
              <h1 className="header-title">Sistema de Consultas UFMA</h1>
              <p className="header-subtitle">Consultas Inteligentes via LLM</p>
            </div>
          </div>

          {/* Lado direito: Navegação e informações do usuário */}
          <div className="header-right">
            {/* Botão para acessar histórico de conversas */}
            <button
              onClick={() => setCurrentView('history')}
              className="header-button"
              title="Ver Histórico"
            >
              <History size={20} />
            </button>

            {/* Botão de solicitação de admin - apenas para usuários não-admin */}
            {!user?.isAdmin && user?.email !== 'admin@ufma.br' && (
              <AdminRequestButton 
                user={user} 
                API_BASE_URL={API_BASE_URL}
              />
            )}

            {/* Botão Admin - renderizado condicionalmente apenas para administradores */}
            {(user?.isAdmin || user?.email === 'admin@ufma.br') && (
              <button
                onClick={() => setCurrentView('admin')}
                className="header-button admin-button"
                title="Painel Administrativo"
              >
                <Shield size={20} />
              </button>
            )}

            {/* Seção de informações do usuário logado */}
            <div className="user-info">
              {/* Avatar gerado dinamicamente com fallback */}
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name || user?.email || 'User')}&backgroundColor=2563eb&radius=50`}
                alt="Avatar do usuário" 
                className="user-avatar"
                onError={(e) => {
                  // Fallback para outro serviço de avatar em caso de erro
                  e.target.src = `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(user?.name || user?.email || 'User')}&backgroundColor=2563eb`;
                }}
              />
              <div className="user-details">
                <div className="user-name">
                  {user?.name || user?.username || user?.email?.split('@')[0] || 'Usuário'}
                </div>
                <div className="user-role">
                  {user?.isAdmin ? 'Administrador' : 'Usuário'}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="header-button"
                title="Sair"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Área principal do chat */}
      <main className="chat-main">
        <div className="chat-messages">
          {/* Tela de boas-vindas com sugestões iniciais - mostrada quando não há mensagens */}
          {chatMessages.length === 0 && !isLoading && (
            <div className="welcome-suggestions">
              <div className="welcome-message">
                <h3>👋 Bem-vindo ao Sistema de Consultas UFMA!</h3>
                <p>Faça perguntas sobre regulamentos e documentos da universidade. Primeiro, escolha em qual documento deseja buscar ou consulte todos:</p>
              </div>
              
              {/* Seletor de documentos */}
              <DocumentSelector
                selectedDocument={selectedDocument}
                onDocumentSelect={handleDocumentSelect}
                API_BASE_URL={API_BASE_URL}
              />
              
              <div className="initial-suggestions">
                <h4 style={{ margin: '1.5rem 0 1rem 0', textAlign: 'center', color: '#374151', fontSize: '1rem' }}>
                  Sugestões para começar:
                </h4>
                {quickSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentMessage(suggestion);
                      setSuggestions([]);
                    }}
                    className="initial-suggestion-item"
                  >
                    <Zap size={16} className="suggestion-icon" />
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Renderização das mensagens do chat */}
          {chatMessages.map((message) => (
            <div key={message.id} className={`chat-message ${message.sender}`}>
              <div className="message-content">
                {/* Indicador de erro para mensagens com problemas */}
                {message.isError && (
                  <div className="error-indicator" title="Ocorreu um erro">
                    <AlertTriangle size={16} />
                  </div>
                )}
                <p>{message.text}</p>

                {/* Seção de fontes consultadas para respostas do bot */}
                {message.sender === 'bot' && message.sources && message.sources.length > 0 && (
                  <div className="message-sources">
                    <h4>Fontes Consultadas:</h4>
                    <ul>
                      {message.sources.map((source, index) => (
                        <li key={index} className="source-item">
                          <FileText size={14} className="source-icon" />
                          <strong className="source-filename">{source.filename}</strong>
                          {source.content && (
                            <span className="source-content-snippet">
                              : "{source.content.substring(0, 150)}..."
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Ações disponíveis para as mensagens */}
                <div className="message-actions">
                  {/* Botões de feedback apenas para mensagens do bot */}
                  {message.sender === 'bot' && (
                    <>
                      <button
                        onClick={() => handleFeedbackWithState(message.id, 'positive')}
                        className={`feedback-button ${messageFeedback[message.id] === 'positive' ? 'feedback-active-positive' : ''}`}
                        title="Útil"
                      >
                        <ThumbsUp size={16} />
                      </button>
                      <button
                        onClick={() => handleFeedbackWithState(message.id, 'negative')}
                        className={`feedback-button ${messageFeedback[message.id] === 'negative' ? 'feedback-active-negative' : ''}`}
                        title="Não útil"
                      >
                        <ThumbsDown size={16} />
                      </button>
                      <button
                        onClick={() => copyToClipboard(message.text)}
                        className="copy-button"
                        title="Copiar texto"
                      >
                        <Copy size={16} />
                      </button>
                    </>
                  )}
                  <span className="message-timestamp">{message.timestamp}</span>
                </div>

                {/* Disclaimer sobre possíveis erros do AI - apenas para mensagens do bot */}
                {message.sender === 'bot' && (
                  <div className="message-disclaimer">
                    <span>O ConsultAI pode cometer erros. Confira sempre as respostas.</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Indicador de carregamento quando o bot está processando */}
          {isLoading && (
            <div className="chat-message bot loading-message">
              <div className="message-content">
                <div className="spinner"></div>
                <p>Digitando...</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Área de entrada de chat com sugestões e input */}
      <div className="chat-input-area">
        {/* Seletor de documentos expansível */}
        {showDocumentSelector && (
          <DocumentSelector
            selectedDocument={selectedDocument}
            onDocumentSelect={handleDocumentSelect}
            API_BASE_URL={API_BASE_URL}
          />
        )}

        {/* Indicador do documento selecionado com botões melhorados */}
        {selectedDocument && selectedDocument !== 'all' ? (
          <div className="selected-document-indicator">
            <FileText size={14} />
            <span>Consultando: {selectedDocument.replace('.pdf', '')}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={handleChangeDocument}
                className="change-document-button"
                title="Escolher outro documento"
              >
                Alterar
              </button>
              
<button 
  onClick={() => setSelectedDocument('all')} 
  className="change-document-button" 
  title="Voltar para todos os documentos" 
  style={{ 
    backgroundColor: '#6b7280', 
    borderColor: '#6b7280', 
    color: 'white',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease'
  }}
  onMouseEnter={(e) => {
    e.target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    e.target.style.transform = 'translateY(-1px)';
    e.target.style.backgroundColor = '#4b5563';
  }}
  onMouseLeave={(e) => {
    e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.1)';
    e.target.style.transform = 'translateY(0)';
    e.target.style.backgroundColor = '#6b7280';
  }}
>
  Remover
</button>
            </div>
          </div>
        ) : (
          /* Botão para abrir seletor quando nenhum documento específico está selecionado */
          <div className="selected-document-indicator">
            <FileText size={14} />
            <span>Consultando todos os documentos</span>
            <button 
              onClick={toggleDocumentSelector}
              className="change-document-button"
              title="Escolher documento específico"
            >
              Escolher Documento
            </button>
          </div>
        )}

        {/* Container de sugestões contextuais - mostrado quando há sugestões disponíveis */}
        {suggestions.length > 0 && (
          <div className="suggestions-container">
            <div className="suggestions-list">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentMessage(suggestion);
                    setSuggestions([]);
                  }}
                  className="suggestion-item"
                >
                  <span className="suggestion-item-text">
                    <Zap size={14} className="suggestion-icon" />
                    {suggestion}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Container principal do input de mensagem */}
        <div className="input-container">
          <div className="input-wrapper">
            <input
              type="text"
              value={currentMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDownWithDocument}
              placeholder="Digite sua pergunta sobre os documentos da UFMA..."
              className="chat-input"
              disabled={isLoading}
            />
          </div>

          {/* Botão de enviar mensagem */}
          <button
            onClick={handleSendMessageWithDocument}
            disabled={isLoading || !currentMessage.trim()}
            className="send-button"
          >
            {isLoading ? (
              <div className="spinner-white"></div>
            ) : (
              <Send size={24} />
            )}
          </button>
        </div>

        {/* Dica de uso para o usuário */}
        <div className="input-tip">
          <span>
            {selectedDocument === 'all' 
              ? 'Consultando todos os documentos disponíveis' 
              : `Consultando: ${selectedDocument?.replace('.pdf', '') || 'documento selecionado'}`
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatView;