// ESTADO GLOBAL DA APLICAÇÃO

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
// Menor valor observado para cada sensor (usado para temperatura negativa)
let chartMinValue = {};
// Tipo de visualização atual: 'table' ou 'graph'
let currentView = 'table';
// Sensor atualmente selecionado (ex: 'temperature')
let currentSensor = '';

// Últimos valores recebidos via WebSocket para cada sensor
let lastReceivedValues = {
    temperature: 0,
    distance: 0,
    period: 0,
    light: 0,
    buzzer: 0,
    hall: '---',
    motor: 0,
    servo: 0,
    piezo: 0
};
// Timestamp da última recepção de dado
let lastReceivedAt = {
    temperature: 0,
    distance: 0,
    period: 0,
    light: 0,
    buzzer: 0,
    hall: 0,
    motor: 0,
    servo: 0,
    piezo: 0
};
// Intervalo de amostragem em milissegundos (padrão 1000ms = 1s)
let samplingIntervalMs = 1000;
// ID do timer que executa a coleta periódica
let samplingTimerId = null;
// Ticker para atualizar os relógios de tempo decorrido
let timeTickerId = null;
const TIME_TICK_MS = 200; // atualiza a cada 200ms