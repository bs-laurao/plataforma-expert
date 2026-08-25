
// MAIN.JS - INICIALIZAÇÃO PRINCIPAL

// CONFIGURAÇÃO DOS SENSORES
const SENSORS_CONFIG = [
    { id: 'temperature', label: 'Temperatura', icon: 'Temperatura.png', desc: 'Monitoramento de temperatura', unit: '°C', tagClass: 'temperature-tag', cmd: '1' },
    { id: 'distance', label: 'Distância', icon: 'Distancia.png', desc: 'Medição de distância com sensores', unit: 'cm', tagClass: 'distance-tag', cmd: '2' },
    { id: 'period', label: 'Pisca Led', icon: 'PiscaLed.png', desc: 'Análise de períodos oscilatórios', unit: 'ms', tagClass: 'pisca-led-tag', cmd: '3' },
    { id: 'light', label: 'Luminosidade', icon: 'Luminosidade.png', desc: 'Percentual de luz no sensor', unit: '%', tagClass: 'light-tag', cmd: '4' },
    { id: 'buzzer', label: 'Buzzer', icon: 'Buzzer.png', desc: 'Controle de frequência audível (20Hz - 20kHz)', unit: 'Hz', tagClass: 'buzzer-tag', cmd: '5' },
    { id: 'hall', label: 'Sensor Hall', icon: 'SensorHall.png', desc: 'Detecção de polaridade magnética', unit: '', tagClass: 'hall-tag', cmd: '6', isHall: true },
    { id: 'motor', label: 'Motor CC', icon: 'MotorCC.png', desc: 'Controle em percentual da velocidade', unit: '%', tagClass: 'motor-tag', cmd: '7' },
    { id: 'servo', label: 'Servo Motor', icon: 'MotorServo.png', desc: 'Ângulo do prisma', unit: '°', tagClass: 'servo-tag', cmd: '8' },
    { id: 'piezo', label: 'Piezoelétrico', icon: 'Piezoeletrico.png', desc: 'Detecção de vibrações', unit: 'ADC', tagClass: 'piezo-tag', cmd: '9', isPiezo: true }
];

// FUNÇÃO: GERAR CARDS DO MENU
function generateDeviceCards() {
    console.log('Gerando cards...');
    const grid = document.getElementById('devicesGrid');
    if (!grid) {
        console.error('Elemento devicesGrid não encontrado!');
        return;
    }
    
    grid.innerHTML = SENSORS_CONFIG.map(sensor => `
        <div class="device-card" data-sensor="${sensor.id}">
            <div class="device-icon"><img src="imagem/${sensor.icon}" alt="${sensor.label}" /></div>
            <div class="device-card-content">
                <h3>${sensor.label}</h3>
                <p>${sensor.desc}</p>
            </div>
            <span class="device-tag ${sensor.tagClass}" aria-label="${sensor.label}"></span>
        </div>
    `).join('');

    console.log('Cards gerados:', grid.children.length);
}


// FUNÇÃO: GERAR TELAS DOS SENSORES
function generateSensorScreens() {
    console.log('Gerando telas dos sensores...');
    const container = document.getElementById('sensorScreensContainer');
    if (!container) {
        console.error('Elemento sensorScreensContainer não encontrado!');
        return;
    }
    
    container.innerHTML = SENSORS_CONFIG.map(sensor => {
        const defaultVal = sensor.isHall ? '---' : '0.0';
        const unitHtml = sensor.unit ? `<span class="unit">${sensor.unit}</span>` : '';
        
        return `
            <div class="monitor-screen" id="${sensor.id}Screen">
                <div class="screen-header">
                    <div class="sensor-header-left">
                        <div class="sensor-badge ${sensor.tagClass}"></div>
                        <div class="sensor-title"><h2>${sensor.label}</h2></div>
                    </div>
                    <div class="tabs">
                        <button class="tab-btn active" data-sensor="${sensor.id}" data-view="table">Tabela</button>
                        <button class="tab-btn" data-sensor="${sensor.id}" data-view="graph">Gráfico</button>
                    </div>
                    <div class="export-buttons">
                        <button class="export-btn" data-sensor="${sensor.id}" data-action="image">
                            <svg class="export-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21 5h-3.2l-1.6-2H7.8L6.2 5H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1zm-9 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zM12 9.5A2.5 2.5 0 1 0 12 14.5 2.5 2.5 0 0 0 12 9.5z"/></svg>
                            Salvar Imagem
                        </button>
                        <button class="export-btn" data-sensor="${sensor.id}" data-action="csv">
                            <svg class="export-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16h-8v-2h8v2zm0-4h-8v-2h8v2zM13 9V3.5L18.5 9H13z"/></svg>
                            Salvar CSV
                        </button>
                    </div>
                </div>

                <div class="view-container table-view active">
                    <div class="big-value">
                        <span id="${sensor.id}">${defaultVal}</span>
                        ${unitHtml}
                        <div class="time-display">Tempo: <span id="${sensor.id}Time">00:00</span></div>
                    </div>
                </div>

                <div class="view-container graph-view">
                    <div class="chart-wrapper">
                        <canvas id="${sensor.id}Chart"></canvas>
                    </div>
                </div>

                <div class="monitor-footer">
                    <div class="zoom-hint">
                        <span> Ctrl+Scroll: Zoom | Shift+Arrastar: Pan | </span>
                        <span class="zoom-hint-reset" data-sensor="${sensor.id}">Resetar Zoom</span>
                    </div>
                    <div class="compact-controls">
                        <button class="control-btn start" data-sensor="${sensor.id}" data-action="start"><span class="btn-icon">▶</span> Iniciar</button>
                        <button class="control-btn pause" data-sensor="${sensor.id}" data-action="pause"><span class="btn-icon">⏸</span> Pausar</button>
                        <button class="control-btn clear" id="clearBtn-${sensor.id}" data-sensor="${sensor.id}" data-action="clear"><span class="btn-icon">✕</span> Limpar</button>
                    </div>
                </div>

            </div>
        `;
    }).join('');

    console.log('Telas geradas:', container.children.length);
}


