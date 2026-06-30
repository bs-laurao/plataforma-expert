// CONTROLE DO EIXO Y DOS GRÁFICOS 

// Retorna o valor máximo inicial (padrão) para cada sensor
function getDefaultYAxisMax(sensor) {
    switch (sensor) {
        case 'temperature': return 10;  // inicial baixo, será ajustado dinamicamente
        case 'distance': return 10;
        case 'period': return 10;
        case 'light': return 10; // inicia baixo e cresce dinamicamente até 100
        default: return 10;
    }
}

// Obtém o valor máximo atual para o eixo Y.
// Para luminosidade, adiciona 10% de margem sobre o maior valor observado,
// mas considera valores acima de 100 como 100 para a escala dos dados.
function getYAxisMax(sensor) {
    const maxObserved = chartMaxValue[sensor] || 0;
    if (maxObserved === 0) {
        return getDefaultYAxisMax(sensor);
    }

    const observed = sensor === 'light' ? Math.min(100, maxObserved) : maxObserved;
    // Adiciona 10% do valor observado (arredondado para cima, com pelo menos 1)
    const margin = Math.max(1, Math.ceil(observed * 0.1));
    return Math.ceil(observed + margin);
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