// Importacao dos modulos necessarios
const express = require('express');
const { SerialPort } = require('serialport');        // Comunicacao serial com Arduino
const { ReadlineParser } = require('@serialport/parser-readline'); // Leitura linha por linha
const http = require('http');
const WebSocket = require('ws');                     // Comunicação em tempo real

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Servir os arquivos estaticos (HTML, CSS, JS) da pasta 'public'
app.use(express.static('public'));

// Configuracao da porta serial do Arduino
// ATENCAO: Altere 'COM7' para a porta correta do seu computador (ex: COM3, /dev/ttyUSB0)
const port = new SerialPort({ 
  path: 'COM7', 
  baudRate: 9600                // Mesma taxa configurada no Arduino
});

// Parser para ler os dados enviados pelo Arduino linha por linha (delimitado por \r\n)
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

// Objeto que armazena os valores mais recentes de cada sensor
let latestData = {
  temperatura: 0,
  distancia: 0,
  periodo: 0,
  luminosidade: 0
};

// Variavel que guarda o ultimo comando enviado (1=temp, 2=dist, 3=periodo, 4=luz)
let comando = 0;

// Envia um comando (string) para o Arduino via porta serial
function sendCommandToArduino(command) {
  port.write(command, (err) => {
    if (err) {
      // Erro ignorado (comentado no codigo original)
    }
  });
}

// Processa cada linha de dado recebida do Arduino
parser.on('data', (data) => {
  console.log('Dados recebidos:', data);
  
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
    
    // Envia os dados mais recentes para todos os clientes WebSocket conectados
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(latestData));
      }
    });
  }
});

// Rota HTTP para receber comandos do frontend e repassar ao Arduino
app.get('/command/:cmd', (req, res) => {
  const command = req.params.cmd;
  console.log('Comando recebido via HTTP:', command);
  sendCommandToArduino(command);
  comando = command;   // Atualiza qual sensor sera preenchido no proximo dado recebido
  res.send(`Comando ${command} enviado para o Arduino`);
});

// Inicia o servidor na porta 3000
server.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});