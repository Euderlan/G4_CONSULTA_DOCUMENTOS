// components/AdminRequestsPanel/AdminRequestsPanel.js
import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Clock, User, RefreshCw } from 'lucide-react';
import './AdminRequestsPanel.css';

const AdminRequestsPanel = ({ API_BASE_URL }) => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());

  // Carrega solicitações ao montar componente
  useEffect(() => {
    fetchRequests();
  }, []);

  // Função para buscar solicitações pendentes
  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin-requests/requests`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

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

  // Função para aprovar/negar solicitação
  const handleReviewRequest = async (requestId, action) => {
    setProcessingIds(prev => new Set(prev).add(requestId));
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin-requests/requests/${requestId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      const data = await response.json();
      
      if (response.ok) {
        const actionText = action === 'approve' ? 'aprovada' : 'negada';
        alert(`✅ Solicitação ${actionText} com sucesso!`);
        
        // Remove da lista local (já que foi processada)
        setRequests(prev => prev.filter(req => req.id !== requestId));
      } else {
        alert('Erro: ' + (data.detail || 'Falha ao processar solicitação'));
      }
    } catch (error) {
      console.error('Erro ao processar solicitação:', error);
      alert('Erro de conexão. Tente novamente.');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  // Função para formatar data
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="requests-panel loading">
        <div className="loading-spinner"></div>
        <p>Carregando solicitações...</p>
      </div>
    );
  }

  return (
    <div className="admin-requests-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Shield size={20} />
          <h3>Solicitações de Admin</h3>
          <span className="badge">{requests.length}</span>
        </div>
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
          <div className="empty-state">
            <Clock size={48} />
            <h4>Nenhuma solicitação pendente</h4>
            <p>Todas as solicitações foram processadas.</p>
          </div>
        ) : (
          <div className="requests-list">
            {requests.map((request) => (
              <div key={request.id} className="request-card">
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
                
                <div className="request-reason">
                  <h5>Justificativa:</h5>
                  <p>{request.reason}</p>
                </div>
                
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

export default AdminRequestsPanel;