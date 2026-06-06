// Conectar ao servidor WebSocket na porta 3000
const ws = new WebSocket('ws://localhost:3000');
const connectionStatus = document.getElementById('connectionStatus');

// Quando a conexao WebSocket for estabelecida
ws.onopen = function() {
    connectionStatus.textContent = 'Conectado';
    connectionStatus.className = 'status-connected';
};

// Quando a conexao WebSocket for fechada
ws.onclose = function() {
    connectionStatus.textContent = 'Desconectado';
    connectionStatus.className = 'status-disconnected';
};

// Processar os dados recebidos do servidor via WebSocket
ws.onmessage = function(event) {
    const data = JSON.parse(event.data);  // Converte o JSON recebido em objeto
    console.log('Dados recebidos via WebSocket:', data);
    
    // Atualiza os valores nos cards da interface com 1 casa decimal
    document.getElementById('temperature').textContent = data.temperatura.toFixed(1);
    document.getElementById('distance').textContent = data.distancia.toFixed(1);
    document.getElementById('period').textContent = data.periodo.toFixed(1);
    document.getElementById('light').textContent = data.luminosidade.toFixed(1);
};

// Enviar comando para o Arduino via HTTP (requisicao assincrona)
async function sendCommand(command) {
    try {
        const response = await fetch(`/command/${command}`);  // Envia comando para o servidor
        const data = await response.text();  // Aguarda a resposta
        console.log(data);
    } catch (error) {
        console.error('Erro:', error);
    }
}