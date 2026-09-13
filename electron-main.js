// PROCESSO PRINCIPAL DO ELECTRON
// Responsavel por:
//   1) Iniciar o servidor Node (server.js) em background
//   2) Abrir a janela do Electron apontando para http://localhost:3000
//   3) Fechar o servidor quando a janela for fechada

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// Importa o modulo do servidor (server.js deve exportar a funcao de inicializacao)
const { startServer } = require('./server');

let mainWindow = null;
let serverInstance = null;

// Cria a janela principal do Electron
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        title: 'ExpeRT - Plataforma de Monitoramento',
        backgroundColor: '#f8fafc',
        webPreferences: {
            // O frontend roda como pagina web normal; nao precisa de nodeIntegration
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Remove o menu padrao do Electron (opcional, deixa mais limpo)
    mainWindow.setMenuBarVisibility(false);

    // Carrega o servidor local
    mainWindow.loadURL('http://localhost:3000');

    // Abre links externos no navegador padrao em vez de dentro da janela
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Ao fechar a janela, encerra a aplicacao
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Quando o Electron terminar de inicializar
app.whenReady().then(async () => {
    // Inicia o servidor Node (Express + WebSocket + Serial)
    try {
        serverInstance = await startServer();
    } catch (err) {
        console.error('Erro ao iniciar o servidor:', err);
    }

    createWindow();

    // No macOS e comum reabrir a janela ao clicar no icone do dock
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Encerra a aplicacao quando todas as janelas forem fechadas (exceto no macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (serverInstance && typeof serverInstance.close === 'function') {
            serverInstance.close();
        }
        app.quit();
    }
});

// Fecha o servidor ao encerrar o Electron
app.on('before-quit', () => {
    if (serverInstance && typeof serverInstance.close === 'function') {
        serverInstance.close();
    }
});
