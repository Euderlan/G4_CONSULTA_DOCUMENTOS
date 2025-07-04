// components/AdminRequestButton/AdminRequestButton.js
import React, { useState, useEffect } from 'react';
import { Shield, Send, Clock, CheckCircle, XCircle } from 'lucide-react';
import './AdminRequestButton.css';

const AdminRequestButton = ({ user, API_BASE_URL }) => {
  // Estados do componente
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userRequest, setUserRequest] = useState(null);
  
  // Verifica se usuário já tem solicitação ao montar componente
  useEffect(() => {
    checkUserRequest();
  }, []);

  // Função para verificar se usuário já tem solicitação
  const checkUserRequest = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin-requests/my-request`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.has_request) {
          setUserRequest(data.request);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar solicitação:', error);
    }
  };

  // Função para enviar solicitação
  const handleSubmitRequest = async () => {
    if (!reason.trim() || reason.trim().length < 10) {
      alert('A justificativa deve ter pelo menos 10 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin-requests/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reason.trim() })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('✅ Solicitação enviada com sucesso! Aguarde a análise do administrador.');
        setShowModal(false);
        setReason('');
        // Atualiza estado local
        await checkUserRequest();
      } else {
        alert('Erro: ' + (data.detail || 'Falha ao enviar solicitação'));
      }
    } catch (error) {
      console.error('Erro ao enviar solicitação:', error);
      alert('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para obter ícone baseado no status
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock size={16} className="status-icon pending" />;
      case 'approved': return <CheckCircle size={16} className="status-icon approved" />;
      case 'denied': return <XCircle size={16} className="status-icon denied" />;
      default: return null;
    }
  };

  // Função para obter texto do status
  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'approved': return 'Aprovada';
      case 'denied': return 'Negada';
      default: return 'Desconhecido';
    }
  };

  // Não mostra nada se usuário já é admin
  if (user?.isAdmin) {
    return null;
  }

  return (
    <>
      {/* Botão principal */}
      {!userRequest ? (
        <button
          onClick={() => setShowModal(true)}
          className="admin-request-button"
          title="Solicitar privilégios de administrador"
        >
          <Shield size={16} />
          <span className="request-text">Solicitar Admin</span>
        </button>
      ) : (
        /* Status da solicitação */
        <div className="request-status">
          {getStatusIcon(userRequest.status)}
          <span className="status-text">
            Admin: {getStatusText(userRequest.status)}
          </span>
        </div>
      )}

      {/* Modal de solicitação */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                <Shield size={20} />
                Solicitar Privilégios de Administrador
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="modal-close"
                disabled={isLoading}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <p className="modal-description">
                Por favor, justifique por que você precisa de privilégios de administrador. 
                Sua solicitação será analisada por um administrador atual.
              </p>
              
              <div className="form-group">
                <label className="form-label">Justificativa *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="form-textarea"
                  rows="4"
                  placeholder="Ex: Sou responsável pelo departamento X e preciso gerenciar documentos relacionados aos cursos..."
                  disabled={isLoading}
                />
                <div className="char-counter">
                  {reason.length}/500 caracteres (mínimo 10)
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={() => setShowModal(false)}
                className="cancel-button"
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSubmitRequest}
                className="submit-button"
                disabled={isLoading || reason.trim().length < 10}
              >
                {isLoading ? (
                  <>
                    <div className="spinner"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Enviar Solicitação
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminRequestButton;