// CONTROLE DO EIXO Y DOS GRÁFICOS 

// Retorna o valor máximo inicial (padrão) para cada sensor
function getDefaultYAxisMax(sensor) {
    // Para o Hall, o gráfico vai de -2 a 2
    if (sensor === 'hall') return 2;
    
    switch (sensor) {
        case 'temperature': return 10;  // inicial baixo, será ajustado dinamicamente
        case 'distance': return 10;
        case 'period': return 10;
        case 'light': return 10; // inicia baixo e cresce dinamicamente até 100
        case 'buzzer': return 10; 
        case 'motor': return 10; 
        case 'servo': return 10; 
        case 'piezo': return 10; 
        default: return 10;
    }
}

// Obtém o valor máximo atual para o eixo Y.
// Para luminosidade, adiciona 10% de margem sobre o maior valor observado,
// mas considera valores acima de 100 como 100 para a escala dos dados.
function getYAxisMax(sensor) {
    // Para o Hall, escala fixa
    if (sensor === 'hall') return 2;
    
    const maxObserved = chartMaxValue[sensor] || 0;
    if (maxObserved === 0) {
        return getDefaultYAxisMax(sensor);
    }

    const observed = sensor === 'light' ? Math.min(100, maxObserved) : maxObserved;
    // Adiciona 10% do valor observado (arredondado para cima, com pelo menos 1)
    const margin = Math.max(1, Math.ceil(observed * 0.1));
    return Math.ceil(observed + margin);
}

// ============================================
// NOVA FUNÇÃO: Obtém o min/max dos dados VISÍVEIS
// ============================================

function getVisibleDataRange(sensor, chart) {
    if (!chart || chart.data.labels.length === 0) {
        return { min: 0, max: getDefaultYAxisMax(sensor) };
    }
    
    const xScale = chart.scales.x;
    if (!xScale) {
        return { min: 0, max: getDefaultYAxisMax(sensor) };
    }
    
    // Obtém os índices visíveis no eixo X
    const minIndex = Math.floor(xScale.min || 0);
    const maxIndex = Math.ceil(xScale.max || chart.data.labels.length - 1);
    
    // Pega os dados visíveis
    const data = chart.data.datasets[0].data;
    const visibleData = data.slice(minIndex, maxIndex + 1);
    
    if (visibleData.length === 0) {
        return { min: 0, max: getDefaultYAxisMax(sensor) };
    }
    
    // Para o Hall, mantém escala fixa
    if (sensor === 'hall') {
        return { min: -2, max: 2 };
    }
    
    // Filtra valores válidos (não undefined, null, NaN)
    const validData = visibleData.filter(v => 
        v !== undefined && v !== null && !isNaN(v)
    );
    
    if (validData.length === 0) {
        return { min: 0, max: getDefaultYAxisMax(sensor) };
    }
    
    // Calcula min e max dos dados visíveis
    let min = Math.min(...validData);
    let max = Math.max(...validData);
    
    // Para luminosidade, limita entre 0 e 100
    if (sensor === 'light') {
        min = Math.max(0, min);
        max = Math.min(100, max);
    }
    
    // Para sensores que não podem ser negativos
    if (sensor !== 'temperature' && sensor !== 'hall') {
        min = Math.max(0, min);
    }
    
    // Adiciona margem de 10% (mínimo 1)
    const range = max - min;
    const margin = Math.max(1, range * 0.1);
    
    // Para valores muito pequenos (ex: 0.1), garante uma margem mínima
    const finalMin = min - margin;
    const finalMax = max + margin;
    
    // Se todos os valores forem iguais, cria uma escala artificial
    if (finalMax - finalMin < 1) {
        const center = (min + max) / 2;
        return {
            min: center - 5,
            max: center + 5
        };
    }
    
    return {
        min: Math.max(0, finalMin),
        max: finalMax
    };
}

// ============================================
// ATUALIZA O EIXO Y BASEADO NOS DADOS VISÍVEIS
// ============================================

function updateYAxisFromVisibleData(sensor) {
    const chart = charts[sensor];
    if (!chart) return;
    
    // Para o Hall, mantém escala fixa
    if (sensor === 'hall') {
        if (chart.options.scales && chart.options.scales.y) {
            chart.options.scales.y.min = -2;
            chart.options.scales.y.max = 2;
            chart.update('none');
        }
        return;
    }
    
    const range = getVisibleDataRange(sensor, chart);
    
    if (chart.options.scales && chart.options.scales.y) {
        chart.options.scales.y.min = range.min;
        chart.options.scales.y.max = range.max;
        chart.update('none');
    }
}

// ============================================
// ZOOM E PAN - CONFIGURAÇÃO
// ============================================

// Configuração padrão de zoom para todos os gráficos
const ZOOM_CONFIG = {
    zoom: {
        wheel: {
            enabled: true,
            speed: 0.05,
            modifierKey: 'ctrl', // Segurar Ctrl + scroll para zoom
        },
        pinch: {
            enabled: true // Suporte a touch (mobile)
        },
        mode: 'x', // Zoom apenas no eixo X (tempo)
        onZoomComplete: function({ chart }) {
            const sensor = getSensorFromChart(chart);
            if (sensor) {
                // Atualiza o estado do zoom
                updateZoomState(chart, 'zoom');
                // ATUALIZA O EIXO Y PARA OS DADOS VISÍVEIS
                updateYAxisFromVisibleData(sensor);
            }
        }
    },
    pan: {
        enabled: true,
        mode: 'x',
        modifierKey: 'shift', // Segurar Shift + arrastar para pan
        onPanComplete: function({ chart }) {
            const sensor = getSensorFromChart(chart);
            if (sensor) {
                updateZoomState(chart, 'pan');
                // ATUALIZA O EIXO Y PARA OS DADOS VISÍVEIS
                updateYAxisFromVisibleData(sensor);
            }
        }
    },
    limits: {
        x: {
            minRange: 5 // Mínimo de 5 pontos visíveis
        }
    }
};

// Estado do zoom para cada sensor
let zoomState = {};

function updateZoomState(chart, action) {
    const sensor = getSensorFromChart(chart);
    if (!sensor) return;
    
    if (!zoomState[sensor]) {
        zoomState[sensor] = {
            isZoomed: false,
            minIndex: 0,
            maxIndex: chart.data.labels.length - 1
        };
    }
    
    const xScale = chart.scales.x;
    if (xScale) {
        const min = xScale.min;
        const max = xScale.max;
        const total = chart.data.labels.length;
        
        // Verifica se está com zoom aplicado
        zoomState[sensor].isZoomed = !(min === undefined || (min === 0 && max === total - 1));
        zoomState[sensor].minIndex = Math.floor(min || 0);
        zoomState[sensor].maxIndex = Math.ceil(max || total - 1);
        
        // Atualiza o indicador visual
        updateZoomIndicator(sensor, zoomState[sensor].isZoomed);
    }
}

function getSensorFromChart(chart) {
    for (const [sensor, c] of Object.entries(charts)) {
        if (c === chart) return sensor;
    }
    return null;
}

// ============================================
// INDICADOR VISUAL DE ZOOM
// ============================================

function updateZoomIndicator(sensor, isZoomed) {
    // Procura o container do gráfico
    const chartWrapper = document.querySelector(`#${sensor}Screen .chart-wrapper`);
    if (!chartWrapper) return;
    
    // Remove indicador existente
    const existingIndicator = chartWrapper.querySelector('.zoom-indicator');
    if (existingIndicator) existingIndicator.remove();
    
    if (isZoomed) {
        // Cria indicador de zoom ativo com ícone de lupa SVG
        const indicator = document.createElement('div');
        indicator.className = 'zoom-indicator';
        indicator.innerHTML = `
            <span class="zoom-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
            </span>
            <span class="zoom-text">Zoom ativo</span>
            <button class="zoom-reset-btn" onclick="resetZoom('${sensor}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;
        chartWrapper.style.position = 'relative';
        chartWrapper.appendChild(indicator);
    } else {
        chartWrapper.style.position = '';
    }
}

// ============================================
// FUNÇÕES DE CONTROLE DE ZOOM
// ============================================

// Reset do zoom para um sensor específico
function resetZoom(sensor) {
    const chart = charts[sensor];
    if (!chart) return;
    
    chart.resetZoom();
    zoomState[sensor] = {
        isZoomed: false,
        minIndex: 0,
        maxIndex: chart.data.labels.length - 1
    };
    updateZoomIndicator(sensor, false);
    
    // Restaura o eixo Y para a escala global
    if (sensor !== 'hall') {
        const newMax = getYAxisMax(sensor);
        if (chart.options.scales && chart.options.scales.y) {
            chart.options.scales.y.min = 0;
            chart.options.scales.y.max = newMax;
            chart.update('none');
        }
    }
}

// Reset do zoom para todos os sensores
function resetAllZoom() {
    Object.keys(charts).forEach(sensor => {
        resetZoom(sensor);
    });
}

// ============================================
// FUNÇÕES DE NAVEGAÇÃO RÁPIDA (PRESETS)
// ============================================

// Zoom para os últimos N pontos
function zoomToLastPoints(sensor, points = 50) {
    const chart = charts[sensor];
    if (!chart || chart.data.labels.length === 0) return;
    
    const total = chart.data.labels.length;
    const start = Math.max(0, total - points);
    const end = total - 1;
    
    chart.zoomScale('x', { min: start, max: end });
    updateZoomState(chart, 'zoom');
    // Atualiza o eixo Y para os dados visíveis
    updateYAxisFromVisibleData(sensor);
}

// ============================================
// GERENCIAMENTO DOS GRÁFICOS (CHART.JS)
// ============================================

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

    // Para o Hall, usamos valores -1 (Sul) e 1 (Norte)
    const isHall = sensor === 'hall';

    // Configuração do gráfico - padrão ÁREA 
    const cfg = {
        type: 'line', // tipo 'line' com fill:true simula área
        data: {
            labels: [], // rótulos do eixo X (tempo decorrido)
            datasets: [{
                label: getChartLabel(sensor),
                data: [], // valores do sensor
                borderColor: '#7db1ff',
                backgroundColor: isHall ? 'rgba(125, 177, 255, 0.25)' : 'rgba(125, 177, 255, 0.3)',
                tension: 0.15,
                fill: true, 
                pointRadius: 0, 
                pointHoverRadius: 5, 
                showLine: true
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
                    beginAtZero: isHall ? false : true,
                    min: isHall ? -2 : 0,
                    max: getYAxisMax(sensor), // valor dinâmico inicial
                    title: { display: true, text: getYAxisLabel(sensor), color: textColor },
                    ticks: { 
                        color: textColor,
                        callback: function(value) {
                            if (isHall) {
                                if (value === 1) return 'Norte';
                                if (value === -1) return 'Sul';
                                if (value === 0) return '---';
                                return '';
                            }
                            return value;
                        }
                    },
                    grid: { color: gridColor }
                }
            },
            plugins: {
                legend: { display: true, labels: { color: textColor } },
                decimation: { enabled: true, algorithm: 'min-max' }, // reduz pontos para performance
                zoom: ZOOM_CONFIG // Adiciona o plugin de zoom
            }
        }
    };

    charts[sensor] = new Chart(ctx, cfg);
    chartsActive[sensor] = false;
    chartStartTime[sensor] = null;
    chartElapsedOffset[sensor] = 0;
    chartMaxValue[sensor] = 0; // inicia sem dados
    
    // Inicializa o estado do zoom
    zoomState[sensor] = {
        isZoomed: false,
        minIndex: 0,
        maxIndex: 0
    };
    
    return charts[sensor];
}

// Retorna o nome do sensor para exibir na legenda
function getChartLabel(sensor) {
    switch (sensor) {
        case 'temperature': return 'Temperatura';
        case 'distance': return 'Distância';
        case 'period': return 'Pisca Led';
        case 'light': return 'Luminosidade';
        case 'buzzer': return 'Buzzer';
        case 'hall': return 'Sensor Hall';
        case 'motor': return 'Motor CC';
        case 'servo': return 'Servo Motor';
        case 'piezo': return 'Piezoelétrico';
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
        case 'buzzer': return 'Frequência (Hz)';
        case 'hall': return 'Polaridade';
        case 'motor': return 'Velocidade (%)';
        case 'servo': return 'Ângulo (°)';
        case 'piezo': return 'Valor ADC';
        default: return '';
    }
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

    const isHall = sensor === 'hall';

    // Configura conforme o tipo escolhido 
    if (type === 'area') {
        chart.config.type = 'line';
        chart.data.datasets[0].showLine = true;
        chart.data.datasets[0].pointRadius = 0; 
        chart.data.datasets[0].pointHoverRadius = 5;
        chart.data.datasets[0].fill = true;
        chart.data.datasets[0].backgroundColor = isHall ? 'rgba(125, 177, 255, 0.25)' : 'rgba(125, 177, 255, 0.3)';
        chart.data.datasets[0].borderColor = '#7db1ff';
        chart.data.datasets[0].tension = 0.15;
        chart.data.datasets[0].pointBackgroundColor = undefined;
        chart.data.datasets[0].pointBorderColor = undefined;
    } else if (type === 'bar') {
        chart.config.type = 'bar';
        chart.data.datasets[0].showLine = false;
        chart.data.datasets[0].pointRadius = 0;
        chart.data.datasets[0].fill = false;
        chart.data.datasets[0].backgroundColor = '#7db1ff';
        chart.data.datasets[0].borderColor = '#7db1ff';
        chart.data.datasets[0].tension = undefined;
    } else if (type === 'scatter') {
        chart.config.type = 'line';
        chart.data.datasets[0].showLine = false;
        chart.data.datasets[0].pointRadius = 6;
        chart.data.datasets[0].fill = false;
        chart.data.datasets[0].backgroundColor = '#7db1ff';
        chart.data.datasets[0].borderColor = '#7db1ff';
        chart.data.datasets[0].tension = undefined;
    } else if (type === 'line') {
        chart.config.type = 'line';
        chart.data.datasets[0].showLine = true;
        chart.data.datasets[0].pointRadius = 0; 
        chart.data.datasets[0].pointHoverRadius = 5;
        chart.data.datasets[0].fill = false;
        chart.data.datasets[0].backgroundColor = 'rgba(125, 177, 255, 0.05)';
        chart.data.datasets[0].borderColor = '#7db1ff';
        chart.data.datasets[0].tension = 0.15;
        chart.data.datasets[0].pointBackgroundColor = undefined;
        chart.data.datasets[0].pointBorderColor = undefined;
    } else if (type === 'line-points') {
        chart.config.type = 'line';
        chart.data.datasets[0].showLine = true;
        chart.data.datasets[0].pointRadius = 5; 
        chart.data.datasets[0].pointHoverRadius = 7;
        chart.data.datasets[0].fill = false; 
        chart.data.datasets[0].backgroundColor = 'rgba(125, 177, 255, 0.05)';
        chart.data.datasets[0].borderColor = '#7db1ff';
        chart.data.datasets[0].tension = 0.15;
        chart.data.datasets[0].pointBackgroundColor = '#7db1ff';
        chart.data.datasets[0].pointBorderColor = '#7db1ff';
    }

    // Garante que as escalas existam 
    ensureScales(chart, sensor);

    // Atualiza a escala Y com o valor dinâmico atual
    if (chart.options.scales && chart.options.scales.y) {
        chart.options.scales.y.max = getYAxisMax(sensor);
        if (sensor === 'hall') {
            chart.options.scales.y.min = -2;
            chart.options.scales.y.beginAtZero = false;
        }
    }

    chart.update();
}

// Função auxiliar para garantir que as escalas existam (caso tenham sido removidas)
function ensureScales(chart, sensor) {
    if (!chart.options.scales) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        const textColor = isDark ? '#e2e8f0' : '#666666';
        const isHall = sensor === 'hall';
        
        chart.options.scales = {
            x: {
                type: 'category',
                title: { display: true, text: 'Tempo decorrido', color: textColor },
                ticks: { maxRotation: 0, autoSkip: true, autoSkipPadding: 30, color: textColor },
                grid: { color: gridColor }
            },
            y: {
                beginAtZero: isHall ? false : true,
                min: isHall ? -2 : 0,
                max: getYAxisMax(sensor),
                title: { display: true, text: getYAxisLabel(sensor), color: textColor },
                ticks: { 
                    color: textColor,
                    callback: function(value) {
                        if (isHall) {
                            if (value === 1) return 'Norte';
                            if (value === -1) return 'Sul';
                            if (value === 0) return '---';
                            return '';
                        }
                        return value;
                    }
                },
                grid: { color: gridColor }
            }
        };
        
        // Re-adiciona o plugin de zoom se foi removido
        if (!chart.options.plugins) {
            chart.options.plugins = {};
        }
        chart.options.plugins.zoom = ZOOM_CONFIG;
    }
}