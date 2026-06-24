// FUNÇÕES DE EXPORTAÇÃO (SALVAR IMAGEM E CSV)

 //Salva a imagem do gráfico de um sensor em PNG (download via navegador)
 //Usa o método toBase64Image() do Chart.js para gerar a imagem
 
function saveChartImage(sensor) {
    const chart = charts[sensor];
    if (!chart) {
        alert('Gráfico não encontrado para este sensor.');
        return;
    }
    if (chart.data.labels.length === 0) {
        alert('Não há dados no gráfico para salvar. Inicie a coleta primeiro.');
        return;
    }
    // Cria um link <a> e simula um clique para baixar o arquivo
    const link = document.createElement('a');
    link.download = `grafico_${sensor}.png`;
    link.href = chart.toBase64Image();
    link.click();
}

/**
 * Salva os dados (labels e valores) do gráfico de um sensor em CSV
 * O cabeçalho da segunda coluna é o nome do sensor (ex: Temperatura, Distância...)
 * Usa ponto-e-vírgula como separador para melhor compatibilidade com Excel
 * Adiciona BOM para UTF-8
 * Os números são formatados com vírgula decimal (padrão PT-BR)
 */
function saveDataCSV(sensor) {
    const chart = charts[sensor];
    if (!chart) {
        alert('Dados não encontrados para este sensor.');
        return;
    }

    const labels = chart.data.labels || [];
    const values = chart.data.datasets[0].data || [];

    if (labels.length === 0) {
        alert('Não há dados para exportar. Inicie a coleta primeiro.');
        return;
    }

    // Obtém o nome do sensor
    const sensorName = getChartLabel(sensor);

    // Cabeçalho com o nome do sensor
    let csv = `Tempo (mm:ss);${sensorName}\n`;
    for (let i = 0; i < labels.length; i++) {
        // Formata o valor numérico: substitui ponto por vírgula
        let valorFormatado = values[i];
        if (typeof valorFormatado === 'number') {
            valorFormatado = valorFormatado.toString().replace('.', ',');
        }
        csv += `${labels[i]};${valorFormatado}\n`;
    }

    // Adiciona BOM (Byte Order Mark) para UTF-8
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.download = `dados_${sensor}.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
}