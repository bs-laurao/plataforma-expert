// Mapeia os comandos numericos para os IDs dos sensores
const SENSOR_MAP = {
    '1': 'temperature',
    '2': 'distance', 
    '3': 'period',
    '4': 'light'
};

// Armazena objetos dos graficos (Chart.js), estado ativo, tempo decorrido, deslocamento de pausa e maximo do eixo Y
let charts = {};
let chartsActive = {};
let chartStartTime = {};
let chartElapsedOffset = {};
let chartYAxisMax = {};
let currentView = 'table';
let currentSensor = '';

// Ultimos valores recebidos via WebSocket e timestamps
let lastReceivedValues = {};
let lastReceivedAt = {};
let samplingIntervalMs = 1000;   // Intervalo de amostragem (1 segundo padrao)
let samplingTimerId = null;       // Timer que executa a coleta periodica

// Timer para atualizar os contadores de tempo na interface (a cada 200ms)
let timeTickerId = null;
const TIME_TICK_MS = 200;

// ===== TEMA CLARO/ESCURO (nova funcionalidade) =====
document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    // Aplica o tema salvo no atributo do html
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);
    
    // Alterna entre claro/escuro ao clicar no botao
    themeToggle.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
        
        // Atualiza cores dos graficos quando o tema muda
        Object.keys(charts).forEach(sensor => {
            if (charts[sensor]) {
                updateChartTheme(sensor);
            }
        });
    });
    
    // Inicializacoes do app
    showMenu();
    setSamplingInterval(1);   // Define amostragem padrao de 1 segundo

    // Inicia o ticker que atualiza os temporizadores na tela
    if (timeTickerId) clearInterval(timeTickerId);
    timeTickerId = setInterval(updateTimeDisplays, TIME_TICK_MS);
});

// Altera o icone do botao de tema (◑ para claro, ◐ para escuro)
function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.textContent = theme === 'light' ? '◑' : '◐';
}

// Reconfigura as cores do grafico conforme o tema atual (escuro ou claro)
function updateChartTheme(sensor) {
    const chart = charts[sensor];
    if (!chart) return;
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const textColor = isDark ? '#e2e8f0' : '#666666';
    
    chart.options.scales.x.ticks.color = textColor;
    chart.options.scales.x.grid.color = gridColor;
    chart.options.scales.x.title.color = textColor;
    
    chart.options.scales.y.ticks.color = textColor;
    chart.options.scales.y.grid.color = gridColor;
    chart.options.scales.y.title.color = textColor;
    
    chart.options.plugins.legend.labels.color = textColor;
    
    chart.update();
}

// ===== FUNÇÕES DE NAVEGAÇÃO =====
// Fecha o modal de escolha de visualizacao e volta ao menu
function closeModal() {
    document.getElementById('viewModal').style.display = 'none';
    window._selectedSensorForModal = '';
    showMenu();
}

// Botao "Voltar" (estilizado como <) - para a coleta, reseta o sensor e retorna ao menu
function closeView() {
    if (currentSensor) {
        pauseChartForSensor(currentSensor);
        const el = document.getElementById(currentSensor);
        if (el) el.textContent = '0.0';
        const timeEl = document.getElementById(currentSensor + 'Time');
        if (timeEl) timeEl.textContent = '00:00';
        
        // Esconde o botao "Limpar" ao sair da tela
        const clearBtn = document.getElementById(`clearBtn-${currentSensor}`);
        if (clearBtn) clearBtn.style.display = 'none';
        
        chartsActive[currentSensor] = false;
        chartStartTime[currentSensor] = null;
        chartElapsedOffset[currentSensor] = 0;
        lastReceivedValues[currentSensor] = undefined;
    }
    showMenu();
    currentSensor = '';
    currentView = 'table';
    window._selectedSensorForModal = '';
}

