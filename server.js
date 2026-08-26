// Importacao dos modulos necessarios
const express = require('express');
const { SerialPort } = require('serialport');        // Comunicacao serial com Arduino
const { ReadlineParser } = require('@serialport/parser-readline'); // Leitura linha por linha
const http = require('http');
const WebSocket = require('ws');                     // Comunicacao em tempo real com o frontend

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Servir os arquivos estaticos (HTML, CSS, JS) da pasta 'public'
app.use(express.static('public'));

// Variavel global para a porta serial
let port = null;
let parser = null;

// Funcao para detectar automaticamente a porta do Arduino
async function findArduinoPort() {
    try {
        // Lista todas as portas seriais disponiveis
        const ports = await SerialPort.list();
        
        // Filtra portas que parecem ser Arduino (por fabricante ou IDs)
        const arduinoPorts = ports.filter(p => {
            const manufacturer = (p.manufacturer || '').toLowerCase();
            const productId = (p.productId || '').toLowerCase();
            const vendorId = (p.vendorId || '').toLowerCase();
            
            // Verifica se e um Arduino ou adaptador USB-serial comum
            return manufacturer.includes('arduino') ||
                   manufacturer.includes('ch340') ||
                   manufacturer.includes('cp210') ||
                   manufacturer.includes('ftdi') ||
                   productId.includes('2341') ||
                   vendorId.includes('2341') ||
                   vendorId.includes('1a86') ||
                   vendorId.includes('10c4');
        });
        
        if (arduinoPorts.length > 0) {
            console.log('Arduino encontrado em:', arduinoPorts[0].path);
            return arduinoPorts[0].path;
        }
        
        // Se nao encontrar por fabricante, tenta portas comuns em cada SO
        const commonPorts = [
            // Windows
            'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'COM10', 'COM11', 'COM12', 'COM13', 'COM14', 'COM15',
            // Linux
            '/dev/ttyUSB0', '/dev/ttyUSB1', '/dev/ttyUSB2',
            '/dev/ttyACM0', '/dev/ttyACM1', '/dev/ttyACM2',
            // macOS
            '/dev/tty.usbmodem14101', '/dev/tty.usbmodem14201',
            '/dev/tty.usbserial-1410', '/dev/tty.usbserial-1420'
        ];
        
        // Testa cada porta comum tentando abrir
        for (const portPath of commonPorts) {
            try {
                const testPort = new SerialPort({ 
                    path: portPath, 
                    baudRate: 9600,
                    autoOpen: false
                });
                
                // Tenta abrir a porta
                await new Promise((resolve, reject) => {
                    testPort.open((err) => {
                        if (err) {
                            reject(err);
                        } else {
                            testPort.close();
                            resolve();
                        }
                    });
                });
                
                console.log('Porta encontrada:', portPath);
                return portPath;
            } catch (e) {
                // Porta nao disponivel, continua tentando
            }
        }
        
        console.log('Nenhuma porta Arduino encontrada. Conecte o dispositivo e reinicie.');
        return null;
    } catch (err) {
        console.error('Erro ao listar portas:', err);
        return null;
    }
}

// Funcao para configurar a porta serial
function setupSerialPort(portPath) {
    if (!portPath) {
        console.log('Porta nao disponivel. Aguardando conexao...');
        return;
    }
    
    try {
        // Configuracao da porta serial do Arduino
        port = new SerialPort({ 
            path: portPath, 
            baudRate: 9600                // Mesma taxa configurada no Arduino
        });
        
        // Parser para ler os dados enviados pelo Arduino linha por linha (delimitado por \r\n)
        parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
        
        // Objeto que armazena os valores mais recentes de cada sensor (incluindo os novos)
        let latestData = {
            temperatura: 0,
            distancia: 0,
            periodo: 0,
            luminosidade: 0,
            buzzer: 0,
            hall: '---',
            motor: 0,
            servo: 0,
            piezo: 0
        };

        // Variavel que guarda o ultimo comando enviado (1=temp, 2=dist, 3=periodo, 4=luz, 5=buzzer, 6=hall, 7=motor, 8=servo, 9=piezo)
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
            
            // Para o sensor Hall (comando 6), o dado e textual
            if (comando == 6) {
                latestData.hall = data.trim();
                // Envia os dados mais recentes para todos os clientes WebSocket conectados
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(latestData));
                    }
                });
                return;
            }
            
            // Para os demais sensores, o dado e numerico
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
                if (comando == 5) {
                    latestData.buzzer = numericValue;
                }
                if (comando == 7) {
                    latestData.motor = numericValue;
                }
                if (comando == 8) {
                    latestData.servo = numericValue;
                }
                if (comando == 9) {
                    latestData.piezo = numericValue;
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
            if (port && port.isOpen) {
                sendCommandToArduino(command);
                comando = command;   // Atualiza qual sensor sera preenchido no proximo dado recebido
                res.send('Comando ' + command + ' enviado para o Arduino');
            } else {
                res.status(500).send('Porta serial nao disponivel');
            }
        });
        
        // Evento quando a porta e aberta
        port.on('open', () => {
            console.log('Porta serial aberta em:', portPath);
        });
        
        // Evento quando ocorre erro na porta
        port.on('error', (err) => {
            console.error('Erro na porta serial:', err.message);
        });
        
        // Evento quando a porta e fechada
        port.on('close', () => {
            console.log('Porta serial fechada');
        });
        
        console.log('Conectado ao Arduino em:', portPath);
        
    } catch (err) {
        console.error('Erro ao configurar porta serial:', err.message);
    }
}

// Funcao para tentar reconectar automaticamente
async function tryReconnect() {
    console.log('Tentando reconectar ao Arduino...');
    const portPath = await findArduinoPort();
    if (portPath) {
        setupSerialPort(portPath);
    } else {
        console.log('Nenhum Arduino encontrado. Tentando novamente em 5 segundos...');
        setTimeout(tryReconnect, 5000);
    }
}

// Inicializa a conexao serial
(async function initSerial() {
    const portPath = await findArduinoPort();
    if (portPath) {
        setupSerialPort(portPath);
    } else {
        console.log('Arduino nao encontrado. Tentando novamente em 5 segundos...');
        setTimeout(tryReconnect, 5000);
    }
})();

// Rota para listar portas seriais disponiveis
app.get('/ports', async (req, res) => {
    try {
        const ports = await SerialPort.list();
        res.json(ports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rota para alterar a porta serial manualmente
app.get('/port/:path', async (req, res) => {
    const newPath = req.params.path;
    try {
        if (port && port.isOpen) {
            port.close();
        }
        setupSerialPort(newPath);
        res.json({ success: true, path: newPath });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Inicia o servidor na porta 3000
server.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});

// Tratamento para fechar a porta ao encerrar o servidor
process.on('SIGINT', () => {
    if (port && port.isOpen) {
        port.close();
    }
    process.exit();
});