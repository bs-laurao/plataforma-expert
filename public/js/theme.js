// TEMA CLARO / ESCURO

// Atualiza o ícone do botão de tema (◑ para claro, ◐ para escuro)
function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.textContent = theme === 'light' ? '◑' : '◐';
}

// Reconfigura as cores do gráfico conforme o tema atual (escuro ou claro)
function updateChartTheme(sensor) {
    const chart = charts[sensor];
    if (!chart) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const textColor = isDark ? '#e2e8f0' : '#666666';

    chart.options.scales.x.ticks.color = textColor;
    chart.options.scales.x.grid.color = gridColor;
    chart.options.scales.x.title.color = textColor;

    chart.options.scales.y.ticks.color = textColor;
    chart.options.scales.y.grid.color = gridColor;
    chart.options.scales.y.title.color = textColor;

    chart.options.plugins.legend.labels.color = textColor;

    chart.update();
}