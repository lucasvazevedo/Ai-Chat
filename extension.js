const vscode = require('vscode');
const axios = require('axios');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    let chatPanel;
    let conversationHistory = [];

    let disposable = vscode.commands.registerCommand('extension.suggestCode', async function () {
        if (!chatPanel) {
            chatPanel = createChatPanel(context);
        } else {
            chatPanel.reveal(vscode.ViewColumn.Beside);
        }

        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const selection = editor.selection;

            // Captura o código selecionado e todo o conteúdo do arquivo
            const codeSnippet = document.getText(selection);
            const fullText = document.getText();

            try {
                const responseStream = await axios.post('http://127.0.0.1:11434/api/chat', {
                    model: 'llama3.1:8b',
                    messages: [
                        {
                            role: 'user',
                            content: codeSnippet + "\n\n" + fullText
                        }
                    ]
                }, {
                    responseType: 'stream'
                });

                let suggestion = '';

                responseStream.data.on('data', chunk => {
                    const response = JSON.parse(chunk.toString());
                    suggestion += response.message.content;
                });

                responseStream.data.on('end', () => {
                    if (chatPanel) {
                        const formattedSuggestion = formatSuggestion(suggestion);
                        chatPanel.webview.postMessage({ command: 'displayCode', text: formattedSuggestion });
                        addMessageToHistory('LcsIA', suggestion);
                    }
                });

            } catch (error) {
                vscode.window.showErrorMessage('Erro ao obter sugestão: ' + error.message);
            }
        }
    });

    context.subscriptions.push(disposable);

    function addMessageToHistory(sender, message) {
        conversationHistory.push({ sender, message });
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};

function createChatPanel(context) {
    const panel = vscode.window.createWebviewPanel(
		'LcsIA', 
		'LcsIA Chat',
		vscode.ViewColumn.Beside, 
		{
			enableScripts: true,
			localResourceRoots: [vscode.Uri.file(context.extensionPath)] // Definir a origem dos recursos
		}
	);
	

    // HTML básico do Webview
    panel.webview.html = getWebviewContent();

    panel.webview.onDidReceiveMessage(message => {
        switch (message.command) {
            case 'sendMessage':
                sendUserMessage(message.text, panel);
                break;
        }
    });

    return panel;
}

async function sendUserMessage(input, panel) {
    if (input.trim() === '') return;

    const responseStream = await axios.post('http://127.0.0.1:11434/api/chat', {
        model: 'llama3.1:8b',
        messages: [{ role: 'user', content: input }]
    }, {
        responseType: 'stream'
    });

    let suggestion = '';

    responseStream.data.on('data', chunk => {
        const response = JSON.parse(chunk.toString());
        suggestion += response.message.content;
    });

    responseStream.data.on('end', () => {
        if (panel) {
            const formattedSuggestion = formatSuggestion(suggestion);
            panel.webview.postMessage({ command: 'displayCode', text: formattedSuggestion });
            panel.webview.postMessage({ command: 'addMessageToChat', text: `Skycode: ${suggestion}` });
        }
    });
}

function getWebviewContent() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Skycode Chat</title>
        <style>
            body {
                font-family: Roboto, sans-serif;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                height: 100vh;
            }
            #chat {
                flex-grow: 1;
                padding: 10px;
                overflow-y: auto;
                background-color: #f4f4f4;
            }
            #inputArea {
                display: flex;
                padding: 10px;
                background-color: #ddd;
            }
            #inputArea input {
                flex-grow: 1;
                padding: 10px;
                font-size: 14px;
                border: 1px solid #ccc;
                border-radius: 4px;
            }
            #inputArea button {
                padding: 10px;
                font-size: 14px;
                border: none;
                background-color: #007acc;
                color: white;
                border-radius: 4px;
                cursor: pointer;
            }
            #inputArea button:hover {
                background-color: #005999;
            }
            #codeOutput {
                background-color: #1e1e1e;
                color: #d4d4d4;
                padding: 10px;
                border-radius: 4px;
                font-family: monospace;
                white-space: pre-wrap; /* Mantém a formatação do código */
                overflow-x: auto;
                margin-top: 10px;
            }
            .code-header {
                background-color: #333;
                color: #ff6f61;
                padding: 5px 10px;
                border-radius: 4px 4px 0 0;
                font-family: monospace;
                font-size: 14px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .copy-button {
                background-color: #007acc;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            }
            .copy-button:hover {
                background-color: #005999;
            }
            .code-container {
                border-radius: 4px;
                background-color: #282c34;
                padding: 10px;
                margin-top: 10px;
            }
        </style>
    </head>
    <body>
        <div id="chat"></div>
        <div id="codeOutput"></div>
        <div id="inputArea">
            <input type="text" id="userInput" placeholder="Digite aqui..." onkeydown="handleKeyDown(event)"/>
            <button onclick="sendMessage()">Enviar</button>
        </div>

        <script>
            const vscode = acquireVsCodeApi();

            function sendMessage() {
                const input = document.getElementById('userInput').value;
                if (input.trim() === '') return;

                vscode.postMessage({
                    command: 'sendMessage',
                    text: input
                });
                document.getElementById('userInput').value = '';
                addMessageToChat('Você', input);
            }

            function handleKeyDown(event) {
                if (event.key === 'Enter') {
                    sendMessage();
                }
            }

            function addMessageToChat(sender, message) {
                const chat = document.getElementById('chat');
                chat.innerHTML += '<p><strong>' + sender + ':</strong> ' + message + '</p>';
                chat.scrollTop = chat.scrollHeight;
            }

            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'displayCode') {
                    document.getElementById('codeOutput').innerHTML = message.text;
                } else if (message.command === 'addMessageToChat') {
                    addMessageToChat('Skycode', message.text);
                }
            });

            function copyToClipboard(text) {
                navigator.clipboard.writeText(text).then(() => {
                    alert('Código copiado para a área de transferência');
                });
            }
        </script>
    </body>
    </html>`;
}

function formatSuggestion(suggestion) {
    return suggestion.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, p1, p2) => {
        return `<div class="code-container">
                    <div class="code-header">
                        ${p1 ? p1 : 'Código'}
                        <button class="copy-button" onclick="copyToClipboard(\`${escapeHtml(p2)}\`)">Copiar</button>
                    </div>
                    <div class="code-content">${escapeHtml(p2)}</div>
                </div>`;
    });
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