// Alterna entre visualizacao em tabela ou grafico usando as abas dentro da tela do sensor
function selectViewType(viewType) {
    if (!currentSensor) return;
    
    const screenEl = document.getElementById(currentSensor + 'Screen');
    if (!screenEl) return;

    screenEl.querySelectorAll('.view-container').forEach(c => c.classList.remove('active'));
    screenEl.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    if (viewType === 'table') {
        const tableView = screenEl.querySelector('.table-view');
        if (tableView) tableView.classList.add('active');
        screenEl.querySelectorAll('.tab-btn')[0]?.classList.add('active');
    } else if (viewType === 'graph') {
        const graphView = screenEl.querySelector('.graph-view');
        if (graphView) graphView.classList.add('active');
        screenEl.querySelectorAll('.tab-btn')[1]?.classList.add('active');
        initChart(currentSensor);
    }
}

// ===== CONTROLE DO EIXO Y DOS GRÁFICOS =====
// Retorna o valor maximo padrao para cada sensor
function getDefaultYAxisMax(sensor) {
    switch (sensor) {
        case 'temperature': return 100;
        case 'distance': return 50;
        case 'period': return 20;
        case 'light': return 100;
        default: return 100;
    }
}

function getYAxisMax(sensor) {
    return (chartYAxisMax[sensor] !== undefined) ? chartYAxisMax[sensor] : getDefaultYAxisMax(sensor);
}

// Ajusta o limite superior do eixo Y (atualmente apenas para temperatura)
function setYAxisMax(sensor, max) {
    if (sensor !== 'temperature') return;
    const m = Number(max) || getDefaultYAxisMax(sensor);
    chartYAxisMax[sensor] = m;
    const c = charts[sensor];
    if (c && c.options && c.options.scales && c.options.scales.y) {
        c.options.scales.y.max = m;
        c.update();
    }
    console.log(`Y-axis max for ${sensor} set to ${m}`);
}

// ===== RESET / LIMPEZA DE DADOS =====
// Reseta os valores e graficos de um sensor (para quando volta ao menu)
function resetSensor(sensor) {
    const el = document.getElementById(sensor);
    if (el) el.textContent = '0.0';

    const timeEl = document.getElementById(sensor + 'Time');
    if (timeEl) timeEl.textContent = '00:00';

    chartsActive[sensor] = false;
    chartStartTime[sensor] = null;
    chartElapsedOffset[sensor] = 0;

    lastReceivedValues[sensor] = undefined;
    lastReceivedAt[sensor] = undefined;

    if (charts[sensor]) {
        charts[sensor].data.labels = [];
        charts[sensor].data.datasets[0].data = [];
        charts[sensor].update();
    }
}

// Botao "Limpar": zera os dados e para o sensor, sem sair da tela
function clearSensorData(sensor) {
    const el = document.getElementById(sensor);
    if (el) el.textContent = '0.0';

    const timeEl = document.getElementById(sensor + 'Time');
    if (timeEl) timeEl.textContent = '00:00';

    if (charts[sensor]) {
        charts[sensor].data.labels = [];
        charts[sensor].data.datasets[0].data = [];
        charts[sensor].update();
    }

    chartsActive[sensor] = false;
    chartStartTime[sensor] = null;
    chartElapsedOffset[sensor] = 0;
    lastReceivedValues[sensor] = undefined;
    
    const clearBtn = document.getElementById(`clearBtn-${sensor}`);
    if (clearBtn) clearBtn.style.display = 'none';
    
    console.log(`Clear data for ${sensor}`);
}

function resetAllSensors() {
    Object.values(SENSOR_MAP).forEach(s => resetSensor(s));
}

// ===== WEBSOCKET ===== (agora armazena os ultimos valores recebidos, sem atualizar direto a tela)
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
        setTimeout(initWebSocket, 2000);
    };

    // Ao receber dados, apenas guarda os valores e timestamps (nao atualiza interface diretamente)
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
initWebSocket();

// ===== CONTROLE DE EXIBICAO DO SELETOR DE AMOSTRAGEM =====
function showSamplingControl(show) {
    const wrap = document.getElementById('samplingWrapper');
    if (!wrap) return;
    wrap.style.display = show ? 'block' : 'none';
}

// Volta ao menu principal, resetando os sensores e escondendo o seletor de amostragem
function showMenu() {
    showSamplingControl(false);

    if (currentSensor) resetSensor(currentSensor);
    else resetAllSensors();

    document.querySelectorAll('.monitor-screen').forEach(screen => screen.style.display = 'none');
    const main = document.getElementById('mainMenu');
    if (main) main.style.display = 'block';

    currentSensor = '';
    window._selectedSensorForModal = '';
    currentView = 'table';
}

