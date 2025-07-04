import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Clock, User, RefreshCw } from 'lucide-react';
import './AdminRequestsPanel.css'; // Importa os estilos específicos do painel

// Componente principal que recebe a URL base da API como prop
const AdminRequestsPanel = ({ API_BASE_URL }) => {
  // Estados para armazenar as solicitações, estado de carregamento e os IDs em processamento
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());

  // useEffect para carregar as solicitações ao montar o componente
  useEffect(() => {
    fetchRequests();
  }, []);

  // Busca as solicitações de admin na API
  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token'); // Recupera token do localStorage
      const response = await fetch(`${API_BASE_URL}/api/admin-requests/requests`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Se a resposta for bem-sucedida, atualiza o estado com as solicitações
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      } else {
        console.error('Erro ao buscar solicitações');
      }
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Aprova ou nega uma solicitação
  const handleReviewRequest = async (requestId, action) => {
    setProcessingIds(prev => new Set(prev).add(requestId)); // Marca como em processamento

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin-requests/requests/${requestId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action }) // Corpo da requisição define a ação
      });

      const data = await response.json();

      if (response.ok) {
        const actionText = action === 'approve' ? 'aprovada' : 'negada';
        alert(`✅ Solicitação ${actionText} com sucesso!`);

        // Remove a solicitação da lista local
        setRequests(prev => prev.filter(req => req.id !== requestId));
      } else {
        alert('Erro: ' + (data.detail || 'Falha ao processar solicitação'));
      }
    } catch (error) {
      console.error('Erro ao processar solicitação:', error);
      alert('Erro de conexão. Tente novamente.');
    } finally {
      // Remove o ID da lista de processamento
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  // Formata a data no estilo brasileiro (dd/mm/yyyy hh:mm)
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Exibe o estado de carregamento se necessário
  if (isLoading) {
    return (
      <div className="requests-panel loading">
        <div className="loading-spinner"></div>
        <p>Carregando solicitações...</p>
      </div>
    );
  }

  // Renderização principal do painel
  return (
    <div className="admin-requests-panel">
      <div className="panel-header">
        {/* Título do painel com ícone e contador de solicitações */}
        <div className="panel-title">
          <Shield size={20} />
          <h3>Solicitações de Admin</h3>
          <span className="badge">{requests.length}</span>
        </div>

        {/* Botão de recarregar as solicitações */}
        <button 
          onClick={fetchRequests}
          className="refresh-button"
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
        </button>
      </div>

      <div className="panel-content">
        {requests.length === 0 ? (
          // Caso não haja solicitações pendentes
          <div className="empty-state">
            <Clock size={48} />
            <h4>Nenhuma solicitação pendente</h4>
            <p>Todas as solicitações foram processadas.</p>
          </div>
        ) : (
          // Lista de solicitações pendentes
          <div className="requests-list">
            {requests.map((request) => (
              <div key={request.id} className="request-card">
                {/* Cabeçalho com informações do usuário e data */}
                <div className="request-header">
                  <div className="user-info">
                    <User size={20} className="user-icon" />
                    <div className="user-details">
                      <h4>{request.user_name}</h4>
                      <p>{request.user_email}</p>
                    </div>
                  </div>
                  <div className="request-date">
                    <Clock size={14} />
                    {formatDate(request.requested_at)}
                  </div>
                </div>

                {/* Justificativa da solicitação */}
                <div className="request-reason">
                  <h5>Justificativa:</h5>
                  <p>{request.reason}</p>
                </div>

                {/* Botões de ação (negar/aprovar) */}
                <div className="request-actions">
                  <button
                    onClick={() => handleReviewRequest(request.id, 'deny')}
                    disabled={processingIds.has(request.id)}
                    className="deny-button"
                  >
                    {processingIds.has(request.id) ? (
                      <div className="button-spinner"></div>
                    ) : (
                      <XCircle size={16} />
                    )}
                    Negar
                  </button>

                  <button
                    onClick={() => handleReviewRequest(request.id, 'approve')}
                    disabled={processingIds.has(request.id)}
                    className="approve-button"
                  >
                    {processingIds.has(request.id) ? (
                      <div className="button-spinner"></div>
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    Aprovar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRequestsPanel; // Exporta o componente para uso em outras partes do app
