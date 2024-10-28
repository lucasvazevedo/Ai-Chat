# Ai-Chat
A AI chat module for VS Code making use of Ollama

# Requisitos

## Arquivo compose com interface e ollhama

// Gerar um arquivo compose.yaml com o conteúdo abaixo.
// Note que será utilizada a gpu NVIDIA do seu sistema.
// A porta do serviço web será 91 e do ollama será 11434.

services:

  webui:
    image: ghcr.io/open-webui/open-webui:main
    expose:
     - 8080/tcp
    ports:
     - 91:8080/tcp
    environment:
      - OLLAMA_BASE_URL=http://host.docker.internal:11434
    volumes:
      - ./open-webui:/app/backend/data
    depends_on:
     - ollama

  ollama:
    image: ollama/ollama
    expose:
     - 11434/tcp
    ports:
     - 11434:11434/tcp
    healthcheck:
      test: ollama --version || exit 1
    command: serve
    volumes:
      - ./ollama:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              device_ids: ['all']
              capabilities: [gpu]


# Passos necessários para Criar a extensão:

1- Ter instalado o Node no sistema;

2 - Execuatr os seguintes comandos:

    ´npm install -g yo generator-code´

    ´yo code´

3 - Feito isso, o gerador perguntará alguns detalhes, como:

    Nome da extensão;
    Descrição;
    Linguagem preferida ( escolha JavaScript).

4 - Agora é só substituir o conteúdo do arquivo 'extension.js' pelo o do projeto;

5 - Executar os seguintes comandos na pasta da extensão, esses comandos criarão o arquivo de instalação:

    ´npm install -g vsce´

    ´vsce package´
