// FUNÇÕES DE EXPORTAÇÃO (SALVAR IMAGEM E CSV)

function getExportSensorName(sensor) {
    switch (sensor) {
        case 'distance': return 'Distancia';
        case 'period': return 'Periodo';
        case 'temperature': return 'Temperatura';
        case 'light': return 'Luminosidade';
        case 'buzzer': return 'Buzzer';
        case 'hall': return 'Sensor Hall';
        case 'motor': return 'Motor CC';
        case 'servo': return 'Servo Motor';
        case 'piezo': return 'Piezoelétrico';
        default: return sensor;
    }
}

function getExportFileName(sensor) {
    return `dados_${getExportSensorName(sensor)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase()}.csv`;
}

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

    // Obtém o nome do sensor para o CSV
    const sensorName = getExportSensorName(sensor);
    const isHall = sensor === 'hall';
    const isPiezo = sensor === 'piezo';

    // Cabeçalho com o nome do sensor
    let csv = `Tempo;${sensorName}\n`;
    for (let i = 0; i < labels.length; i++) {
        let valorFormatado = values[i];
        
        // Para o Hall, converte número de volta para texto
        if (isHall) {
            if (valorFormatado === 1) valorFormatado = 'Polo Norte';
            else if (valorFormatado === -1) valorFormatado = 'Polo Sul';
            else valorFormatado = '---';
        } else if (isPiezo && typeof valorFormatado === 'number') {
            valorFormatado = Math.round(valorFormatado).toString();
        } else if (typeof valorFormatado === 'number') {
            if (sensor === 'light' && valorFormatado > 100) {
                valorFormatado = 100;
            }
            valorFormatado = valorFormatado.toString().replace('.', ',');
        }
        
        csv += `${labels[i]};${valorFormatado}\n`;
    }

    // UTF-8 puro
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.download = getExportFileName(sensor);
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
}