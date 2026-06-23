// CONFIGURAÇÕES E MAPEAMENTO

// Mapeia os comandos numéricos para os IDs dos sensores
// Enviar '1' inicia temperatura, '1p' pausa, etc.
const SENSOR_MAP = {
    '1': 'temperature',
    '2': 'distance',
    '3': 'period',
    '4': 'light'
};

//  ESTADO GLOBAL DA APLICAÇÃO

// Objetos que armazenam as instâncias dos gráficos (Chart.js)
let charts = {};
// Flag que indica se cada sensor está coletando dados ativamente
let chartsActive = {};
// Timestamp de quando o gráfico foi iniciado (para calcular tempo decorrido)
let chartStartTime = {};
// Acumulado de tempo em pausa (para continuar de onde parou)
let chartElapsedOffset = {};
// Maior valor observado para cada sensor (usado para escala dinâmica)
let chartMaxValue = {};
// Tipo de visualização atual: 'table' ou 'graph'
let currentView = 'table';
// Sensor atualmente selecionado (ex: 'temperature')
let currentSensor = '';

// Últimos valores recebidos via WebSocket para cada sensor
let lastReceivedValues = {};
// Timestamp da última recepção de dado
let lastReceivedAt = {};
// Intervalo de amostragem em milissegundos (padrão 1000ms = 1s)
let samplingIntervalMs = 1000;
// ID do timer que executa a coleta periódica
let samplingTimerId = null;
// Ticker para atualizar os relógios de tempo decorrido
let timeTickerId = null;
const TIME_TICK_MS = 200; // atualiza a cada 200ms


// TEMA CLARO / ESCURO

// Executado quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme') || 'light';

    // Aplica o tema salvo
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    // Listener para alternar tema ao clicar no botão
    themeToggle.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);

        // Atualiza cores dos gráficos para se adaptarem ao novo tema
        Object.keys(charts).forEach(sensor => {
            if (charts[sensor]) {
                updateChartTheme(sensor);
            }
        });
    });

    // Inicializa o menu principal e o intervalo de amostragem
    showMenu();
    setSamplingInterval(0.1); // 0.1 segundo

    // Inicia o ticker que atualiza os contadores de tempo na interface
    if (timeTickerId) clearInterval(timeTickerId);
    timeTickerId = setInterval(updateTimeDisplays, TIME_TICK_MS);
});

// Atualiza o ícone do botão de tema (◑ para claro, ◐ para escuro)
function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.textContent = theme === 'light' ? '◑' : '◐';
}

// Reconfigura as cores do gráfico conforme o tema atual (escuro ou claro)
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


// NAVEGAÇÃO ENTRE TELAS

// Fecha o modal de escolha (tabela/gráfico) e volta ao menu
function closeModal() {
    document.getElementById('viewModal').style.display = 'none';
    window._selectedSensorForModal = '';
    showMenu();
}

// Botão "Voltar" – para a coleta, reseta o sensor e retorna ao menu
function closeView() {
    if (currentSensor) {
        pauseChartForSensor(currentSensor);
        const el = document.getElementById(currentSensor);
        if (el) el.textContent = '0.0';
        const timeEl = document.getElementById(currentSensor + 'Time');
        if (timeEl) timeEl.textContent = '00:00';

        const clearBtn = document.getElementById(`clearBtn-${currentSensor}`);
        if (clearBtn) clearBtn.style.display = 'none';

        chartsActive[currentSensor] = false;
        chartStartTime[currentSensor] = null;
        chartElapsedOffset[currentSensor] = 0;
        chartMaxValue[currentSensor] = 0; // reset para escala dinâmica
        lastReceivedValues[currentSensor] = undefined;
    }
    showMenu();
    currentSensor = '';
    currentView = 'table';
    window._selectedSensorForModal = '';
}

// Alterna entre visualização em tabela ou gráfico (usando as abas dentro da tela do sensor)
function selectViewType(viewType) {
    if (!currentSensor) return;

    const screenEl = document.getElementById(currentSensor + 'Screen');
    if (!screenEl) return;

    // Remove a classe 'active' de todos os containers e abas
    screenEl.querySelectorAll('.view-container').forEach(c => c.classList.remove('active'));
    screenEl.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    // Ativa o container e a aba correspondente
    if (viewType === 'table') {
        const tableView = screenEl.querySelector('.table-view');
        if (tableView) tableView.classList.add('active');
        screenEl.querySelectorAll('.tab-btn')[0]?.classList.add('active');
    } else if (viewType === 'graph') {
        const graphView = screenEl.querySelector('.graph-view');
        if (graphView) graphView.classList.add('active');
        screenEl.querySelectorAll('.tab-btn')[1]?.classList.add('active');
        initChart(currentSensor); // Inicializa o gráfico se ainda não existir
    }
}


