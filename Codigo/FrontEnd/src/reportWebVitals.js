// Função para medir e reportar métricas de performance web (Web Vitals)
// onPerfEntry: callback que será executado para cada métrica coletada
const reportWebVitals = onPerfEntry => {
  // Verifica se foi passado um callback válido (deve ser uma função)
  if (onPerfEntry && onPerfEntry instanceof Function) {
    // Importa dinamicamente a biblioteca web-vitals apenas quando necessário
    // Isso é uma otimização para não carregar a biblioteca desnecessariamente
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      // CLS - Cumulative Layout Shift: mede a instabilidade visual da página
      // Quantifica o quanto os elementos se movem inesperadamente durante o carregamento
      getCLS(onPerfEntry);
      
      // FID - First Input Delay: mede a responsividade da página
      // Tempo entre a primeira interação do usuário e a resposta do navegador
      getFID(onPerfEntry);
      
      // FCP - First Contentful Paint: mede a velocidade de carregamento
      // Tempo até que o primeiro conteúdo seja renderizado na tela
      getFCP(onPerfEntry);
      
      // LCP - Largest Contentful Paint: mede a velocidade de carregamento
      // Tempo até que o maior elemento de conteúdo seja renderizado
      getLCP(onPerfEntry);
      
      // TTFB - Time to First Byte: mede a responsividade do servidor
      // Tempo entre a requisição e o primeiro byte recebido do servidor
      getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;