// TEMA CLARO / ESCURO

// Atualiza o ícone do botão de tema conforme o modo ativo.
function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    const isLightTheme = theme === 'light';
    const themeIcon = themeToggle.querySelector('i');
    themeIcon.className = `bi ${isLightTheme ? 'bi-brightness-high-fill' : 'bi-moon-stars-fill'}`;
    themeToggle.setAttribute('aria-label', isLightTheme ? 'Ativar modo escuro' : 'Ativar modo claro');
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

document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme') || 'light';

    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    if (!themeToggle) return;

    themeToggle.addEventListener('click', function(event) {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);

        Object.keys(charts).forEach(function(sensor) {
            if (charts[sensor]) updateChartTheme(sensor);
        });

        if (event.detail > 0) themeToggle.blur();
    });
});