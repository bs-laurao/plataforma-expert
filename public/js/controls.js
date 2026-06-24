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