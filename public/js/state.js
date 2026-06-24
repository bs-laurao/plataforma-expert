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