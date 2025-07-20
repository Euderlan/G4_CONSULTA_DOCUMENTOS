# CONSULTAI

## Documentação

### Documentação Backend (Doxygen)

Para acessar a documentação do backend gerada pelo Doxygen:

1. Navegue até a pasta da documentação backend
2. Procure pelo arquivo `index.html`
3. Abra o arquivo em seu navegador web

```bash
# Exemplo de caminho típico
./docs/backend/html/index.html
```

### Documentação Frontend (JSDoc)

Para acessar a documentação do frontend gerada pelo JSDoc:

1. Navegue até a pasta da documentação frontend
2. Procure pelo arquivo `index.html`
3. Abra o arquivo em seu navegador web

```bash
# Exemplo de caminho típico
./docs/frontend/index.html
```

#### Diferencial do Frontend

A documentação do frontend foi implementada de forma diferente do backend:

Este HTML foi gerado automaticamente via JSDoc, utilizando uma metodologia similar à empregada na criação de documentações Doxygen. O funcionamento do JSDoc é bastante intuitivo: basta adicionar comentários de documentação acima de funções, classes ou variáveis, especificando os tipos e parâmetros através de tags especiais (como @param, @returns). Ao executar o comando da CLI do JSDoc, o sistema gera automaticamente um site de documentação estático.


