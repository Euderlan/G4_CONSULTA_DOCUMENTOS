import React from 'react';
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
  FileText, // <-- Importe FileText aqui para o ícone das fontes
  Clock
} from 'lucide-react';
import './ChatView.css';

const ChatView = ({
  user,
  setCurrentView,
  chatMessages,
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
  setSuggestions
}) => {
  return (
    <div className="chat-container">
      {/* Header */}
      <header className="chat-header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-logo">
              <MessageSquare size={24} />
            </div>
            <div className="header-text">
              <h1 className="header-title">Sistema de Consultas UFMA</h1>
              <p className="header-subtitle">{documentVersion}</p>
            </div>
          </div>

          <div className="header-right">
            <button
              onClick={() => setCurrentView('history')}
              className="header-button"
              title="Ver Histórico"
            >
              <History size={20} />
            </button>

            {/* Renderiza o botão Admin apenas se o usuário for admin */}
            {user?.isAdmin && (
              <button
                onClick={() => setCurrentView('admin')}
                className="header-button"
                title="Administração"
              >
                <Shield size={20} />
              </button>
            )}

            <button
              onClick={handleLogout}
              className="header-button"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="chat-main">
        <div className="chat-messages">
          {chatMessages.map((message) => (
            <div key={message.id} className={`chat-message ${message.sender}`}>
              <div className="message-content">
                {message.isError && (
                  <div className="error-indicator" title="Ocorreu um erro">
                    <AlertTriangle size={16} />
                  </div>
                )}
                <p>{message.text}</p>

                {/* --- NOVA SEÇÃO PARA EXIBIR FONTES --- */}
                {message.sender === 'bot' && message.sources && message.sources.length > 0 && (
                  <div className="message-sources">
                    <h4>Fontes Consultadas:</h4>
                    <ul>
                      {message.sources.map((source, index) => (
                        <li key={index} className="source-item">
                          <FileText size={14} className="source-icon" />
                          <strong>{source.filename}</strong>
                          {source.content && ( // Opcional: exibe um snippet do conteúdo
                            <span className="source-content-snippet">
                              : "{source.content.substring(0, 150)}..."
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* --- FIM DA NOVA SEÇÃO --- */}

                <div className="message-actions">
                  {message.sender === 'bot' && (
                    <>
                      <button
                        onClick={() => handleFeedback(message.id, 'positive')}
                        className="feedback-button"
                        title="Útil"
                      >
                        <ThumbsUp size={16} />
                      </button>
                      <button
                        onClick={() => handleFeedback(message.id, 'negative')}
                        className="feedback-button"
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
              </div>
            </div>
          ))}
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

      {/* Chat Input Area */}
      <div className="chat-input-area">
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

        <div className="input-container">
          <div className="input-wrapper">
            <input
              type="text"
              value={currentMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta sobre a RESOLUÇÃO Nº 1892-CONSEPE..."
              className="chat-input"
              disabled={isLoading}
            />
          </div>

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

        <div className="input-tip">
          <span> Dica: Use perguntas específicas para obter melhores respostas</span>
        </div>
      </div>
    </div>
  );
};

export default ChatView;