// CONTROLE DO EIXO Y DOS GRÁFICOS 

// Retorna o valor máximo inicial (padrão) para cada sensor
function getDefaultYAxisMax(sensor) {
    switch (sensor) {
        case 'temperature': return 10;  // inicial baixo, será ajustado dinamicamente
        case 'distance': return 10;
        case 'period': return 10;
        case 'light': return 10;
        default: return 10;
    }
}

// Obtém o valor máximo atual para o eixo Y (considerando a margem de 10%)
// Se ainda não houver dados, retorna o valor padrão
function getYAxisMax(sensor) {
    const maxObserved = chartMaxValue[sensor] || 0;
    if (maxObserved === 0) {
        return getDefaultYAxisMax(sensor);
    }
    // Adiciona 10% do valor observado (arredondado para cima, com pelo menos 1)
    const margin = Math.max(1, Math.ceil(maxObserved * 0.1));
    return Math.ceil(maxObserved + margin);
}

// Atualiza o eixo Y do gráfico para refletir o valor máximo dinâmico
function updateYAxis(sensor) {
    const chart = charts[sensor];
    if (!chart) return;
    const newMax = getYAxisMax(sensor);
    if (chart.options.scales && chart.options.scales.y) {
        chart.options.scales.y.max = newMax;
        chart.update('none');
    }
}

// RESET / LIMPEZA DE DADOS

// Reseta os valores e gráficos de um sensor (usado ao voltar ao menu)
function resetSensor(sensor) {
    const el = document.getElementById(sensor);
    if (el) el.textContent = '0.0';

    const timeEl = document.getElementById(sensor + 'Time');
    if (timeEl) timeEl.textContent = '00:00';

    chartsActive[sensor] = false;
    chartStartTime[sensor] = null;
    chartElapsedOffset[sensor] = 0;
    chartMaxValue[sensor] = 0; // zera o máximo observado

    lastReceivedValues[sensor] = undefined;
    lastReceivedAt[sensor] = undefined;

    if (charts[sensor]) {
        charts[sensor].data.labels = [];
        charts[sensor].data.datasets[0].data = [];
        // Restaura a escala inicial
        if (charts[sensor].options.scales && charts[sensor].options.scales.y) {
            charts[sensor].options.scales.y.max = getDefaultYAxisMax(sensor);
        }
        charts[sensor].update();
    }
}

// Botão "Limpar" – zera os dados e para o sensor, sem sair da tela
function clearSensorData(sensor) {
    const el = document.getElementById(sensor);
    if (el) el.textContent = '0.0';

    const timeEl = document.getElementById(sensor + 'Time');
    if (timeEl) timeEl.textContent = '00:00';

    if (charts[sensor]) {
        charts[sensor].data.labels = [];
        charts[sensor].data.datasets[0].data = [];
        // Reseta a escala para o valor padrão
        chartMaxValue[sensor] = 0;
        if (charts[sensor].options.scales && charts[sensor].options.scales.y) {
            charts[sensor].options.scales.y.max = getDefaultYAxisMax(sensor);
        }
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

// Reseta todos os sensores
function resetAllSensors() {
    Object.values(SENSOR_MAP).forEach(s => resetSensor(s));
}


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


// CONTROLE DE EXIBIÇÃO DO SELETOR DE AMOSTRAGEM

// Mostra ou esconde o controle de amostragem (quando um sensor é selecionado)
function showSamplingControl(show) {
    const wrap = document.getElementById('samplingWrapper');
    if (!wrap) return;
    wrap.style.display = show ? 'block' : 'none';
}

// Esconde todas as páginas de informação (tutorial, sobre) – placeholder
function hideAllInfoPages() {
    document.querySelectorAll('.info-page').forEach(page => page.style.display = 'none');
}

// Marca o link ativo no menu (não usado ativamente)
function setActiveNav(activeId) {
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.toggle('active', link.id === activeId);
    });
}

// Exibe o menu principal (com os cards)
function showMenu() {
    showSamplingControl(false);
    hideAllInfoPages();

    if (currentSensor) resetSensor(currentSensor);
    else resetAllSensors();

    document.querySelectorAll('.monitor-screen').forEach(screen => screen.style.display = 'none');
    const main = document.getElementById('mainMenu');
    if (main) main.style.display = 'block';

    currentSensor = '';
    window._selectedSensorForModal = '';
    currentView = 'table';
    setActiveNav('navDevices');
}


