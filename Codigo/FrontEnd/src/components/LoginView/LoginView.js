// LoginView.js - LIMPO, USANDO APENAS O CSS ORIGINAL
// Remove estilos inline, mantém apenas classes CSS existentes

import React, { useState } from 'react';
import { MessageSquare, User, Shield } from 'lucide-react';
import './LoginView.css';

const LoginView = ({ 
  API_BASE_URL,
  onLoginSuccess,
  isLoading,
  setIsLoading
}) => {
  // === ESTADOS LOCAIS DO COMPONENTE ===
  const [credentials, setCredentials] = useState({ 
    email: '', 
    password: '' 
  });
  const [registerData, setRegisterData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [loginMode, setLoginMode] = useState('traditional'); // 'traditional' ou 'register'

  // === FUNÇÕES DE VALIDAÇÃO ===
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateLoginForm = () => {
    if (!credentials.email || !credentials.password) {
      alert('Por favor, preencha email e senha!');
      return false;
    }

    if (!validateEmail(credentials.email)) {
      alert('Por favor, insira um email válido!');
      return false;
    }

    return true;
  };

  const validateRegisterForm = () => {
    // Validação de campos obrigatórios
    if (!registerData.name || !registerData.email || !registerData.password) {
      alert('Preencha todos os campos!');
      return false;
    }
    
    // Validação de nome
    if (registerData.name.trim().length < 2) {
      alert('O nome deve ter pelo menos 2 caracteres!');
      return false;
    }
    
    // Validação de email
    if (!validateEmail(registerData.email)) {
      alert('Por favor, insira um email válido!');
      return false;
    }
    
    // Validação de senha
    if (registerData.password.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres!');
      return false;
    }
    
    // Validação de confirmação de senha
    if (registerData.password !== registerData.confirmPassword) {
      alert('As senhas não coincidem!');
      return false;
    }

    return true;
  };

  // === FUNÇÃO DE LOGIN TRADICIONAL ===
  const handleLogin = async () => {
    if (!validateLoginForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded' 
        },
        body: new URLSearchParams({ 
          username: credentials.email, 
          password: credentials.password 
        }).toString(),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Sucesso - chama callback do App.js
        onLoginSuccess(data.user, data.access_token);
        
        // Limpa formulário
        setCredentials({ email: '', password: '' });
      } else {
        // Erro - mostra mensagem
        alert('Erro no login: ' + (data.detail || 'Email ou senha incorretos.'));
      }
    } catch (error) {
      console.error('Erro no login:', error);
      alert('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // === FUNÇÃO DE REGISTRO ===
  const handleRegister = async () => {
    if (!validateRegisterForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/login/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          name: registerData.name.trim(),
          email: registerData.email.toLowerCase(),
          password: registerData.password
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Sucesso - mostra mensagem e volta para login
        alert('🎉 Cadastro realizado com sucesso!\n\nAgora você pode fazer login com suas credenciais.');
        
        // Limpa formulário de registro
        setRegisterData({ 
          name: '', 
          email: '', 
          password: '', 
          confirmPassword: '' 
        });
        
        // Volta para tela de login
        setLoginMode('traditional');
        
        // Pré-preenche email no login
        setCredentials({ 
          email: registerData.email, 
          password: '' 
        });
      } else {
        // Erro - mostra mensagem específica
        const errorMessage = data.detail || 'Erro desconhecido no cadastro.';
        alert('Erro no cadastro: ' + errorMessage);
      }
    } catch (error) {
      console.error('Erro no cadastro:', error);
      alert('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // === FUNÇÃO DE LOGIN COM GOOGLE ===
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      // SIMULAÇÃO - Em produção, integre com a API real do Google
      const googleToken = "token_simulado_do_google";
      
      const response = await fetch(`${API_BASE_URL}/api/login/google`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          google_token: googleToken 
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Sucesso - chama callback do App.js
        onLoginSuccess(data.user, data.access_token);
      } else {
        // Erro - mostra mensagem
        alert('Erro no login com Google: ' + (data.detail || 'Erro desconhecido.'));
      }
    } catch (error) {
      console.error('Erro no login com Google:', error);
      alert('Erro de conexão com Google. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // === FUNÇÃO PARA TESTE RÁPIDO (DESENVOLVIMENTO) ===
  const handleQuickLogin = (email, password) => {
    setCredentials({ email, password });
    // Pequeno delay para mostrar que preencheu
    setTimeout(() => {
      handleLogin();
    }, 100);
  };

  // === HANDLERS DE FORMULÁRIO ===
  const handleKeyDown = (e, action) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      action();
    }
  };

  const handleTabSwitch = (mode) => {
    setLoginMode(mode);
    // Limpa formulários ao trocar de aba
    if (mode === 'traditional') {
      setRegisterData({ name: '', email: '', password: '', confirmPassword: '' });
    } else {
      setCredentials({ email: '', password: '' });
    }
  };

  // === RENDER ===
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
        {/* Header */}
        <div className="login-header">
          <div className="logo-container">
            <MessageSquare size={40} />
          </div>
          <h1 className="system-title">Sistema UFMA</h1>
          <p className="system-subtitle">Consultas Inteligentes via LLM</p>
          <p className="document-version">RESOLUÇÃO Nº 1892-CONSEPE</p>
        </div>

        {/* Content */}
        <div className="login-content">
          {/* Tab Buttons */}
          <div className="tab-buttons">
            <button
              onClick={() => handleTabSwitch('traditional')}
              className={`tab-button ${loginMode === 'traditional' ? 'active-tab-blue' : 'inactive-tab'}`}
              disabled={isLoading}
            >
              Login
            </button>
            <button
              onClick={() => handleTabSwitch('register')}
              className={`tab-button ${loginMode === 'register' ? 'active-tab-green' : 'inactive-tab'}`}
              disabled={isLoading}
            >
              Cadastro
            </button>
          </div>

          {/* Login Form */}
          {loginMode === 'traditional' ? (
            <div className="form-container">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Digite seu email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                  onKeyDown={(e) => handleKeyDown(e, handleLogin)}
                  disabled={isLoading}
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
                  onKeyDown={(e) => handleKeyDown(e, handleLogin)}
                  disabled={isLoading}
                />
              </div>
              
              <div className="button-group">
                <button
                  onClick={handleLogin}
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
                      Autenticando...
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
                
                {/* Info Box com usuários de teste */}
                <div className="info-box info-box-blue">
                  <p className="info-text">
                    <Shield className="info-icon" />
                    <strong>Usuários de Teste:</strong>
                  </p>
                  <div className="admin-credentials">
                    <div>
                      <span 
                        onClick={() => !isLoading && handleQuickLogin('admin@ufma.br', 'admin123')}
                        style={{ 
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          textDecoration: 'underline',
                          opacity: isLoading ? 0.5 : 1
                        }}
                      >
                        🔵 <strong>Admin:</strong> admin@ufma.br / admin123
                      </span>
                    </div>
                    <div>
                      <span 
                        onClick={() => !isLoading && handleQuickLogin('usuario@ufma.br', 'user123')}
                        style={{ 
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          textDecoration: 'underline',
                          opacity: isLoading ? 0.5 : 1
                        }}
                      >
                        🟢 <strong>Usuário:</strong> usuario@ufma.br / user123
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Register Form */
            <div className="form-container">
              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input
                  type="text"
                  className="form-input-green"
                  placeholder="Digite seu nome completo"
                  value={registerData.name}
                  onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                  disabled={isLoading}
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
                  disabled={isLoading}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Senha</label>
                <input
                  type="password"
                  className="form-input-green"
                  placeholder="Digite sua senha (mín. 6 caracteres)"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                  disabled={isLoading}
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
                  onKeyDown={(e) => handleKeyDown(e, handleRegister)}
                  disabled={isLoading}
                />
              </div>
              
              <button
                onClick={handleRegister}
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
              
              {/* Info Box para cadastro */}
              <div className="info-box info-box-green">
                <p className="info-text">
                  <User className="info-icon" />
                  <strong>Cadastro para usuários do sistema</strong>
                </p>
                <div className="admin-credentials">
                  <div>✅ Emails @ufma.br terão privilégios especiais</div>
                  <div>✅ Histórico de conversas personalizado</div>
                  <div>✅ Acesso a funcionalidades avançadas</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="terms-text">
          <p>Ao fazer login, você concorda com nossos termos de uso</p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;