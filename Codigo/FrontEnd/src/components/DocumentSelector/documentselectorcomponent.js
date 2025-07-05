import React, { useState, useEffect } from 'react';
import { FileText, ChevronDown, ChevronUp, Check } from 'lucide-react';
import './DocumentSelector.css';

const DocumentSelector = ({ 
  selectedDocument, 
  onDocumentSelect, 
  API_BASE_URL 
}) => {
  const [documents, setDocuments] = useState([]);
  const [expandedDocument, setExpandedDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega lista de documentos ao montar o componente
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      } else {
        console.error('Erro ao carregar documentos');
      }
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentToggle = (docId) => {
    if (expandedDocument === docId) {
      setExpandedDocument(null);
    } else {
      setExpandedDocument(docId);
    }
  };

  const handleDocumentSelect = (docId) => {
    onDocumentSelect(docId);
    setExpandedDocument(null); // Fecha resumo ao selecionar
  };

  const formatFileName = (filename) => {
    // Remove timestamp e UUID do nome do arquivo
    if (filename.includes('_')) {
      const parts = filename.split('_');
      if (parts.length > 2) {
        return parts.slice(2).join('_').replace('.pdf', '');
      }
    }
    return filename.replace('.pdf', '');
  };

  if (isLoading) {
    return (
      <div className="document-selector-loading">
        <div className="loading-spinner"></div>
        <p>Carregando documentos...</p>
      </div>
    );
  }

  return (
    <div className="document-selector">
      <div className="document-selector-header">
        <h4>Escolha seu documento:</h4>
      </div>
      
      {/* Botão para todos os documentos */}
      <div className="document-option">
        <button
          onClick={() => handleDocumentSelect('all')}
          className={`document-button ${selectedDocument === 'all' ? 'selected' : ''}`}
        >
          <div className="document-button-content">
            <FileText size={16} className="document-icon" />
            <span className="document-name">Todos os Documentos</span>
            {selectedDocument === 'all' && (
              <Check size={16} className="selected-icon" />
            )}
          </div>
        </button>
      </div>

      {/* Lista de documentos individuais */}
      {documents.map((doc) => (
        <div key={doc.id} className="document-option">
          <div className="document-item">
            {/* Botão principal do documento */}
            <button
              onClick={() => handleDocumentToggle(doc.id)}
              className={`document-button ${selectedDocument === doc.id ? 'selected' : ''}`}
            >
              <div className="document-button-content">
                <FileText size={16} className="document-icon" />
                <span className="document-name">
                  {formatFileName(doc.original_name)}
                </span>
                <div className="document-actions">
                  {selectedDocument === doc.id && (
                    <Check size={16} className="selected-icon" />
                  )}
                  {expandedDocument === doc.id ? (
                    <ChevronUp size={16} className="expand-icon" />
                  ) : (
                    <ChevronDown size={16} className="expand-icon" />
                  )}
                </div>
              </div>
            </button>

            {/* Resumo expandido */}
            {expandedDocument === doc.id && (
              <div className="document-summary">
                <div className="summary-content">
                  <h5>Resumo do Documento:</h5>
                  <p>{doc.summary || 'Resumo não disponível'}</p>
                </div>
                <button
                  onClick={() => handleDocumentSelect(doc.id)}
                  className="select-document-button"
                >
                  <Check size={14} />
                  Selecionar este documento
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {documents.length === 0 && (
        <div className="no-documents">
          <FileText size={24} className="no-documents-icon" />
          <p>Nenhum documento disponível</p>
        </div>
      )}
    </div>
  );
};

export default DocumentSelector;