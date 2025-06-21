import React, { useState } from 'react';
import { MessageSquare, User, Shield } from 'lucide-react';
import './LoginView.css';

const LoginView = ({ 
  isLoading,
  handleGoogleLogin,
  handleLogin,
  handleRegister
}) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [loginMode, setLoginMode] = useState('traditional');

  const handleRegisterSubmit = () => {
    if (registerData.password !== registerData.confirmPassword) {
      alert('As senhas não coincidem!');
      return;
    }
    if (!registerData.name || !registerData.email || !registerData.password) {
      alert('Preencha todos os campos!');
      return;
    }
    handleRegister(registerData);
  };

  return (
    <div className="login-container">
      {/* Background Animation */}
      <div className="background-animation">
        <div className="floating-element element-1"></div>
        <div className="floating-element element-2"></div>
        <div className="floating-element element-3"></div>
        <div className="floating-element element-4"></div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="logo-container">
            <MessageSquare size={40} />
          </div>
          <h1 className="system-title">Sistema UFMA</h1>
          <p className="system-subtitle">Consultas Inteligentes via LLM</p>
          <p className="document-version">RESOLUÇÃO Nº 1892-CONSEPE</p>
        </div>

        <div className="login-content">
          <div className="tab-buttons">
            <button
              onClick={() => setLoginMode('traditional')}
              className={`tab-button ${loginMode === 'traditional' ? 'active-tab-blue' : 'inactive-tab'}`}
            >
              Login
            </button>
            <button
              onClick={() => setLoginMode('register')}
              className={`tab-button ${loginMode === 'register' ? 'active-tab-green' : 'inactive-tab'}`}
            >
              Cadastro
            </button>
          </div>

          {loginMode === 'traditional' ? (
            <div className="form-container">
              <div className="form-group">
                <label className="form-label">Usuário</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Digite seu usuário (admin para área administrativa)"
                  value={credentials.username}
                  onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Senha</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Digite sua senha"
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                />
              </div>
              
              <div className="button-group">
                <button
                  onClick={() => handleLogin(credentials.username || 'Usuário Demo', credentials.password, false)}
                  disabled={isLoading}
                  className="primary-button"
                >
                  {isLoading ? (
                    <div className="loading-content">
                      <div className="spinner"></div>
                      Entrando...
                    </div>
                  ) : (
                    <>
                      <User className="button-icon" />
                      Entrar
                    </>
                  )}
                </button>
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="google-button"
                >
                  {isLoading ? (
                    <>
                      <div className="spinner-dark"></div>
                      Autenticando com Google...
                    </>
                  ) : (
                    <>
                      <svg className="google-icon" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Entrar com Google
                    </>
                  )}
                </button>
                <div className="info-box info-box-blue">
                  <p className="info-text">
                    <Shield className="info-icon" />
                    <strong>Acesso Administrativo:</strong>
                  </p>
                  <div className="admin-credentials">
                    <div>• <strong>Usuário:</strong> admin</div>
                    <div>• <strong>Senha:</strong> Qualquer senha</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="form-container">
              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input
                  type="text"
                  className="form-input-green"
                  placeholder="Digite seu nome completo"
                  value={registerData.name}
                  onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input-green"
                  placeholder="Digite seu email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Senha</label>
                <input
                  type="password"
                  className="form-input-green"
                  placeholder="Digite sua senha"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirmar Senha</label>
                <input
                  type="password"
                  className="form-input-green"
                  placeholder="Confirme sua senha"
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                />
              </div>
              
              <button
                onClick={handleRegisterSubmit}
                disabled={isLoading}
                className="register-button"
              >
                {isLoading ? (
                  <div className="loading-content">
                    <div className="spinner"></div>
                    Criando conta...
                  </div>
                ) : (
                  <>
                    <User className="button-icon" />
                    Criar Conta
                  </>
                )}
              </button>
              
              <div className="info-box info-box-green">
                <p className="info-text">
                  <User className="info-icon" />
                  <strong>Cadastro para usuários do sistema</strong>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="terms-text">
          <p>Ao fazer login, você concorda com nossos termos de uso</p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;