// NAVEGAÇÃO / MODAL

// Exibe o modal de escolha (tabela ou gráfico) após clicar em um card
function showMonitor(type) {
    currentSensor = type;
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('viewModal').style.display = 'flex';
    window._selectedSensorForModal = type;
}

// Escolhe a visualização e exibe a tela do sensor correspondente
function selectView(view) {
    currentView = view;
    document.getElementById('viewModal').style.display = 'none';
    const sensor = window._selectedSensorForModal || currentSensor;
    if (!sensor) return;

    showSamplingControl(true); // Mostra o seletor de intervalo de amostragem

    // Oculta todas as telas de monitoramento e mostra apenas a do sensor escolhido
    document.querySelectorAll('.monitor-screen').forEach(s => s.style.display = 'none');
    const screenEl = document.getElementById(sensor + 'Screen');
    if (!screenEl) return;
    screenEl.style.display = 'block';

    // Usa a função selectViewType para sincronizar abas e containers (corrige o bug das abas)
    selectViewType(view);

    // Se for gráfico, inicializa o Chart.js
    if (view === 'graph') {
        initChart(sensor);
    }
}


// COMANDOS (ENVIA PARA O ARDUINO VIA HTTP)

// Envia comando para o Arduino via HTTP e também trata localmente (início/pausa/limpeza)
async function sendCommand(command) {
    try {
        handleLocalCommand(command);
        await fetch(`/command/${command}`);
    } catch (err) {
        console.error('Erro ao enviar comando:', err);
    }
}

// Interpreta comandos como '1', '1p', '1r' e controla o gráfico localmente
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


// GERENCIAMENTO DOS GRÁFICOS (CHART.JS)

