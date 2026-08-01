// TEMA CLARO / ESCURO

// Atualiza o ícone do botão de tema (◑ para claro, ◐ para escuro)
function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    themeToggle.textContent = theme === 'light' ? '◑' : '◐';
}

// Reconfigura as cores do gráfico conforme o tema atual (escuro ou claro)
function updateChartTheme(sensor) {
    const chart = charts[sensor];
    if (!chart) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const textColor = isDark ? '#e2e8f0' : '#666666';

    if (chart.options.scales) {
        if (chart.options.scales.x) {
            if (chart.options.scales.x.ticks) chart.options.scales.x.ticks.color = textColor;
            if (chart.options.scales.x.grid) chart.options.scales.x.grid.color = gridColor;
            if (chart.options.scales.x.title) chart.options.scales.x.title.color = textColor;
        }
        if (chart.options.scales.y) {
            if (chart.options.scales.y.ticks) chart.options.scales.y.ticks.color = textColor;
            if (chart.options.scales.y.grid) chart.options.scales.y.grid.color = gridColor;
            if (chart.options.scales.y.title) chart.options.scales.y.title.color = textColor;
        }
    }

    if (chart.options.plugins && chart.options.plugins.legend && 
        chart.options.plugins.legend.labels) {
        chart.options.plugins.legend.labels.color = textColor;
    }

    chart.update('none');
}