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