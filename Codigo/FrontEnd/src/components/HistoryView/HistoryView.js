import React, { useState } from 'react';
import { History, LogOut, Clock, MessageSquare, Zap, FileText, Copy } from 'lucide-react';
import './HistoryView.css';
 
const HistoryView = ({
  setCurrentView,
  userHistory,
  handleLogout,
  copyToClipboard
}) => {
  // Estado para controlar quais itens do histórico estão expandidos
  // Usa Set para armazenar os índices dos itens expandidos de forma eficiente
  const [expandedItems, setExpandedItems] = useState(new Set());
 
  // Função para alternar a expansão de um item específico do histórico
  const toggleExpanded = (index) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      // Se o item já está expandido, remove da lista
      newExpanded.delete(index);
    } else {
      // Se o item não está expandido, adiciona à lista
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };
 
  return (
    <div className="history-container">
      {/* Cabeçalho da página de histórico */}
      <header className="history-header">
        <div className="history-header-content">
          <div className="history-header-left">
            {/* Botão para voltar ao chat principal */}
            <button
              onClick={() => setCurrentView('chat')}
              className="back-button"
            >
              ← Voltar ao Chat
            </button>
            {/* Título da página com ícone */}
            <h1 className="history-title">
              <History className="history-icon" />
              Histórico de Consultas
            </h1>
          </div>
          
          {/* Botão de logout no canto superior direito */}
          <button
            onClick={handleLogout}
            className="header-button"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>
 
      {/* Conteúdo principal da página */}
      <div className="history-content">
        {/* Estado vazio: mostrado quando não há histórico disponível */}
        {!userHistory || userHistory.length === 0 ? (
          <div className="empty-history">
            <Clock className="empty-history-icon" />
            <h3 className="empty-history-title">Nenhuma consulta realizada</h3>
            <p className="empty-history-text">
              Suas consultas anteriores aparecerão aqui para fácil acesso e referência.
            </p>
          </div>
        ) : (
          /* Lista de itens do histórico quando há dados disponíveis */
          <div className="history-list">
            {userHistory.map((item, index) => (
              <div key={index} className="history-item">
                {/* Cabeçalho do item - sempre visível e clicável para expandir */}
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
                    </div>
                    {/* Exibe a pergunta do usuário com fallback */}
                    <p className="history-item-question">{item.question || 'Pergunta não disponível'}</p>
                  </div>
                  {/* Indicador visual de expansão/colapso */}
                  <div className="expand-icon">
                    {expandedItems.has(index) ? '−' : '+'}
                  </div>
                </div>
                
                {/* Conteúdo expandido - mostrado apenas quando o item está expandido */}
                {expandedItems.has(index) && (
                  <div className="history-item-expanded">
                    <div className="history-answer">
                      {/* Cabeçalho da resposta */}
                      <div className="history-answer-header">
                        <div className="history-answer-icon">
                          <Zap size={16} />
                        </div>
                        <h3 className="history-answer-label">Resposta:</h3>
                      </div>
                      {/* Texto da resposta com fallback */}
                      <div className="history-answer-text">
                        {item.answer || 'Resposta não disponível'}
                      </div>
                      
                      {/* Rodapé com informações adicionais e ações */}
                      <div className="history-answer-footer">
                        {/* Informação sobre a fonte da resposta */}
                        <div className="history-source">
                          <FileText className="source-icon" />
                          <span>{item.source || 'Fonte não disponível'}</span>
                        </div>
                        {/* Botão para copiar a resposta */}
                        <button
                          onClick={() => copyToClipboard(item.answer || '')}
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