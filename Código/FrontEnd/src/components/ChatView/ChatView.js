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
  FileText,
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
            
            {user?.isAdmin && (
              <button
                onClick={() => setCurrentView('admin')}
                className="header-button admin-button"
                title="Painel Admin"
              >
                <Shield size={20} />
              </button>
            )}
            
            <div className="user-info">
              <img 
                src={user?.avatar} 
                alt="Avatar" 
                className="user-avatar"
              />
              <div className="user-details">
                <div className="user-name">{user?.username}</div>
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

      {/* Chat Messages */}
      <div className="chat-messages">
        {chatMessages.length === 0 && (
          <div className="welcome-container">
            <div className="welcome-icon">
              <Zap size={32} />
            </div>
            <h3 className="welcome-title">Bem-vindo ao Sistema de Consultas</h3>
            <p className="welcome-text">
              Faça perguntas sobre a RESOLUÇÃO Nº 1892-CONSEPE das Normas Regulamentadoras dos Cursos de Graduação da UFMA. 
              Nossa IA está pronta para ajudar com informações precisas e atualizadas.
            </p>
            
            {/* Sugestões rápidas */}
            <div className="suggestions-container">
              <h4 className="suggestions-title">💡 Perguntas populares:</h4>
              <div className="suggestions-grid">
                {quickSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentMessage(suggestion)}
                    className="suggestion-button"
                  >
                    <span className="suggestion-text">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {chatMessages.map((message) => (
          <div key={message.id} className={`message ${message.type === 'user' ? 'message-user' : 'message-bot'}`}>
            <div className={`message-content ${message.type === 'user' ? 'message-content-user' : 'message-content-bot'}`}>
              {message.type === 'user' ? (
                <div>
                  <div className="user-message-header">
                    <img src={user?.avatar} alt="User" className="message-avatar" />
                    <span className="message-sender">Você</span>
                  </div>
                  <div className="message-text">{message.content}</div>
                </div>
              ) : (
                <div>
                  <div className="bot-message-header">
                    <div className="bot-avatar">
                      <Zap size={16} />
                    </div>
                    <span className="bot-name">UFMA Assistant</span>
                    
                    <div className="message-actions">
                      <button
                        onClick={() => copyToClipboard(message.content)}
                        className="action-button"
                        title="Copiar resposta"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="bot-message-body">
                    <div className="bot-message-text">
                      {message.content}
                    </div>
                  </div>
                  
                  <div className="message-footer">
                    <div className="message-info">
                      <div className="message-source">
                        <FileText className="source-icon" />
                        <span>Fonte: {message.source}</span>
                      </div>
                      <div className="message-time">
                        <Clock className="time-icon" />
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    
                    <div className="feedback-section">
                      <div className="feedback-buttons">
                        <span className="feedback-label">Esta resposta foi útil?</span>
                        <button
                          onClick={() => handleFeedback(message.id, 'positive')}
                          className={`feedback-button ${message.feedback === 'positive' ? 'feedback-positive' : 'feedback-neutral'}`}
                          title="Resposta útil"
                        >
                          <ThumbsUp size={16} />
                        </button>
                        <button
                          onClick={() => handleFeedback(message.id, 'negative')}
                          className={`feedback-button ${message.feedback === 'negative' ? 'feedback-negative' : 'feedback-neutral'}`}
                          title="Resposta não útil"
                        >
                          <ThumbsDown size={16} />
                        </button>
                      </div>
                      
                      <button
                        onClick={() => reportError(message.id)}
                        className={`report-button ${message.reported ? 'report-active' : 'report-inactive'}`}
                      >
                        <AlertTriangle size={12} className="report-icon" />
                        {message.reported ? 'Erro reportado' : 'Reportar erro'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message message-bot">
            <div className="loading-message">
              <div className="loading-message-content">
                <div className="bot-avatar">
                  <div className="spinner-white"></div>
                </div>
                <div>
                  <div className="bot-name">UFMA Assistant</div>
                  <div className="loading-text">Analisando sua consulta...</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        {/* Sugestões dinâmicas */}
        {suggestions.length > 0 && (
          <div className="suggestions-popup">
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
                  <span className="suggestion-item-text">{suggestion}</span>
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
          <span>💡 Dica: Use perguntas específicas para obter melhores respostas</span>
        </div>
      </div>
    </div>
  );
};

export default ChatView;