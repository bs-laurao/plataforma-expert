// Mapeia os digitos dos comandos para os IDs dos sensores
const SENSOR_MAP = { '1': 'temperature', '2': 'distance', '3': 'period', '4': 'light' };

let charts = {};           // Armazena os objetos dos graficos (Chart.js)
let chartsActive = {};     // Indica se a coleta de dados para o grafico esta ativa
let chartStartTime = {};   // Timestamp do inicio da coleta
let chartElapsedOffset = {}; // Tempo acumulado quando pausado
let currentView = 'table'; // Visualizacao atual: 'table' ou 'graph'
let currentSensor = '';    // Sensor que esta sendo monitorado no momento

// Reseta os dados de um sensor especifico (valor numerico e grafico)
function resetSensor(sensor) {
    // Reseta o valor exibido na tela
    const el = document.getElementById(sensor);
    if (el) {
        el.textContent = '0.0';
    }

    // Para a coleta do grafico
    chartsActive[sensor] = false;
    chartStartTime[sensor] = null;
    chartElapsedOffset[sensor] = 0;

    // Limpa o grafico se ele existir
    if (charts[sensor]) {
        charts[sensor].data.labels = [];
        charts[sensor].data.datasets[0].data = [];
        charts[sensor].update();
    }
}

// WebSocket com reconexao automatica (adicionado nesta versao)
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
        setTimeout(initWebSocket, 2000); // Tenta reconectar a cada 2 segundos
    };

    ws.onmessage = function(event) {
        let data;
        try {
            data = JSON.parse(event.data);
        } catch (err) {
            console.error('WS: JSON invalido', err);
            return;
        }
        // Atualiza os valores na interface quando chegam novos dados do servidor
        if (typeof data.temperatura === 'number') updateValue('temperature', data.temperatura);
        if (typeof data.distancia === 'number') updateValue('distance', data.distancia);
        if (typeof data.periodo === 'number') updateValue('period', data.periodo);
        if (typeof data.luminosidade === 'number') updateValue('light', data.luminosidade);
    };
}
initWebSocket();

// Exibe o modal para escolher entre tabela ou grafico (nova funcionalidade)
function showMonitor(type) {
    currentSensor = type;
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('viewModal').style.display = 'flex';
    window._selectedSensorForModal = type;
}

// Escolhe a visualizacao (tabela ou grafico) e exibe a tela do sensor
function selectView(view) {
    currentView = view;
    document.getElementById('viewModal').style.display = 'none';
    const sensor = window._selectedSensorForModal || currentSensor;
    if (!sensor) return;

    // Esconde todas as telas de monitoramento e mostra a do sensor selecionado
    document.querySelectorAll('.monitor-screen').forEach(s => s.style.display = 'none');
    const screenEl = document.getElementById(sensor + 'Screen');
    if (!screenEl) return;
    screenEl.style.display = 'block';

    // Exibe apenas o container da visualizacao escolhida (table-view ou graph-view)
    screenEl.querySelectorAll('.view-container').forEach(c => c.classList.remove('active'));
    if (view === 'graph') {
        screenEl.querySelector('.graph-view')?.classList.add('active');
        initChart(sensor); // Cria o grafico, mas nao inicia a coleta automaticamente
    } else {
        screenEl.querySelector('.table-view')?.classList.add('active');
    }
}

// Volta para o menu principal e reseta todos os sensores
function showMenu() {
    // Reseta todos os sensores ao sair da tela de monitoramento
    ['temperature', 'distance', 'period', 'light'].forEach(sensor => {
        resetSensor(sensor);
    });

    document.querySelectorAll('.monitor-screen').forEach(screen => screen.style.display = 'none');
    const main = document.getElementById('mainMenu');
    if (main) main.style.display = 'grid';
    
    currentSensor = '';
    window._selectedSensorForModal = '';
    currentView = 'table';
}

// Envia comando para o Arduino via HTTP e tambem trata comandos locais (pausar/reiniciar)
async function sendCommand(command) {
    try {
        handleLocalCommand(command);  // Controle local do grafico (iniciar/pausar/reiniciar)
        const resp = await fetch(`/command/${command}`);
        const text = await resp.text();
        console.log('Command response:', text);
    } catch (err) {
        console.error('Erro ao enviar comando:', err);
    }
}

