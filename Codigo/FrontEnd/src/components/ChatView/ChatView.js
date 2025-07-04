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
  API_BASE_URL  //  prop necessária para AdminRequestButton
}) => {
  // Estado local para rastrear feedback dado pelo usuário em cada mensagem
  const [messageFeedback, setMessageFeedback] = useState({});

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
                <p>Faça perguntas sobre regulamentos e documentos da universidade. Aqui estão algumas sugestões para começar:</p>
              </div>
              <div className="initial-suggestions">
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
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta sobre os documentos da UFMA..."
              className="chat-input"
              disabled={isLoading}
            />
          </div>

          {/* Botão de enviar mensagem */}
          <button
            onClick={handleSendMessage}
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
          <span>Dica: Use perguntas específicas para obter melhores respostas</span>
        </div>
      </div>
    </div>
  );
};

export default ChatView;