// FUNÇÃO: CONFIGURAR EVENT LISTENERS
function setupEventListeners() {
    console.log('Configurando event listeners...');
    
    // 1. Cards do menu
    document.querySelectorAll('.device-card').forEach(card => {
        card.addEventListener('click', function() {
            const sensor = this.dataset.sensor;
            console.log('Card clicado:', sensor);
            if (sensor && typeof showMonitor === 'function') {
                showMonitor(sensor);
            } else {
                console.error('showMonitor não está definida ou sensor inválido');
            }
        });
    });

    // 2. Botões das abas
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const sensor = this.dataset.sensor;
            const view = this.dataset.view;
            if (sensor && typeof selectViewType === 'function') {
                currentSensor = sensor;
                selectViewType(view);
            }
        });
    });

    // 3. Botões de exportação
    document.querySelectorAll('.export-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const sensor = this.dataset.sensor;
            const action = this.dataset.action;
            if (sensor) {
                if (action === 'image' && typeof saveChartImage === 'function') {
                    saveChartImage(sensor);
                } else if (action === 'csv' && typeof saveDataCSV === 'function') {
                    saveDataCSV(sensor);
                }
            }
        });
    });

    // 4. Seletor de tipo de gráfico no cabeçalho
    const chartTypeSelect = document.getElementById('chartTypeSelect');
    if (chartTypeSelect) {
        chartTypeSelect.addEventListener('change', function() {
            if (currentSensor && typeof changeChartType === 'function') {
                changeChartType(currentSensor, this.value);
            }
        });
    }

    // 5. Resetar Zoom
    document.querySelectorAll('.zoom-hint-reset').forEach(el => {
        el.addEventListener('click', function() {
            const sensor = this.dataset.sensor;
            if (sensor && typeof resetZoom === 'function') {
                resetZoom(sensor);
            }
        });
    });

    // 6. Botões de controle
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const sensor = this.dataset.sensor;
            const action = this.dataset.action;
            if (!sensor) return;
            
            const config = SENSORS_CONFIG.find(s => s.id === sensor);
            if (!config) return;
            
            if (action === 'start' && typeof sendCommand === 'function') {
                sendCommand(config.cmd);
            } else if (action === 'pause' && typeof sendCommand === 'function') {
                sendCommand(config.cmd + 'p');
            } else if (action === 'clear' && typeof clearSensorData === 'function') {
                clearSensorData(sensor);
            }
        });
    });

    console.log('Event listeners configurados!');
}

// INICIALIZAÇÃO PRINCIPAL
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando aplicação...');

  
    // GERA CARDS E TELAS
    generateDeviceCards();
    generateSensorScreens();
    

    //  CONFIGURA OS EVENT LISTENERS
   
    setupEventListeners();

    
    // TEMA (CLARO/ESCURO)
    
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
            
            Object.keys(charts).forEach(sensor => {
                if (charts[sensor]) updateChartTheme(sensor);
            });
        });
    }

    
    // BOTÕES DO HEADER

    const backBtn = document.getElementById('backBtn');
    if (backBtn) backBtn.addEventListener('click', closeView);

    const changeDeviceBtn = document.getElementById('changeDeviceBtn');
    if (changeDeviceBtn) changeDeviceBtn.addEventListener('click', closeView);

    const samplingSelect = document.getElementById('samplingSelect');
    if (samplingSelect) {
        samplingSelect.addEventListener('change', function() {
            setSamplingInterval(Number(this.value));
        });
    }

   
    // MODAIS
   
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

    const closeWarnModalBtn = document.getElementById('closeWarnModalBtn');
    if (closeWarnModalBtn) closeWarnModalBtn.addEventListener('click', closeWarningModal);

    const confirmWarnBtn = document.getElementById('confirmWarnBtn');
    if (confirmWarnBtn) confirmWarnBtn.addEventListener('click', confirmWarningSelection);

    const viewTableBtn = document.getElementById('viewTableBtn');
    if (viewTableBtn) viewTableBtn.addEventListener('click', function() { selectView('table'); });

    const viewGraphBtn = document.getElementById('viewGraphBtn');
    if (viewGraphBtn) viewGraphBtn.addEventListener('click', function() { selectView('graph'); });

    
    // INICIALIZAÇÃO FINAL
  
    showMenu();
    setSamplingInterval(0.1);
    
    if (timeTickerId) clearInterval(timeTickerId);
    timeTickerId = setInterval(updateTimeDisplays, TIME_TICK_MS);

    console.log('Aplicação inicializada com sucesso!');
});


// REDIMENSIONAMENTO DA JANELA

window.addEventListener('resize', () => {
    Object.values(charts).forEach(chart => chart?.resize?.());
});ss