// Interpreta comandos como '1', '1p', '1r' e controla o grafico localmente
function handleLocalCommand(command) {
    const m = command.match(/^([1-4])([pr]?)$/);
    if (!m) return;
    const digit = m[1];
    const action = m[2];
    const sensor = SENSOR_MAP[digit];
    if (!sensor) return;

    if (action === '') startChartForSensor(sensor);
    else if (action === 'p') pauseChartForSensor(sensor);
    else if (action === 'r') restartChartForSensor(sensor);
}

// Inicializa o grafico de um sensor (se ainda nao existir)
function initChart(sensor) {
    if (charts[sensor]) return charts[sensor];
    const canvas = document.getElementById(sensor + 'Chart');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');

    const cfg = {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: getChartLabel(sensor),
                data: [],
                borderColor: 'rgb(75,192,192)',
                backgroundColor: 'rgba(75,192,192,0.08)',
                tension: 0.15,
                fill: true,
                pointRadius: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            scales: {
                x: {
                    type: 'category',
                    title: { display: true, text: 'Tempo decorrido' },
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        autoSkipPadding: 30
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: getYAxisLabel(sensor) }
                }
            },
            plugins: { 
                legend: { display: false },
                decimation: {
                    enabled: true,
                    algorithm: 'min-max'
                }
            }
        }
    };

    charts[sensor] = new Chart(ctx, cfg);
    chartsActive[sensor] = false;
    chartStartTime[sensor] = null;
    chartElapsedOffset[sensor] = 0;
    return charts[sensor];
}

// Retorna o rotulo do grafico para o sensor
function getChartLabel(sensor) {
    switch(sensor) {
        case 'temperature': return 'Temperatura';
        case 'distance': return 'Distancia';
        case 'period': return 'Periodo';
        case 'light': return 'Luminosidade';
        default: return sensor;
    }
}

// Retorna o titulo do eixo Y conforme o sensor
function getYAxisLabel(sensor) {
    switch(sensor) {
        case 'temperature': return 'Temperatura (°C)';
        case 'distance': return 'Distancia (cm)';
        case 'period': return 'Periodo (ms)';
        case 'light': return 'Luminosidade (%)';
        default: return '';
    }
}

// Inicia a coleta de dados para o grafico do sensor
function startChartForSensor(sensor) {
    initChart(sensor);
    if (chartsActive[sensor]) return;
    chartStartTime[sensor] = Date.now();
    chartsActive[sensor] = true;
    console.log(`Start chart ${sensor}`);
}

// Pausa a coleta de dados do grafico
function pauseChartForSensor(sensor) {
    if (!chartsActive[sensor]) return;
    const now = Date.now();
    if (chartStartTime[sensor]) chartElapsedOffset[sensor] += (now - chartStartTime[sensor]);
    chartStartTime[sensor] = null;
    chartsActive[sensor] = false;
    console.log(`Pause chart ${sensor}`);
}

// Reinicia o grafico (limpa dados e reinicia a contagem de tempo)
function restartChartForSensor(sensor) {
    const chart = initChart(sensor);
    if (!chart) return;
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update();
    chartElapsedOffset[sensor] = 0;
    chartStartTime[sensor] = Date.now();
    chartsActive[sensor] = true;
    console.log(`Restart chart ${sensor}`);
}

// Atualiza o valor numerico de um sensor e adiciona ponto ao grafico se estiver ativo
function updateValue(sensor, value) {
    const el = document.getElementById(sensor);
    if (el) {
        const v = Number(value);
        el.textContent = Number.isFinite(v) ? v.toFixed(1) : String(value);
    }

    if (!chartsActive[sensor]) return;
    const chart = charts[sensor] || initChart(sensor);
    if (!chart) return;

    const now = Date.now();
    const base = chartElapsedOffset[sensor] || 0;
    const running = chartStartTime[sensor] ? (now - chartStartTime[sensor]) : 0;
    const elapsedMs = base + running;
    const elapsedSec = Math.floor(elapsedMs / 1000);
    const minutos = Math.floor(elapsedSec / 60);
    const segundos = elapsedSec % 60;
    const label = `${minutos}:${segundos.toString().padStart(2, '0')}`;

    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(Number(value));
    chart.update('none'); // Atualizacao silenciosa (sem animacao)
}

// Inicializa a interface: exibe o menu e prepara os graficos em segundo plano
document.addEventListener('DOMContentLoaded', () => {
    showMenu();
    ['temperature','distance','period','light'].forEach(s => initChart(s));
});

// Ajusta os graficos quando a janela for redimensionada
window.addEventListener('resize', () => {
    Object.values(charts).forEach(chart => chart?.resize?.());
});