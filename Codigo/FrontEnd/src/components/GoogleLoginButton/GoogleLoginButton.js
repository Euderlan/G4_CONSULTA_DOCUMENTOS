// FrontEnd/src/components/GoogleLoginButton/GoogleLoginButton.js
import React, { useEffect, useRef, useState, useCallback } from 'react';

const GoogleLoginButton = ({ 
  onSuccess, 
  onError, 
  disabled = false,
  clientId
}) => {
  // Referência para o elemento DOM onde o botão do Google será renderizado
  const googleButtonRef = useRef(null);
  // Estado para controlar se a biblioteca do Google foi carregada
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  // Estado para controlar se o botão foi renderizado com sucesso
  const [isButtonRendered, setIsButtonRendered] = useState(false);

  // Função para processar a resposta de autenticação do Google
  const handleCredentialResponse = useCallback(async (response) => {
    try {
      if (!response.credential) {
        throw new Error('Token de credencial não recebido');
      }

      // Decodifica o JWT token para extrair informações do usuário
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      
      // Organiza os dados do usuário em um objeto estruturado
      const userData = {
        google_token: response.credential,
        google_id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        email_verified: payload.email_verified || false,
        given_name: payload.given_name,
        family_name: payload.family_name,
      };

      console.log('Google Sign-In Success:', userData);
      onSuccess(userData);
    } catch (error) {
      console.error('Erro ao processar resposta do Google:', error);
      onError?.(error);
    }
  }, [onSuccess, onError]);

  // Função responsável por renderizar o botão do Google
  const renderGoogleButton = useCallback(() => {
    // Verifica se todas as dependências estão disponíveis
    if (!window.google?.accounts?.id || !clientId || disabled || !googleButtonRef.current) {
      return;
    }

    try {
      // Limpa o conteúdo anterior do container do botão
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '';
      }

      // Inicializa a biblioteca do Google com as configurações
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Renderiza o botão do Google com as opções de estilo
      window.google.accounts.id.renderButton(
        googleButtonRef.current,
        {
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: "100%",
        }
      );

      setIsButtonRendered(true);
      console.log('Google button renderizado com sucesso');
      
    } catch (error) {
      console.error('Erro ao renderizar botão Google:', error);
      setIsButtonRendered(false);
      onError?.(error);
    }
  }, [clientId, disabled, handleCredentialResponse, onError]);

  // Effect para verificar se a biblioteca do Google foi carregada
  useEffect(() => {
    let checkInterval;
    
    const checkGoogleLoaded = () => {
      if (window.google?.accounts?.id) {
        setIsGoogleLoaded(true);
        if (checkInterval) {
          clearInterval(checkInterval);
        }
        return true;
      }
      return false;
    };

    // Verifica imediatamente se o Google já está carregado
    if (!checkGoogleLoaded()) {
      // Se não carregou, verifica periodicamente a cada 100ms
      checkInterval = setInterval(() => {
        if (checkGoogleLoaded()) {
          clearInterval(checkInterval);
        }
      }, 100);
    }

    // Cleanup: limpa o interval quando o componente é desmontado
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, []);

  // Effect para renderizar o botão quando o Google carregar
  useEffect(() => {
    if (isGoogleLoaded && !disabled) {
      // Adiciona um pequeno delay para garantir que o DOM está pronto
      const timer = setTimeout(() => {
        renderGoogleButton();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isGoogleLoaded, disabled, renderGoogleButton]);

  // Effect de fallback para re-renderizar o botão se ele sumir
  useEffect(() => {
    if (isGoogleLoaded && !isButtonRendered && !disabled) {
      const retryTimer = setTimeout(() => {
        console.log('Tentando re-renderizar botão Google...');
        renderGoogleButton();
      }, 500);

      return () => clearTimeout(retryTimer);
    }
  }, [isGoogleLoaded, isButtonRendered, disabled, renderGoogleButton]);

  // Estado de carregamento: exibido enquanto a biblioteca do Google não carrega
  if (!isGoogleLoaded) {
    return (
      <div 
        style={{ 
          padding: '12px', 
          textAlign: 'center', 
          background: '#f8f9fa', 
          border: '2px solid #e9ecef',
          borderRadius: '8px',
          color: '#6c757d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <div 
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid #e9ecef',
            borderTop: '2px solid #6c757d',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        ></div>
        Carregando Google Sign-In...
      </div>
    );
  }

  // Estado desabilitado: exibido quando o componente está processando
  if (disabled) {
    return (
      <button 
        disabled 
        className="google-button"
        style={{ 
          opacity: 0.5, 
          cursor: 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <div className="spinner-dark"></div>
        Autenticando...
      </button>
    );
  }

  // Renderização principal: container do botão do Google com fallback
  return (
    <div style={{ width: '100%', minHeight: '40px' }}>
      {/* Container onde o botão oficial do Google será renderizado */}
      <div ref={googleButtonRef} style={{ width: '100%' }}></div>
      
      {/* Botão de fallback caso o botão oficial não renderize */}
      {isGoogleLoaded && !isButtonRendered && (
        <button
          onClick={() => {
            console.log('Botão fallback clicado, tentando renderizar...');
            renderGoogleButton();
          }}
          className="google-button"
          style={{
            width: '100%',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {/* Ícone do Google em SVG */}
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          🔄 Recarregar Google Sign-In
        </button>
      )}
    </div>
  );
};

export default GoogleLoginButton;