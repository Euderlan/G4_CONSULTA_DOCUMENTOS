import React, { useState } from 'react';
import { 
  Shield, 
  LogOut, 
  FileText, 
  Settings, 
  Download, 
  Eye,
  Edit,
  Trash2,
  Plus,
  X,
  Save
} from 'lucide-react';
import './AdminView.css';

const AdminView = ({
  user,
  setCurrentView,
  handleLogout
}) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState([
    {
      id: 1,
      title: 'RESOLUÇÃO Nº 1892-CONSEPE',
      version: 'v1.0 (28/06/2019)',
      lastUpdated: new Date().toLocaleDateString(),
      isActive: true,
      size: '2.3 MB',
      downloadUrl: '#'
    }
  ]);
  const [editingDocument, setEditingDocument] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDocument, setNewDocument] = useState({
    title: '',
    version: '',
    file: null
  });

  // Simular upload de arquivo
  const simulateUpload = (file) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          
          // Adicionar documento após upload
          if (file) {
            const newDoc = {
              id: Date.now(),
              title: newDocument.title || file.name,
              version: newDocument.version || 'v1.0',
              lastUpdated: new Date().toLocaleDateString(),
              isActive: true,
              size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
              downloadUrl: URL.createObjectURL(file)
            };
            setDocuments(prev => [...prev, newDoc]);
            setNewDocument({ title: '', version: '', file: null });
            setShowAddModal(false);
          }
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  // Lidar com seleção de arquivo no modal
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setNewDocument(prev => ({ ...prev, file }));
    } else {
      alert('Por favor, selecione apenas arquivos PDF.');
    }
  };

  // Adicionar novo documento
  const handleAddDocument = () => {
    if (!newDocument.title || !newDocument.version || !newDocument.file) {
      alert('Por favor, preencha todos os campos e selecione um arquivo.');
      return;
    }
    simulateUpload(newDocument.file);
  };

  // Editar documento
  const handleEditDocument = (docId) => {
    const doc = documents.find(d => d.id === docId);
    setEditingDocument({ ...doc });
  };

  // Salvar edições
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

  // Cancelar edição
  const handleCancelEdit = () => {
    setEditingDocument(null);
  };

  // Remover documento
  const handleRemoveDocument = (docId) => {
    if (window.confirm('Tem certeza que deseja remover este documento?')) {
      setDocuments(prev => prev.filter(doc => doc.id !== docId));
    }
  };

  // Download documento
  const handleDownloadDocument = (doc) => {
    // Simular download
    const link = document.createElement('a');
    link.href = doc.downloadUrl || '#';
    link.download = `${doc.title}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle status ativo/inativo
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
          
          <button
            onClick={handleLogout}
            className="header-button"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="admin-content">
        {/* Document Management */}
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
            >
              <Plus size={16} />
              Adicionar Documento
            </button>
          </div>
          
          <div className="admin-documents">
            {documents.map((doc) => (
              <div key={doc.id} className="document-card">
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
            ))}
          </div>
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
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Título do Documento</label>
                <input
                  type="text"
                  value={newDocument.title}
                  onChange={(e) => setNewDocument({...newDocument, title: e.target.value})}
                  className="form-input"
                  placeholder="Ex: RESOLUÇÃO Nº 1893-CONSEPE"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Versão</label>
                <input
                  type="text"
                  value={newDocument.version}
                  onChange={(e) => setNewDocument({...newDocument, version: e.target.value})}
                  className="form-input"
                  placeholder="Ex: v1.0 (01/01/2024)"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Arquivo PDF</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="file-input"
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
                  <p className="progress-text">Processando... {uploadProgress}%</p>
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
                disabled={!newDocument.title || !newDocument.version || !newDocument.file || isUploading}
              >
                <Plus className="button-icon" />
                {isUploading ? 'Adicionando...' : 'Adicionar Documento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;