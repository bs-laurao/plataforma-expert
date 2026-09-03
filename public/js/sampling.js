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

// Converte milissegundos em string MM:SS:CC (usado APENAS na exportação CSV)
function formatElapsedMsToMMSSCC(ms) {
    if (ms < 0) ms = 0;
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    const cc = String(centiseconds).padStart(2, '0');
    return `${mm}:${ss}:${cc}`;
}

// Impede valores negativos para sensores que não fazem sentido (exceto temperatura)
// Para luminosidade  limita o valor em 100%.
function clampValueForSensor(sensor, raw) {
    // Para o Hall, mantém o texto
    if (sensor === 'hall') return raw;
    
    const v = Number(raw);
    if (!Number.isFinite(v)) return raw;
    // Temperatura permite valores negativos
    if (sensor === 'temperature') return v;
    if (sensor === 'light') {
        return Math.min(100, Math.max(0, v));
    }
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
        if (el) {
            if (sensor === 'hall') {
                el.textContent = String(v);
            } else if (typeof v === 'number') {
                el.textContent = v.toFixed(1);
            } else {
                el.textContent = String(v);
            }
        }
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

    // Armazena o tempo bruto em milissegundos para exportação com centésimos
    if (!chart._rawTimes) chart._rawTimes = [];
    chart._rawTimes.push(elapsedMs);

    // Para o Hall, converte texto para número (1 = Norte, -1 = Sul, 0 = neutro)
    let numericValue;
    if (sensor === 'hall') {
        const text = String(v).toLowerCase();
        if (text.includes('norte')) numericValue = 1;
        else if (text.includes('sul')) numericValue = -1;
        else numericValue = 0;
    } else {
        numericValue = typeof v === 'number' ? v : Number(v);
    }
    
    chart.data.datasets[0].data.push(numericValue);

    // ESCALA DINÂMICA: atualiza o máximo observado 
    if (sensor !== 'hall' && numericValue > (chartMaxValue[sensor] || 0)) {
        chartMaxValue[sensor] = numericValue;
        // Atualiza o eixo Y com a nova margem de 10%
        const newMax = getYAxisMax(sensor);
        const newMin = getYAxisMin(sensor);
        if (chart.options.scales && chart.options.scales.y) {
            chart.options.scales.y.max = newMax;
            chart.options.scales.y.min = newMin;
        }
    }
    
    // ESCALA DINÂMICA: atualiza o mínimo observado (para temperatura negativa)
    if (sensor === 'temperature' && numericValue < (chartMinValue[sensor] || 0)) {
        chartMinValue[sensor] = numericValue;
        const newMin = getYAxisMin(sensor);
        if (chart.options.scales && chart.options.scales.y) {
            chart.options.scales.y.min = newMin;
        }
    }

    chart.update('none'); // atualização silenciosa (sem animação)
}

// Função chamada a cada intervalo de amostragem (ex: a cada 100ms)
function sampleTick() {
    const sensores = ['temperature', 'distance', 'period', 'light', 'buzzer', 'hall', 'motor', 'servo', 'piezo'];
    sensores.forEach(sensor => processSample(sensor));
}

// Atualiza os contadores de tempo na interface (MM:SS) a cada TIME_TICK_MS (200ms)
function updateTimeDisplays() {
    const sensores = ['temperature', 'distance', 'period', 'light', 'buzzer', 'hall', 'motor', 'servo', 'piezo'];
    sensores.forEach(sensor => {
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
    samplingIntervalMs = Math.max(10, Math.round(seconds * 1000)); // mínimo 10ms (0.01s)
    if (samplingTimerId) clearInterval(samplingTimerId);
    samplingTimerId = setInterval(sampleTick, samplingIntervalMs);
    console.log(`Sampling interval set to ${samplingIntervalMs} ms`);
}