// ===== NAVEGAÇÃO / MODAL =====
// Exibe o modal de escolha (tabela ou grafico) apos clicar em um card
function showMonitor(type) {
    currentSensor = type;
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('viewModal').style.display = 'flex';
    window._selectedSensorForModal = type;
}

// Escolhe visualizacao e exibe a tela do sensor correspondente
function selectView(view) {
    currentView = view;
    document.getElementById('viewModal').style.display = 'none';
    const sensor = window._selectedSensorForModal || currentSensor;
    if (!sensor) return;

    showSamplingControl(true);   // Mostra o seletor de intervalo de amostragem

    document.querySelectorAll('.monitor-screen').forEach(s => s.style.display = 'none');
    const screenEl = document.getElementById(sensor + 'Screen');
    if (!screenEl) return;
    screenEl.style.display = 'block';

    screenEl.querySelectorAll('.view-container').forEach(c => c.classList.remove('active'));
    if (view === 'graph') {
        screenEl.querySelector('.graph-view')?.classList.add('active');
        initChart(sensor);
    } else {
        screenEl.querySelector('.table-view')?.classList.add('active');
    }
}

// ===== COMANDOS =====
// Envia comando para o Arduino via HTTP e tambem trata localmente (inicio/pausa/limpeza)
async function sendCommand(command) {
    try {
        handleLocalCommand(command);
        await fetch(`/command/${command}`);
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

// ===== GERENCIAMENTO DOS GRÁFICOS =====
// Inicializa ou retorna o grafico de um sensor, aplicando tema atual e limite Y
function initChart(sensor) {
    if (charts[sensor]) {
        const existing = charts[sensor];
        if (existing.options && existing.options.scales && existing.options.scales.y) {
            existing.options.scales.y.max = getYAxisMax(sensor);
            existing.update();
        }
        return charts[sensor];
    }
    const canvas = document.getElementById(sensor + 'Chart');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const textColor = isDark ? '#e2e8f0' : '#666666';

    const cfg = {
        type: 'line',
        data: { 
            labels: [], 
            datasets: [{ 
                label: getChartLabel(sensor), 
                data: [], 
                borderColor: '#6b5bbb', 
                backgroundColor: 'rgba(107, 91, 187, 0.1)', 
                tension: 0.15, 
                fill: true, 
                pointRadius: 2 
            }] 
        },
        options: {
            responsive: true, 
            maintainAspectRatio: false, 
            animation: { duration: 0 },
            scales: {
                x: { 
                    type: 'category', 
                    title: { display: true, text: 'Tempo decorrido', color: textColor }, 
                    ticks: { maxRotation: 0, autoSkip: true, autoSkipPadding: 30, color: textColor },
                    grid: { color: gridColor }
                },
                y: { 
                    beginAtZero: true, 
                    max: getYAxisMax(sensor), 
                    title: { display: true, text: getYAxisLabel(sensor), color: textColor },
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                }
            },
            plugins: { 
                legend: { display: true, labels: { color: textColor } }, 
                decimation: { enabled: true, algorithm: 'min-max' } 
            }
        }
    };

    charts[sensor] = new Chart(ctx, cfg);
    chartsActive[sensor] = false;
    chartStartTime[sensor] = null;
    chartElapsedOffset[sensor] = 0;
    return charts[sensor];
}

function getChartLabel(sensor) {
    switch(sensor) {
        case 'temperature': return 'Temperatura';
        case 'distance': return 'Distância';
        case 'period': return 'Período';
        case 'light': return 'Luminosidade';
        default: return sensor;
    }
}

function getYAxisLabel(sensor) {
    switch(sensor) {
        case 'temperature': return 'Temperatura (°C)';
        case 'distance': return 'Distância (cm)';
        case 'period': return 'Período (ms)';
        case 'light': return 'Luminosidade (%)';
        default: return '';
    }
}

// ===== INICIAR / PAUSAR / REINICIAR =====
function startChartForSensor(sensor) {
    initChart(sensor);
    if (!chartElapsedOffset[sensor]) chartElapsedOffset[sensor] = 0;
    if (chartsActive[sensor]) return;
    chartStartTime[sensor] = Date.now();
    chartsActive[sensor] = true;
    
    // Exibe o botao "Limpar" quando a coleta comeca
    const clearBtn = document.getElementById(`clearBtn-${sensor}`);
    if (clearBtn) clearBtn.style.display = 'block';
    
    console.log(`Start chart ${sensor}`);
}

function pauseChartForSensor(sensor) {
    if (!chartsActive[sensor]) return;
    const now = Date.now();
    if (chartStartTime[sensor]) chartElapsedOffset[sensor] += (now - chartStartTime[sensor]);
    chartStartTime[sensor] = null;
    chartsActive[sensor] = false;
    console.log(`Pause chart ${sensor}`);
}

function restartChartForSensor(sensor) {
    const chart = initChart(sensor);
    if (!chart) return;
    
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update();

    chartElapsedOffset[sensor] = 0;
    chartStartTime[sensor] = Date.now();
    chartsActive[sensor] = true;

    lastReceivedValues[sensor] = undefined;
    const el = document.getElementById(sensor);
    if (el) el.textContent = '0.0';

    console.log(`Restart chart ${sensor} (fresh start)`);
}

// ===== FORMATAÇÃO =====
// Converte milissegundos em string MM:SS
function formatElapsedMsToMMSS(ms) {
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return `${mm}:${ss}`;
}

// Impede valores negativos para sensores que nao fazem sentido (exceto temperatura)
function clampValueForSensor(sensor, raw) {
    const v = Number(raw);
    if (!Number.isFinite(v)) return raw;
    if (sensor === 'temperature') return v;
    return v < 0 ? 0 : v;
}

// ===== AMOSTRAGEM E ATUALIZAÇÃO PERIÓDICA =====
// Processa um unico sensor: se ativo, atualiza o valor numerico e adiciona ponto no grafico
function processSample(sensor) {
    const raw = lastReceivedValues[sensor];
    if (raw === undefined) return;

    const v = clampValueForSensor(sensor, raw);

    if (chartsActive[sensor]) {
        const el = document.getElementById(sensor);
        if (el) el.textContent = (typeof v === 'number') ? v.toFixed(1) : String(v);
    }

    if (!chartsActive[sensor]) return;
    const chart = charts[sensor] || initChart(sensor);
    if (!chart) return;

    const now = Date.now();
    const base = chartElapsedOffset[sensor] || 0;
    const running = chartStartTime[sensor] ? (now - chartStartTime[sensor]) : 0;
    const elapsedMs = base + running;
    const label = formatElapsedMsToMMSS(elapsedMs);

    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(typeof v === 'number' ? v : Number(v));
    chart.update('none');
}

// Funcao chamada a cada intervalo de amostragem (ex: a cada 1s)
function sampleTick() {
    Object.values(SENSOR_MAP).forEach(sensor => processSample(sensor));
}

// Atualiza os contadores de tempo na interface (MM:SS) a cada TIME_TICK_MS (200ms)
function updateTimeDisplays() {
    Object.values(SENSOR_MAP).forEach(sensor => {
        const timeEl = document.getElementById(sensor + 'Time');
        if (!timeEl) return;
        const base = chartElapsedOffset[sensor] || 0;
        const running = chartStartTime[sensor] ? (Date.now() - chartStartTime[sensor]) : 0;
        const elapsedMs = base + running;
        timeEl.textContent = elapsedMs > 0 ? formatElapsedMsToMMSS(elapsedMs) : '00:00';
    });
}

// Altera o intervalo de coleta (usado pelo seletor de amostragem)
function setSamplingInterval(seconds) {
    samplingIntervalMs = Math.max(100, Math.round(seconds * 1000));
    if (samplingTimerId) clearInterval(samplingTimerId);
    samplingTimerId = setInterval(sampleTick, samplingIntervalMs);
    console.log(`Sampling interval set to ${samplingIntervalMs} ms`);
}

// ===== EVENTOS DE JANELA =====
window.addEventListener('resize', () => {
    Object.values(charts).forEach(chart => chart?.resize?.());
});