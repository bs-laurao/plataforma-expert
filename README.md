# Plataforma Expert

Repositório para versionamento da Plataforma Expert 
Sistema de monitoramento de sensores com Arduino, comunicação serial, WebSocket e interface web interativa.

## Pré-requisitos

- Node.js (recomendado: versão 18 LTS ou 20 LTS)
- Git
- NPM
- Arduino conectado via USB

## Como Executar

### 1. Clone o repositório

git clone https://github.com/bs-laurao/plataforma-expert.git
cd plataforma-expert

> Se o arquivo `package.json` estiver dentro de uma subpasta
> (ex.: `plataforma-expert/plataforma-expert`), entre nela antes de continuar:
> cd plataforma-expert

### 2. Instale as dependências

npm install

> A instalação pode demorar alguns minutos, pois baixa o Electron (~200 MB)
> e compila o módulo nativo `serialport`.

### 3. Escolha o modo de execução

#### Modo servidor (navegador)

# Windows
node server.js

# Linux/macOS (pode precisar de sudo para acessar a porta serial)
sudo node server.js

Depois acesse no navegador: http://localhost:3000

#### Modo app desktop (Electron)

npm start

Isso abre o aplicativo como janela nativa (Electron),
sem precisar do navegador.
