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
    };

    ws.onclose = function() {
        if (connectionStatus) {
            connectionStatus.textContent = 'Desconectado';
            connectionStatus.className = 'status-disconnected';
        }
        setTimeout(initWebSocket, 2000); // tenta reconectar a cada 2s
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
    };
}
initWebSocket(); // inicia a conexão