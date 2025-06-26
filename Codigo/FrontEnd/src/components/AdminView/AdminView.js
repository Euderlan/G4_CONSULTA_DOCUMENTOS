import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Shield, 
  LogOut, 
  FileText, 
  Download, 
  Eye,
  Edit,
  Trash2,
  Plus,
  X,
  Save,
  RefreshCw
} from 'lucide-react';
import './AdminView.css';

const AdminView = ({
  user,
  setCurrentView,
  handleLogout
}) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [editingDocument, setEditingDocument] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDocument, setNewDocument] = useState({
    title: '',
    version: '',
    file: null
  });

  // Carrega documentos do backend
  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("http://localhost:8000/api/admin/documents");
      const formattedDocs = response.data.map(doc => ({
        id: doc.id,
        title: doc.original_name,
        version: doc.version || 'v1.0',
        lastUpdated: new Date(doc.saved_at).toLocaleDateString(),
        isActive: true,
        size: `${(doc.size / (1024 * 1024)).toFixed(1)} MB`,
        downloadUrl: `http://localhost:8000/api/admin/download/${doc.id}`
      }));
      setDocuments(formattedDocs);
    } catch (error) {
      console.error("Erro ao carregar documentos:", error);
      alert("Erro ao carregar documentos");
    } finally {
      setIsLoading(false);
    }
  };

  // Carrega documentos ao montar o componente
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Upload de arquivo real
  const handleRealUpload = async (file) => {
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        "http://localhost:8000/api/admin/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          },
        }
      );

      // Atualiza a lista após upload
      await fetchDocuments();
      setNewDocument({ title: '', version: '', file: null });
      setShowAddModal(false);
      alert("Documento enviado com sucesso!");
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      alert(`Erro: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Manipuladores de eventos
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setNewDocument(prev => ({ ...prev, file }));
    } else {
      alert('Por favor, selecione apenas arquivos PDF.');
    }
  };

  const handleAddDocument = () => {
    if (!newDocument.file) {
      alert('Por favor, selecione um arquivo.');
      return;
    }
    handleRealUpload(newDocument.file);
  };

  const handleEditDocument = (docId) => {
    const doc = documents.find(d => d.id === docId);
    setEditingDocument({ ...doc });
  };

  const handleSaveEdit = () => {
    setDocuments(prev => 
      prev.map(doc => 
        doc.id === editingDocument.id 
          ? { ...editingDocument, lastUpdated: new Date().toLocaleDateString() }
          : doc
      )
    );
    setEditingDocument(null);
  };

  // Adicione esta função nova
  const handleCancelEdit = () => {
    setEditingDocument(null);
  };

  const handleRemoveDocument = async (docId) => {
    if (window.confirm('Tem certeza que deseja remover este documento?')) {
      try {
        await axios.delete(`http://localhost:8000/api/admin/document/${docId}`);
        setDocuments(prev => prev.filter(doc => doc.id !== docId));
      } catch (error) {
        console.error("Erro ao remover documento:", error);
        alert("Erro ao remover documento");
      }
    }
  };

  const handleDownloadDocument = (doc) => {
    window.open(doc.downloadUrl, '_blank');
  };

  const toggleDocumentStatus = (docId) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === docId
          ? { ...doc, isActive: !doc.isActive, lastUpdated: new Date().toLocaleDateString() }
          : doc
      )
    );
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-header-left">
            <button
              onClick={() => setCurrentView('chat')}
              className="back-button"
            >
              ← Voltar ao Chat
            </button>
            <h1 className="admin-title">
              <Shield className="admin-icon" />
              Painel Administrativo
            </h1>
          </div>
          <div className="admin-header-right">
            <button
              onClick={fetchDocuments}
              className="refresh-button"
              disabled={isLoading}
            >
              <RefreshCw size={18} className={isLoading ? "spin" : ""} />
              Atualizar
            </button>
            <button
              onClick={handleLogout}
              className="header-button"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="admin-content">
        <div className="admin-section">
          <div className="admin-section-header">
            <h2 className="admin-section-title">
              <FileText className="admin-section-icon" />
              Gerenciar Documentos
              <div className="admin-badge">
                👤 Administrador: {user?.email}
              </div>
            </h2>
            <button 
              onClick={() => setShowAddModal(true)}
              className="add-document-button"
              disabled={isLoading}
            >
              <Plus size={16} />
              Adicionar Documento
            </button>
          </div>
          
          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Carregando documentos...</p>
            </div>
          ) : (
            <div className="admin-documents">
              {documents.length === 0 ? (
                <div className="empty-state">
                  <FileText size={48} className="empty-icon" />
                  <p>Nenhum documento encontrado</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className={`document-card ${!doc.isActive ? 'inactive' : ''}`}>
                    <div className="document-info">
                      <div className="document-icon">
                        <FileText size={24} />
                      </div>
                      <div className="document-details">
                        {editingDocument?.id === doc.id ? (
                          <div className="edit-form">
                            <input
                              type="text"
                              value={editingDocument.title}
                              onChange={(e) => setEditingDocument({...editingDocument, title: e.target.value})}
                              className="edit-input"
                              placeholder="Título do documento"
                            />
                            <input
                              type="text"
                              value={editingDocument.version}
                              onChange={(e) => setEditingDocument({...editingDocument, version: e.target.value})}
                              className="edit-input"
                              placeholder="Versão"
                            />
                          </div>
                        ) : (
                          <>
                            <h3 className="document-title">{doc.title}</h3>
                            <p className="document-version">Versão: {doc.version}</p>
                          </>
                        )}
                        <p className="document-updated">Última atualização: {doc.lastUpdated}</p>
                        <p className="document-size">Tamanho: {doc.size}</p>
                        <div className="document-status">
                          <button 
                            onClick={() => toggleDocumentStatus(doc.id)}
                            className={`status-toggle ${doc.isActive ? 'status-active' : 'status-inactive'}`}
                          >
                            <Eye className="status-icon" />
                            <span className="status-text">
                              {doc.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="document-actions">
                      {editingDocument?.id === doc.id ? (
                        <>
                          <button 
                            onClick={handleSaveEdit}
                            className="action-button save-button"
                          >
                            <Save className="action-icon" />
                            Salvar
                          </button>
                          <button 
                            onClick={handleCancelEdit}
                            className="action-button cancel-button"
                          >
                            <X className="action-icon" />
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleEditDocument(doc.id)}
                            className="action-button edit-button"
                          >
                            <Edit className="action-icon" />
                            Editar
                          </button>
                          <button 
                            onClick={() => handleDownloadDocument(doc)}
                            className="action-button download-button"
                          >
                            <Download className="action-icon" />
                            Baixar
                          </button>
                          <button 
                            onClick={() => handleRemoveDocument(doc.id)}
                            className="action-button remove-button"
                          >
                            <Trash2 className="action-icon" />
                            Remover
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal para adicionar documento */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Adicionar Novo Documento</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="modal-close"
                disabled={isUploading}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Título do Documento (opcional)</label>
                <input
                  type="text"
                  value={newDocument.title}
                  onChange={(e) => setNewDocument({...newDocument, title: e.target.value})}
                  className="form-input"
                  placeholder="Ex: RESOLUÇÃO Nº 1893-CONSEPE"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Versão (opcional)</label>
                <input
                  type="text"
                  value={newDocument.version}
                  onChange={(e) => setNewDocument({...newDocument, version: e.target.value})}
                  className="form-input"
                  placeholder="Ex: v1.0 (01/01/2024)"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Arquivo PDF *</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="file-input"
                  required
                />
                {newDocument.file && (
                  <p className="file-selected">
                    Arquivo selecionado: {newDocument.file.name}
                  </p>
                )}
              </div>

              {isUploading && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="progress-text">Enviando... {uploadProgress}%</p>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={() => setShowAddModal(false)}
                className="cancel-button"
                disabled={isUploading}
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddDocument}
                className="primary-button"
                disabled={!newDocument.file || isUploading}
              >
                <Plus className="button-icon" />
                {isUploading ? 'Enviando...' : 'Enviar Documento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
