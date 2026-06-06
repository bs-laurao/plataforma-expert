// Importacao dos modulos necessarios
const express = require('express');
const { SerialPort } = require('serialport');  // Comunicacao serial com Arduino
const { ReadlineParser } = require('@serialport/parser-readline');  // Leitura linha por linha
const http = require('http');
const WebSocket = require('ws');  // Comunicacao em tempo real com o frontend

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Servir arquivos estaticos da pasta public (HTML, CSS, JS)
app.use(express.static('public'));

// Configuracao da porta serial do Arduino
// ATENCAO: Ajustar 'COM7' para a porta correta do seu computador
const port = new SerialPort({ 
  path: 'COM7', 
  baudRate: 9600  // Velocidade de comunicacao igual a configurada no Arduino
});

// Parser para ler os dados enviados pelo Arduino linha por linha
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

// Variavel para armazenar os dados mais recentes de cada sensor
let latestData = {
  temperatura: 0,
  distancia: 0,
  periodo: 0,
  luminosidade: 0
};

let comando = 0;  // Armazena qual sensor esta sendo lido (1=temp, 2=dist, 3=periodo, 4=luz)

// Funcao para enviar comandos para o Arduino via serial
function sendCommandToArduino(command) {
  port.write(command, (err) => {
    if (err) {
      // Erro ignorado silenciosamente no codigo original
    }
  });
}

// Processar os dados recebidos do Arduino
parser.on('data', (data) => {
  console.log('Dados recebidos:', data);
  
  // Converte o dado recebido para numero
  const numericValue = parseFloat(data);
  if (!isNaN(numericValue)) {
    
    // Armazena o valor no sensor correspondente ao ultimo comando enviado
    if (comando == 1) {
      latestData.temperatura = numericValue;  
    }
    if (comando == 2) {
      latestData.distancia = numericValue;  
    }
    if (comando == 3) {
      latestData.periodo = numericValue;  
    }
    if (comando == 4) {
      latestData.luminosidade = numericValue;  
    }
    
    // Envia os dados atualizados para todos os clientes conectados via WebSocket
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(latestData));
      }
    });
  }
});

// Rota HTTP para receber comandos do frontend e enviar ao Arduino
app.get('/command/:cmd', (req, res) => {
  const command = req.params.cmd;
  console.log('Comando recebido via HTTP:', command);
  sendCommandToArduino(command);
  comando = command;  // Guarda qual sensor sera atualizado no proximo dado recebido
  res.send(`Comando ${command} enviado para o Arduino`);
});

// Inicia o servidor na porta 3000
server.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});