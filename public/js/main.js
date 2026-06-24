// INICIALIZAÇÃO PRINCIPAL

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

// EVENTOS DE JANELA

// Redimensiona os gráficos quando a janela for redimensionada
window.addEventListener('resize', () => {
    Object.values(charts).forEach(chart => chart?.resize?.());
});