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

// Exibe o modal de escolha (tabela ou gráfico) após clicar em um card
function showMonitor(type) {
    currentSensor = type;
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('viewModal').style.display = 'flex';
    window._selectedSensorForModal = type;
}

// Quando o usuário escolhe o tipo de visualização, fechamos o modal de escolha
// e exibimos o aviso antes de abrir a tela do sensor.
function selectView(view) {
    currentView = view;
    document.getElementById('viewModal').style.display = 'none';
    const sensor = window._selectedSensorForModal || currentSensor;
    if (!sensor) return;

    // Salva a escolha pendente até o aviso ser confirmado.
    window._pendingViewSelection = { sensor, view };
    showWarningModal(sensor, view);
}

// Abre o modal de aviso com mensagem personalizada para sensor e tipo.
function showWarningModal(sensor, view) {
    const warnModal = document.getElementById('warnModal');
    if (!warnModal) return;

    const warnTitle = warnModal.querySelector('.warn-title');
    const warnText = warnModal.querySelector('.warn-text');
    if (warnTitle) {
        warnTitle.textContent = `Aviso antes de iniciar ${view === 'graph' ? 'o gráfico' : 'a tabela'}`;
    }
    if (warnText) {
        warnText.textContent = `Certifique-se de que o dispositivo conectado no Arduino corresponde ao sensor selecionado. Antes de iniciar a coleta de dados, lembre-se de reiniciar o Arduino.`;
    }

    warnModal.style.display = 'flex';
}

function confirmWarningSelection() {
    // Usuário confirmou o aviso; prossegue para abrir a tela do sensor.
    const pending = window._pendingViewSelection;
    if (!pending) return;

    window._pendingViewSelection = null;
    document.getElementById('warnModal').style.display = 'none';
    openSensorScreen(pending.sensor, pending.view);
}

function closeWarningModal() {
    // Se o aviso for fechado, cancela a seleção pendente e volta ao menu.
    document.getElementById('warnModal').style.display = 'none';
    window._pendingViewSelection = null;
    showMenu();
}

function openSensorScreen(sensor, view) {
    showSamplingControl(true); // Mostra o seletor de intervalo de amostragem

    // Oculta todas as telas de monitoramento e mostra apenas a do sensor escolhido
    document.querySelectorAll('.monitor-screen').forEach(s => s.style.display = 'none');
    const screenEl = document.getElementById(sensor + 'Screen');
    if (!screenEl) return;
    screenEl.style.display = 'block';

    // Usa a função selectViewType para sincronizar abas e containers
    selectViewType(view);
}