// Inicializa ou retorna o gráfico de um sensor, aplicando tema atual e limite Y dinâmico
function initChart(sensor) {
    // Se o gráfico já existe, apenas atualiza a escala e retorna
    if (charts[sensor]) {
        const existing = charts[sensor];
        // Atualiza o máximo com base no valor atual (pode ser zero)
        const newMax = getYAxisMax(sensor);
        if (existing.options && existing.options.scales && existing.options.scales.y) {
            existing.options.scales.y.max = newMax;
            existing.update('none');
        }
        return charts[sensor];
    }

    // Cria um novo gráfico
    const canvas = document.getElementById(sensor + 'Chart');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');

    // Obtém cores conforme o tema atual
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const textColor = isDark ? '#e2e8f0' : '#666666';

    // Configuração do gráfico - padrão ÁREA
    const cfg = {
        type: 'line', // tipo 'line' com fill:true simula área
        data: {
            labels: [], // rótulos do eixo X (tempo decorrido)
            datasets: [{
                label: getChartLabel(sensor),
                data: [], // valores do sensor
                borderColor: '#6b5bbb',
                backgroundColor: 'rgba(107, 91, 187, 0.3)',
                tension: 0.15,
                fill: true,   // ÁREA
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 }, // sem animação para evitar atrasos
            scales: {
                x: {
                    type: 'category',
                    title: { display: true, text: 'Tempo decorrido', color: textColor },
                    ticks: { maxRotation: 0, autoSkip: true, autoSkipPadding: 30, color: textColor },
                    grid: { color: gridColor }
                },
                y: {
                    beginAtZero: true,
                    max: getYAxisMax(sensor), // valor dinâmico inicial
                    title: { display: true, text: getYAxisLabel(sensor), color: textColor },
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                }
            },
            plugins: {
                legend: { display: true, labels: { color: textColor } },
                decimation: { enabled: true, algorithm: 'min-max' } // reduz pontos para performance
            }
        }
    };

    charts[sensor] = new Chart(ctx, cfg);
    chartsActive[sensor] = false;
    chartStartTime[sensor] = null;
    chartElapsedOffset[sensor] = 0;
    chartMaxValue[sensor] = 0; // inicia sem dados
    return charts[sensor];
}

// Retorna o rótulo amigável do sensor para exibir na legenda
function getChartLabel(sensor) {
    switch (sensor) {
        case 'temperature': return 'Temperatura';
        case 'distance': return 'Distância';
        case 'period': return 'Período';
        case 'light': return 'Luminosidade';
        default: return sensor;
    }
}

// Retorna o rótulo do eixo Y com unidade
function getYAxisLabel(sensor) {
    switch (sensor) {
        case 'temperature': return 'Temperatura (°C)';
        case 'distance': return 'Distância (cm)';
        case 'period': return 'Período (ms)';
        case 'light': return 'Luminosidade (%)';
        default: return '';
    }
}


// INICIAR / PAUSAR / REINICIAR

// Inicia a coleta para um sensor
function startChartForSensor(sensor) {
    initChart(sensor);
    if (!chartElapsedOffset[sensor]) chartElapsedOffset[sensor] = 0;
    if (chartsActive[sensor]) return;
    chartStartTime[sensor] = Date.now();
    chartsActive[sensor] = true;

    // Mostra o botão "Limpar"
    const clearBtn = document.getElementById(`clearBtn-${sensor}`);
    if (clearBtn) clearBtn.style.display = 'block';

    console.log(`Start chart ${sensor}`);
}

// Pausa a coleta para um sensor
function pauseChartForSensor(sensor) {
    if (!chartsActive[sensor]) return;
    const now = Date.now();
    if (chartStartTime[sensor]) chartElapsedOffset[sensor] += (now - chartStartTime[sensor]);
    chartStartTime[sensor] = null;
    chartsActive[sensor] = false;
    console.log(`Pause chart ${sensor}`);
}

// Reinicia a coleta (limpa dados e começa de novo)
function restartChartForSensor(sensor) {
    const chart = initChart(sensor);
    if (!chart) return;

    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chartMaxValue[sensor] = 0;
    // Reseta a escala
    if (chart.options.scales && chart.options.scales.y) {
        chart.options.scales.y.max = getDefaultYAxisMax(sensor);
    }
    chart.update();

    chartElapsedOffset[sensor] = 0;
    chartStartTime[sensor] = Date.now();
    chartsActive[sensor] = true;

    lastReceivedValues[sensor] = undefined;
    const el = document.getElementById(sensor);
    if (el) el.textContent = '0.0';

    console.log(`Restart chart ${sensor} (fresh start)`);
}


// FORMATAÇÃO DE TEMPO E VALORES

// Converte milissegundos em string MM:SS
function formatElapsedMsToMMSS(ms) {
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return `${mm}:${ss}`;
}

// Impede valores negativos para sensores que não fazem sentido (exceto temperatura)
function clampValueForSensor(sensor, raw) {
    const v = Number(raw);
    if (!Number.isFinite(v)) return raw;
    if (sensor === 'temperature') return v;
    return v < 0 ? 0 : v;
}


// AMOSTRAGEM E ATUALIZAÇÃO PERIÓDICA

// Processa um único sensor: se ativo, atualiza o valor numérico, adiciona ponto no gráfico e ajusta escala
function processSample(sensor) {
    const raw = lastReceivedValues[sensor];
    if (raw === undefined) return;

    const v = clampValueForSensor(sensor, raw);

    // Atualiza o valor numérico na tela (tabela)
    if (chartsActive[sensor]) {
        const el = document.getElementById(sensor);
        if (el) el.textContent = (typeof v === 'number') ? v.toFixed(1) : String(v);
    }

    // Se o gráfico não estiver ativo, não adiciona ponto
    if (!chartsActive[sensor]) return;
    const chart = charts[sensor] || initChart(sensor);
    if (!chart) return;

    // Calcula o tempo decorrido desde o início (considerando pausas)
    const now = Date.now();
    const base = chartElapsedOffset[sensor] || 0;
    const running = chartStartTime[sensor] ? (now - chartStartTime[sensor]) : 0;
    const elapsedMs = base + running;
    const label = formatElapsedMsToMMSS(elapsedMs);

    // Adiciona o novo ponto ao gráfico
    chart.data.labels.push(label);
    const numericValue = typeof v === 'number' ? v : Number(v);
    chart.data.datasets[0].data.push(numericValue);

    // === ESCALA DINÂMICA: atualiza o máximo observado ===
    if (numericValue > (chartMaxValue[sensor] || 0)) {
        chartMaxValue[sensor] = numericValue;
        // Atualiza o eixo Y com a nova margem de 10%
        const newMax = getYAxisMax(sensor);
        if (chart.options.scales && chart.options.scales.y) {
            chart.options.scales.y.max = newMax;
        }
    }

    chart.update('none'); // atualização silenciosa (sem animação)
}

// Função chamada a cada intervalo de amostragem (ex: a cada 100ms)
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



// EVENTOS DE JANELA

// Redimensiona os gráficos quando a janela for redimensionada
window.addEventListener('resize', () => {
    Object.values(charts).forEach(chart => chart?.resize?.());
});


// FUNÇÕES DE EXPORTAÇÃO (SALVAR IMAGEM E CSV)

 //Salva a imagem do gráfico de um sensor em PNG (download via navegador)
 //Usa o método toBase64Image() do Chart.js para gerar a imagem
 
function saveChartImage(sensor) {
    const chart = charts[sensor];
    if (!chart) {
        alert('Gráfico não encontrado para este sensor.');
        return;
    }
    if (chart.data.labels.length === 0) {
        alert('Não há dados no gráfico para salvar. Inicie a coleta primeiro.');
        return;
    }
    // Cria um link <a> e simula um clique para baixar o arquivo
    const link = document.createElement('a');
    link.download = `grafico_${sensor}.png`;
    link.href = chart.toBase64Image();
    link.click();
}

/**
 * Salva os dados (labels e valores) do gráfico de um sensor em CSV
 * Usa Blob para criar o arquivo e URL.createObjectURL para baixar
 */
function saveDataCSV(sensor) {
    const chart = charts[sensor];
    if (!chart) {
        alert('Dados não encontrados para este sensor.');
        return;
    }

    const labels = chart.data.labels || [];
    const values = chart.data.datasets[0].data || [];

    if (labels.length === 0) {
        alert('Não há dados para exportar. Inicie a coleta primeiro.');
        return;
    }

    // Monta o conteúdo CSV
    let csv = 'Tempo (mm:ss),Valor\n';
    for (let i = 0; i < labels.length; i++) {
        csv += `${labels[i]},${values[i]}\n`;
    }

    // Cria um Blob com o CSV e faz o download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.download = `dados_${sensor}.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href); // libera memória
}


// FUNÇÃO PARA ALTERAR O TIPO DE GRÁFICO

function changeChartType(sensor, type) {
    const chart = charts[sensor];
    if (!chart) {
        alert('Gráfico não inicializado. Inicie a coleta primeiro.');
        return;
    }

    // Salva os dados atuais para não perder
    const currentLabels = chart.data.labels.slice();
    const currentData = chart.data.datasets[0].data.slice();

    // Restaura os dados completos (para todos os tipos)
    chart.data.labels = currentLabels;
    chart.data.datasets[0].data = currentData;

    // Configura conforme o tipo escolhido
    if (type === 'area') {
        chart.config.type = 'line';
        chart.data.datasets[0].showLine = true;
        chart.data.datasets[0].pointRadius = 2;
        chart.data.datasets[0].fill = true;
        chart.data.datasets[0].backgroundColor = 'rgba(107, 91, 187, 0.3)';
        chart.data.datasets[0].borderColor = '#6b5bbb';
        chart.data.datasets[0].tension = 0.15;
    } else if (type === 'bar') {
        chart.config.type = 'bar';
        chart.data.datasets[0].showLine = false;
        chart.data.datasets[0].pointRadius = 0;
        chart.data.datasets[0].fill = false;
        chart.data.datasets[0].backgroundColor = '#6b5bbb';
        chart.data.datasets[0].borderColor = '#6b5bbb';
    } else if (type === 'scatter') {
        chart.config.type = 'line';
        chart.data.datasets[0].showLine = false;
        chart.data.datasets[0].pointRadius = 5;
        chart.data.datasets[0].fill = false;
        chart.data.datasets[0].backgroundColor = '#6b5bbb';
        chart.data.datasets[0].borderColor = '#6b5bbb';
    } else if (type === 'line') {
        chart.config.type = 'line';
        chart.data.datasets[0].showLine = true;
        chart.data.datasets[0].pointRadius = 2;
        chart.data.datasets[0].fill = false;
        chart.data.datasets[0].tension = 0.15;
        chart.data.datasets[0].borderColor = '#6b5bbb';
        chart.data.datasets[0].backgroundColor = 'rgba(107, 91, 187, 0.1)';
    } else if (type === 'line-points') {
        chart.config.type = 'line';
        chart.data.datasets[0].showLine = true;
        chart.data.datasets[0].pointRadius = 4;
        chart.data.datasets[0].fill = false;
        chart.data.datasets[0].tension = 0.15;
        chart.data.datasets[0].borderColor = '#6b5bbb';
        chart.data.datasets[0].backgroundColor = 'rgba(107, 91, 187, 0.1)';
    }

    // Garante que as escalas existam (para gráficos que não sejam pizza)
    ensureScales(chart, sensor);

    // Atualiza a escala Y com o valor dinâmico atual
    if (chart.options.scales && chart.options.scales.y) {
        chart.options.scales.y.max = getYAxisMax(sensor);
    }

    chart.update();
}

// Função auxiliar para garantir que as escalas existam (caso tenham sido removidas)
function ensureScales(chart, sensor) {
    if (!chart.options.scales) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        const textColor = isDark ? '#e2e8f0' : '#666666';
        chart.options.scales = {
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
        };
    }
}