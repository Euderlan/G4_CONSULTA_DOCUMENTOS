import React, { useState } from 'react';
import { History, LogOut, Clock, MessageSquare, Zap, FileText, Copy } from 'lucide-react';
import './HistoryView.css';

const HistoryView = ({
  setCurrentView,
  userHistory,
  handleLogout,
  copyToClipboard
}) => {
  const [expandedItems, setExpandedItems] = useState(new Set());

  const toggleExpanded = (index) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="history-container">
      <header className="history-header">
        <div className="history-header-content">
          <div className="history-header-left">
            <button
              onClick={() => setCurrentView('chat')}
              className="back-button"
            >
              ← Voltar ao Chat
            </button>
            <h1 className="history-title">
              <History className="history-icon" />
              Histórico de Consultas
            </h1>
          </div>
          
          <button
            onClick={handleLogout}
            className="header-button"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="history-content">
        {userHistory.length === 0 ? (
          <div className="empty-history">
            <Clock className="empty-history-icon" />
            <h3 className="empty-history-title">Nenhuma consulta realizada</h3>
            <p className="empty-history-text">
              Suas consultas anteriores aparecerão aqui para fácil acesso e referência.
            </p>
          </div>
        ) : (
          <div className="history-list">
            {userHistory.map((item, index) => (
              <div key={index} className="history-item">
                <div 
                  className="history-item-header"
                  onClick={() => toggleExpanded(index)}
                >
                  <div className="history-item-content">
                    <div className="history-item-meta">
                      <div className="history-item-icon">
                        <MessageSquare size={16} />
                      </div>
                      <h3 className="history-item-label">Pergunta:</h3>
                      <div className="history-item-time">
                        {item.timestamp.toLocaleString()}
                      </div>
                    </div>
                    <p className="history-item-question">{item.question}</p>
                  </div>
                  <div className="expand-icon">
                    {expandedItems.has(index) ? '−' : '+'}
                  </div>
                </div>
                
                {expandedItems.has(index) && (
                  <div className="history-item-expanded">
                    <div className="history-answer">
                      <div className="history-answer-header">
                        <div className="history-answer-icon">
                          <Zap size={16} />
                        </div>
                        <h3 className="history-answer-label">Resposta:</h3>
                      </div>
                      <div className="history-answer-text">
                        {item.answer}
                      </div>
                      
                      <div className="history-answer-footer">
                        <div className="history-source">
                          <FileText className="source-icon" />
                          <span>{item.source}</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(item.answer)}
                          className="copy-button"
                        >
                          <Copy className="copy-icon" />
                          Copiar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;