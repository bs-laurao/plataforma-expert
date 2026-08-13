##  Como Executar: 

### Pré-requisitos

- Node.js (versão 14 ou superior)
- NPM
- Arduino conectado via USB

### Passo a Passo

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/plataforma-expert.git
cd plataforma-expert

# 2. Instale as dependências
npm install

# 3. Inicie o servidor
# No Windows:
node server.js

# No Linux/macOS (pode precisar de sudo para acessar a porta serial):
sudo node server.js

# 4. Acesse no navegador
# http://localhost:3000

# Plataforma Expert

Repositório para versionamento da Plataforma Expert – sistema de monitoramento de sensores com Arduino, comunicação serial, WebSocket e interface web interativa.

## Histórico de versões

### Versão 1 – Base funcional

- Interface inicial com quatro botões (Temperatura, Distância, Oscilador, Luminosidade).
- Exibição simultânea dos quatro valores em cards.
- WebSocket para receber dados do Arduino em tempo real.
- Envio de comandos simples via HTTP (`/command/1`, `/command/2`, etc.).
- Servidor Node.js com comunicação serial (taxa 9600 bps).

### Versão 2 – Gráficos e controle de aquisição

- Adição da biblioteca **Chart.js** para gerar gráficos em tempo real.
- Telas separadas para cada sensor (ao clicar em um botão, abre uma tela dedicada).
- Botões específicos: **Iniciar**, **Pausar** e **Reiniciar** para cada sensor.
- Comandos estendidos: `1` (iniciar), `1p` (pausar), `1r` (reiniciar).
- Modal para escolha entre visualização em **tabela** (valor numérico) ou **gráfico**.
- Estilos básicos para organização dos elementos.

### Versão 3 – Interface profissional e recursos avançados

- **Temas claro/escuro** com alternância via botão (persistência no localStorage).
- **Página inicial com cards** (ícones SVG e descrições), substituindo os botões antigos.
- **Controle de amostragem** – seletor de intervalo de coleta (0,1s a 10s).
- **Botão "Limpar"** para zerar os dados de um sensor sem sair da tela.
- **Exibição do tempo decorrido** (mm:ss) ao lado do valor numérico.
- **Abas** dentro de cada tela para alternar entre tabela e gráfico (sem precisar do modal).
- **Ajuste da escala Y** no gráfico de temperatura (opções 20°C, 50°C, 100°C).
- **Design responsivo** – adapta-se a celulares e tablets.
- **Código CSS reorganizado** com variáveis, suporte a temas e ícones vetoriais.
