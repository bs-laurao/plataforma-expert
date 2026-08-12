// WEBSOCKET – RECEBE DADOS DO SERVIDOR

let ws;

function initWebSocket() {
    try {
        ws = new WebSocket('ws://localhost:3000');
    } catch (e) {
        console.error('WebSocket init error', e);
        return;
    }
    const connectionStatus = document.getElementById('connectionStatus');

    ws.onopen = function() {
        if (connectionStatus) {
            connectionStatus.textContent = 'Conectado';
            connectionStatus.className = 'status-connected';
        }
        console.log('Conectado');
    };

    ws.onclose = function() {
        if (connectionStatus) {
            connectionStatus.textContent = 'Desconectado';
            connectionStatus.className = 'status-disconnected';
        }
        console.log('Desconectado');
        setTimeout(initWebSocket, 2000);
    };

    // Ao receber dados, apenas guarda os valores e timestamps (não atualiza a interface diretamente)
    ws.onmessage = function(event) {
        let data;
        try {
            data = JSON.parse(event.data);
        } catch (err) {
            console.error('WS: JSON inválido', err);
            return;
        }
        
        // Mapeamento dos dados recebidos do Arduino
        if (typeof data.temperatura === 'number') {
            lastReceivedValues.temperature = data.temperatura;
            lastReceivedAt.temperature = Date.now();
        }
        if (typeof data.distancia === 'number') {
            lastReceivedValues.distance = data.distancia;
            lastReceivedAt.distance = Date.now();
        }
        if (typeof data.periodo === 'number') {
            lastReceivedValues.period = data.periodo;
            lastReceivedAt.period = Date.now();
        }
        if (typeof data.luminosidade === 'number') {
            lastReceivedValues.light = data.luminosidade;
            lastReceivedAt.light = Date.now();
        }
        if (typeof data.buzzer === 'number') {
            lastReceivedValues.buzzer = data.buzzer;
            lastReceivedAt.buzzer = Date.now();
        }
        if (typeof data.hall === 'string') {
            lastReceivedValues.hall = data.hall;
            lastReceivedAt.hall = Date.now();
        }
        if (typeof data.motor === 'number') {
            lastReceivedValues.motor = data.motor;
            lastReceivedAt.motor = Date.now();
        }
        if (typeof data.servo === 'number') {
            lastReceivedValues.servo = data.servo;
            lastReceivedAt.servo = Date.now();
        }
        if (typeof data.piezo === 'number') {
            lastReceivedValues.piezo = data.piezo;
            lastReceivedAt.piezo = Date.now();
        }
    };
}

// Inicia a conexão após o DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWebSocket);
} else {
    initWebSocket();
}