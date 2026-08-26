
// EXPORTAÇÃO

//NOME DO SENSOR PARA EXPORTAÇÃO
function getExportSensorName(sensor) {
    switch (sensor) {
        case 'distance': return 'Distancia';
        case 'period': return 'Pisca Led';
        case 'temperature': return 'Temperatura';
        case 'light': return 'Luminosidade';
        case 'buzzer': return 'Buzzer';
        case 'hall': return 'Sensor Hall';
        case 'motor': return 'Motor CC';
        case 'servo': return 'Servo Motor';
        case 'piezo': return 'Piezoeletrico';
        default: return sensor;
    }
}

//  SALVAR IMAGEM (PNG)
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
    const link = document.createElement('a');
    link.download = `grafico_${sensor}.png`;
    link.href = chart.toBase64Image();
    link.click();
}


// SALVAR EXCEL (XLSX)
function saveDataExcel(sensor) {
    const chart = charts[sensor];
    if (!chart) {
        alert('Dados não encontrados para este sensor.');
        return;
    }

    const values = chart.data.datasets[0].data || [];
    if (values.length === 0) {
        alert('Não há dados para exportar. Inicie a coleta primeiro.');
        return;
    }

    const sensorName = getExportSensorName(sensor);
    const isHall = sensor === 'hall';
    const isPiezo = sensor === 'piezo';

    const interval = (typeof samplingIntervalMs !== 'undefined' && samplingIntervalMs > 0) 
        ? samplingIntervalMs 
        : 100;

    const data = [];
    
    // Cabeçalho 
    data.push(['Tempo', sensorName]);

    // Linhas de dados
    for (let i = 0; i < values.length; i++) {
        const ms = i * interval;
        const tempoFormatado = formatElapsedMsToMMSSCC(ms);

        let valor = values[i];
        if (isHall) {
            if (valor === 1) valor = 'Polo Norte';
            else if (valor === -1) valor = 'Polo Sul';
            else valor = '---';
        } else if (isPiezo && typeof valor === 'number') {
            valor = valor;
        } else if (typeof valor === 'number') {
            if (sensor === 'light' && valor > 100) {
                valor = 100;
            }
            valor = valor;
        }

        data.push([tempoFormatado, valor]);
    }

    //CRIA A PLANILHA A PARTIR DO ARRAY DE ARRAYS
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    //FORÇA A COLUNA "Tempo"  COMO TEXTO
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let row = range.s.r; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
        if (!ws[cellAddress]) continue;
        ws[cellAddress].t = 's';
        ws[cellAddress].v = String(ws[cellAddress].v);
    }

    //AJUSTA A LARGURA DAS COLUNAS
    ws['!cols'] = [
        { wch: 20 },
        { wch: 15 }
    ];

    //FAZ O DOWNLOAD
    XLSX.utils.book_append_sheet(wb, ws, 'Dados');
    const baseName = getExportSensorName(sensor)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase();
    XLSX.writeFile(wb, `dados_${baseName}.xlsx`);
}