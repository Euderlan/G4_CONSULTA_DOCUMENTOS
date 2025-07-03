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
  // Estados para controle de upload
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Estados gerais da aplicação
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  
  // Estados para edição de documentos
  const [editingDocument, setEditingDocument] = useState(null);
  
  // Estados para modal de adição de documentos
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDocument, setNewDocument] = useState({
    title: '',
    version: '',
    file: null
  });

  // Função para buscar documentos do backend
  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("http://localhost:8000/api/admin/documents");
      // Formata os dados recebidos do backend para o formato usado no frontend
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

  // Effect para carregar documentos ao montar o componente
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Função para fazer upload real de arquivo para o backend
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
          // Callback para mostrar progresso do upload
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          },
        }
      );

      // Atualiza a lista de documentos após o upload bem-sucedido
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

  // Função para selecionar arquivo no input file
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    // Valida se o arquivo é PDF
    if (file && file.type === 'application/pdf') {
      setNewDocument(prev => ({ ...prev, file }));
    } else {
      alert('Por favor, selecione apenas arquivos PDF.');
    }
  };

  // Função para iniciar o processo de adição de documento
  const handleAddDocument = () => {
    if (!newDocument.file) {
      alert('Por favor, selecione um arquivo.');
      return;
    }
    handleRealUpload(newDocument.file);
  };

  // Função para iniciar edição de um documento
  const handleEditDocument = (docId) => {
    const doc = documents.find(d => d.id === docId);
    setEditingDocument({ ...doc });
  };

  // Função para salvar as alterações na edição (apenas local, não persiste no backend)
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

  // Função para cancelar a edição
  const handleCancelEdit = () => {
    setEditingDocument(null);
  };

  // Função para remover documento do backend
  const handleRemoveDocument = async (docId) => {
    if (window.confirm('Tem certeza que deseja remover este documento?')) {
      try {
        await axios.delete(`http://localhost:8000/api/admin/document/${docId}`);
        // Remove o documento da lista local após sucesso no backend
        setDocuments(prev => prev.filter(doc => doc.id !== docId));
      } catch (error) {
        console.error("Erro ao remover documento:", error);
        alert("Erro ao remover documento");
      }
    }
  };

  // Função para fazer download do documento
  const handleDownloadDocument = (doc) => {
    window.open(doc.downloadUrl, '_blank');
  };

  // Função para alternar status ativo/inativo do documento (apenas local)
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
      {/* Cabeçalho da página administrativa */}
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
            {/* Botão para atualizar lista de documentos */}
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

      {/* Conteúdo principal da página */}
      <div className="admin-content">
        <div className="admin-section">
          {/* Cabeçalho da seção de documentos */}
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
          
          {/* Área de conteúdo: loading ou lista de documentos */}
          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Carregando documentos...</p>
            </div>
          ) : (
            <div className="admin-documents">
              {/* Estado vazio quando não há documentos */}
              {documents.length === 0 ? (
                <div className="empty-state">
                  <FileText size={48} className="empty-icon" />
                  <p>Nenhum documento encontrado</p>
                </div>
              ) : (
                // Lista de documentos
                documents.map((doc) => (
                  <div key={doc.id} className={`document-card ${!doc.isActive ? 'inactive' : ''}`}>
                    {/* Informações do documento */}
                    <div className="document-info">
                      <div className="document-icon">
                        <FileText size={24} />
                      </div>
                      <div className="document-details">
                        {/* Modo de edição vs modo de visualização */}
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
                        {/* Toggle de status ativo/inativo */}
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
                    
                    {/* Ações do documento */}
                    <div className="document-actions">
                      {/* Botões para modo de edição */}
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
                        // Botões para modo normal
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

      {/* Modal para adicionar novo documento */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            {/* Cabeçalho do modal */}
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
            
            {/* Corpo do modal com formulário */}
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
              
              {/* Input para seleção de arquivo */}
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

              {/* Barra de progresso do upload */}
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
            
            {/* Rodapé do modal com botões de ação */}
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