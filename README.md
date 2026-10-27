# Plataforma Expert

Repositório para versionamento da Plataforma Expert.
Sistema de monitoramento de sensores com Arduino, comunicação serial, WebSocket e interface web interativa.

## Pré-requisitos

- Node.js (recomendado: versão 18 LTS ou 20 LTS)
- Git
- NPM
- Arduino conectado via USB

## Como Executar

### 1. Clone o repositório

```bash
git clone https://github.com/bs-laurao/plataforma-expert.git
cd plataforma-expert
```

> Se o arquivo `package.json` estiver dentro de uma subpasta
> (ex.: `plataforma-expert/plataforma-expert`), entre nela antes de continuar:
>
> ```bash
> cd plataforma-expert
> ```

### 2. Instale as dependências

```bash
npm install
```

> A instalação pode demorar alguns minutos, pois baixa o Electron (~200 MB)
> e compila o módulo nativo `serialport`.

### 3. Escolha o modo de execução

#### Modo servidor (navegador)

```bash
# Windows
node server.js

# Linux/macOS (pode precisar de sudo para acessar a porta serial)
sudo node server.js
```

Depois acesse no navegador: http://localhost:3000

#### Modo app desktop (Electron)

```bash
npm start
```

## Problemas Comuns

- **Porta serial ocupada:** feche o **Monitor Serial do Arduino IDE**
  antes de rodar o projeto — só um programa pode usar a porta por vez.
- **Erro ao compilar `serialport` no Windows:** instale o
  **"Desktop development with C++"** do Visual Studio Build Tools.
- **Permissão negada na porta serial (Linux/macOS):**
  adicione seu usuário ao grupo `dialout`:

  ```bash
  sudo usermod -a -G dialout $USER
  ```

  Depois faça logout e login novamente.
- **Porta serial não encontrada:** verifique no Arduino IDE qual porta
  o Arduino está usando (ex.: `COM3` no Windows, `/dev/ttyUSB0` no Linux).
