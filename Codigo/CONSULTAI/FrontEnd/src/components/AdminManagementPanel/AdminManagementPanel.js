import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  UserPlus, 
  UserMinus, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Crown,
  Activity,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
  UserCheck
} from 'lucide-react';
import './AdminManagementPanel.css';

const AdminManagementPanel = ({ API_BASE_URL, currentUser }) => {
  // Estados do componente
  const [admins, setAdmins] = useState([]);
  const [nonAdminUsers, setNonAdminUsers] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('admins'); // 'admins', 'promote', 'activity'
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'promote', 'suspend', 'remove', 'reactivate'
  const [actionReason, setActionReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  // Carrega dados ao montar componente
  useEffect(() => {
    loadAllData();
  }, []);

  // Função para carregar todos os dados
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadAdmins(),
        loadNonAdminUsers(),
        loadActivityLog()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Carrega lista de administradores
  const loadAdmins = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin-management/admins`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAdmins(data.admins || []);
      } else {
        console.error('Erro ao carregar admins');
      }
    } catch (error) {
      console.error('Erro ao carregar admins:', error);
    }
  };

  // Carrega lista de usuários não-admin
  const loadNonAdminUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin-management/users/non-admin`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNonAdminUsers(data.users || []);
      } else {
        console.error('Erro ao carregar usuários não-admin');
      }
    } catch (error) {
      console.error('Erro ao carregar usuários não-admin:', error);
    }
  };

  // Carrega log de atividades
  const loadActivityLog = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin-management/activity-log`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActivityLog(data.activities || []);
      } else {
        console.error('Erro ao carregar log de atividades');
      }
    } catch (error) {
      console.error('Erro ao carregar log:', error);
    }
  };

  // Abre modal para diferentes ações
  const openModal = (type, user = null) => {
    setModalType(type);
    setSelectedUser(user);
    setActionReason('');
    setShowModal(true);
  };

  // Fecha modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setActionReason('');
    setModalType('');
  };

  // Promove usuário a admin
  const promoteUser = async () => {
    if (!selectedUser || !actionReason.trim()) {
      alert('Por favor, forneça uma justificativa para a promoção');
      return;
    }

    setProcessingAction(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin-management/promote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_email: selectedUser.email,
          reason: actionReason.trim()
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(` ${selectedUser.name} foi promovido a administrador com sucesso!`);
        closeModal();
        await loadAllData();
      } else {
        alert('Erro: ' + (data.detail || 'Falha ao promover usuário'));
      }
    } catch (error) {
      console.error('Erro ao promover usuário:', error);
      alert('Erro de conexão. Tente novamente.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Gerencia admin (suspender, reativar, remover)
  const manageAdmin = async (action) => {
    if (!selectedUser) return;

    if ((action === 'suspend' || action === 'remove') && !actionReason.trim()) {
      alert('Por favor, forneça uma justificativa para esta ação');
      return;
    }

    setProcessingAction(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin-management/manage/${selectedUser.email}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: action,
          reason: actionReason.trim() || null
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        let successMessage = '';
        switch (action) {
          case 'suspend':
            successMessage = `${selectedUser.name} foi suspenso com sucesso`;
            break;
          case 'reactivate':
            successMessage = `${selectedUser.name} foi reativado com sucesso`;
            break;
          case 'remove':
            successMessage = `Privilégios de admin removidos de ${selectedUser.name}`;
            break;
        }
        
        alert(` ${successMessage}!`);
        closeModal();
        await loadAllData();
      } else {
        alert('Erro: ' + (data.detail || 'Falha ao executar ação'));
      }
    } catch (error) {
      console.error('Erro ao gerenciar admin:', error);
      alert('Erro de conexão. Tente novamente.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Função para obter ícone do status
  const getStatusIcon = (status, adminType) => {
    if (adminType === 'super') {
      return <Crown size={16} className="status-icon super" />;
    }
    
    switch (status) {
      case 'active': return <CheckCircle size={16} className="status-icon active" />;
      case 'suspended': return <AlertTriangle size={16} className="status-icon suspended" />;
      default: return <XCircle size={16} className="status-icon inactive" />;
    }
  };

  // Função para obter texto do status
  const getStatusText = (status, adminType) => {
    if (adminType === 'super') return 'Super Admin';
    
    switch (status) {
      case 'active': return 'Ativo';
      case 'suspended': return 'Suspenso';
      default: return 'Inativo';
    }
  };

  // Função para obter ícone da atividade
  const getActivityIcon = (type) => {
    switch (type) {
      case 'promotion': return <UserPlus size={16} className="activity-icon promotion" />;
      case 'demotion': return <UserMinus size={16} className="activity-icon demotion" />;
      case 'suspension': return <EyeOff size={16} className="activity-icon suspension" />;
      case 'reactivation': return <Eye size={16} className="activity-icon reactivation" />;
      default: return <Activity size={16} className="activity-icon default" />;
    }
  };

  // Formata data/hora
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Verifica se é super admin
  const isSuperAdmin = currentUser?.email === 'admin@ufma.br';

  if (!isSuperAdmin) {
    return (
      <div className="access-denied">
        <Shield size={48} />
        <h3>Acesso Negado</h3>
        <p>Apenas o administrador principal pode gerenciar outros administradores.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="admin-management-loading">
        <div className="loading-spinner"></div>
        <p>Carregando gerenciamento de administradores...</p>
      </div>
    );
  }

  return (
    <div className="admin-management-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title">
          <Shield size={24} />
          <h2>Gerenciamento de Administradores</h2>
        </div>
        <button 
          onClick={loadAllData}
          className="refresh-button"
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
          Atualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button
          onClick={() => setActiveTab('admins')}
          className={`tab-button ${activeTab === 'admins' ? 'active' : ''}`}
        >
          <Users size={16} />
          Administradores ({admins.length})
        </button>
        <button
          onClick={() => setActiveTab('promote')}
          className={`tab-button ${activeTab === 'promote' ? 'active' : ''}`}
        >
          <UserPlus size={16} />
          Promover Usuário ({nonAdminUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
        >
          <Activity size={16} />
          Log de Atividades ({activityLog.length})
        </button>
      </div>

      {/* Content */}
      <div className="panel-content">
        {/* Tab: Administradores */}
        {activeTab === 'admins' && (
          <div className="admins-tab">
            {admins.length === 0 ? (
              <div className="empty-state">
                <Users size={48} />
                <h4>Nenhum administrador encontrado</h4>
              </div>
            ) : (
              <div className="admins-grid">
                {admins.map((admin) => (
                  <div key={admin.id} className={`admin-card ${admin.status || 'active'}`}>
                    <div className="admin-header">
                      <div className="admin-info">
                        <h4>{admin.name}</h4>
                        <p>{admin.email}</p>
                      </div>
                      <div className="admin-status">
                        {getStatusIcon(admin.status, admin.admin_type)}
                        <span>{getStatusText(admin.status, admin.admin_type)}</span>
                      </div>
                    </div>
                    
                    <div className="admin-details">
                      <div className="detail-item">
                        <span className="label">Criado em:</span>
                        <span className="value">{formatDateTime(admin.created_at)}</span>
                      </div>
                      {admin.promoted_at && (
                        <div className="detail-item">
                          <span className="label">Promovido em:</span>
                          <span className="value">{formatDateTime(admin.promoted_at)}</span>
                        </div>
                      )}
                      {admin.promoted_by && (
                        <div className="detail-item">
                          <span className="label">Promovido por:</span>
                          <span className="value">{admin.promoted_by}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions - apenas para admins regulares */}
                    {admin.admin_type !== 'super' && (
                      <div className="admin-actions">
                        {admin.status === 'suspended' ? (
                          <button
                            onClick={() => openModal('reactivate', admin)}
                            className="action-button reactivate"
                          >
                            <Eye size={14} />
                            Reativar
                          </button>
                        ) : (
                          <button
                            onClick={() => openModal('suspend', admin)}
                            className="action-button suspend"
                          >
                            <EyeOff size={14} />
                            Suspender
                          </button>
                        )}
                        <button
                          onClick={() => openModal('remove', admin)}
                          className="action-button remove"
                        >
                          <Trash2 size={14} />
                          Remover Admin
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Promover Usuário */}
        {activeTab === 'promote' && (
          <div className="promote-tab">
            {nonAdminUsers.length === 0 ? (
              <div className="empty-state">
                <UserPlus size={48} />
                <h4>Nenhum usuário disponível para promoção</h4>
                <p>Todos os usuários cadastrados já são administradores.</p>
              </div>
            ) : (
              <div className="users-grid">
                {nonAdminUsers.map((user) => (
                  <div key={user.id} className="user-card">
                    <div className="user-info">
                      <h4>{user.name}</h4>
                      <p>{user.email}</p>
                      <span className="user-created">
                        Cadastrado em: {formatDateTime(user.created_at)}
                      </span>
                    </div>
                    <button
                      onClick={() => openModal('promote', user)}
                      className="promote-button"
                    >
                      <UserCheck size={16} />
                      Promover a Admin
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Log de Atividades */}
        {activeTab === 'activity' && (
          <div className="activity-tab">
            {activityLog.length === 0 ? (
              <div className="empty-state">
                <Activity size={48} />
                <h4>Nenhuma atividade registrada</h4>
                <p>As atividades administrativas aparecerão aqui.</p>
              </div>
            ) : (
              <div className="activity-list">
                {activityLog.map((activity, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-icon-container">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="activity-content">
                      <div className="activity-description">
                        {activity.description}
                      </div>
                      <div className="activity-meta">
                        <span className="activity-time">
                          {formatDateTime(activity.timestamp)}
                        </span>
                        {activity.performed_by && (
                          <span className="activity-performer">
                            por {activity.performed_by}
                          </span>
                        )}
                      </div>
                      {activity.reason && (
                        <div className="activity-reason">
                          Motivo: {activity.reason}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {modalType === 'promote' && (
                  <>
                    <UserPlus size={20} />
                    Promover a Administrador
                  </>
                )}
                {modalType === 'suspend' && (
                  <>
                    <EyeOff size={20} />
                    Suspender Administrador
                  </>
                )}
                {modalType === 'reactivate' && (
                  <>
                    <Eye size={20} />
                    Reativar Administrador
                  </>
                )}
                {modalType === 'remove' && (
                  <>
                    <Trash2 size={20} />
                    Remover Privilégios de Admin
                  </>
                )}
              </h3>
              <button 
                onClick={closeModal}
                className="modal-close"
                disabled={processingAction}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {selectedUser && (
                <div className="selected-user-info">
                  <h4>{selectedUser.name}</h4>
                  <p>{selectedUser.email}</p>
                </div>
              )}

              <div className="modal-description">
                {modalType === 'promote' && (
                  <p>Você está prestes a promover este usuário a administrador. Ele terá acesso total ao sistema.</p>
                )}
                {modalType === 'suspend' && (
                  <p>Você está prestes a suspender este administrador. Ele manterá os privilégios mas ficará temporariamente inativo.</p>
                )}
                {modalType === 'reactivate' && (
                  <p>Você está prestes a reativar este administrador suspenso.</p>
                )}
                {modalType === 'remove' && (
                  <p>Você está prestes a remover os privilégios de administrador deste usuário. Esta ação é irreversível.</p>
                )}
              </div>

              {(modalType === 'promote' || modalType === 'suspend' || modalType === 'remove') && (
                <div className="form-group">
                  <label className="form-label">
                    Justificativa {modalType === 'promote' ? '*' : '*'}
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="form-textarea"
                    rows="3"
                    placeholder={`Descreva o motivo para ${
                      modalType === 'promote' ? 'promover este usuário' :
                      modalType === 'suspend' ? 'suspender este administrador' :
                      'remover os privilégios deste administrador'
                    }...`}
                    disabled={processingAction}
                  />
                  <div className="char-counter">
                    {actionReason.length}/500 caracteres
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={closeModal}
                className="cancel-button"
                disabled={processingAction}
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (modalType === 'promote') {
                    promoteUser();
                  } else {
                    manageAdmin(modalType);
                  }
                }}
                className={`confirm-button ${modalType}`}
                disabled={processingAction || (modalType !== 'reactivate' && !actionReason.trim())}
              >
                {processingAction ? (
                  <>
                    <div className="spinner"></div>
                    Processando...
                  </>
                ) : (
                  <>
                    {modalType === 'promote' && (
                      <>
                        <UserCheck size={16} />
                        Promover
                      </>
                    )}
                    {modalType === 'suspend' && (
                      <>
                        <EyeOff size={16} />
                        Suspender
                      </>
                    )}
                    {modalType === 'reactivate' && (
                      <>
                        <Eye size={16} />
                        Reativar
                      </>
                    )}
                    {modalType === 'remove' && (
                      <>
                        <Trash2 size={16} />
                        Remover
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagementPanel;