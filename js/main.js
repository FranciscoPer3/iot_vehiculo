class CarControl {
    constructor() {
        this.ws = null;
        this.deviceId = 1;
        this.isConnected = false;
        this.movementHistory = [];
        
        this.init();
    }

    init() {
        this.connectWebSocket();
        this.setupEventListeners();
        this.updateUI();
    }

    connectWebSocket() {
        // TU IP PÚBLICA DE AWS
        const serverUrl = 'ws://18.206.202.121:5500';
        
        console.log('Conectando a:', serverUrl);
        this.ws = new WebSocket(serverUrl);
        
        this.ws.onopen = () => {
            console.log('✅ Conectado al servidor WebSocket');
            this.isConnected = true;
            this.updateUI();
            this.showNotification('✅ Conectado al vehículo IoT', 'success');
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };
        
        this.ws.onclose = () => {
            console.log('🔴 Conexión WebSocket cerrada');
            this.isConnected = false;
            this.updateUI();
            this.showNotification('🔴 Conexión perdida - Reconectando...', 'error');
            
            // Reconectar después de 5 segundos
            setTimeout(() => this.connectWebSocket(), 5000);
        };
        
        this.ws.onerror = (error) => {
            console.error('❌ Error WebSocket:', error);
            this.isConnected = false;
            this.updateUI();
            this.showNotification('❌ Error de conexión al servidor', 'error');
        };
    }

    setupEventListeners() {
        // Botones de control
        document.querySelectorAll('.btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                this.sendControlCommand(action);
            });
        });

        // Teclado
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e);
        });
    }

    handleKeyPress(event) {
        const keyActions = {
            'ArrowUp': 'ADELANTE',
            'ArrowDown': 'ATRAS',
            'ArrowLeft': 'G 90 IZQ',
            'ArrowRight': 'G 90 DER',
            ' ': 'DETENER',
            's': 'SUBIR VEL',
            'b': 'BAJAR VEL'
        };
        
        if (keyActions[event.key]) {
            event.preventDefault();
            this.sendControlCommand(keyActions[event.key]);
        }
    }

    sendControlCommand(action) {
        if (!this.isConnected || !this.ws) {
            this.showNotification('❌ No conectado al servidor', 'error');
            return;
        }

        // MAPEO ACTUALIZADO CON LOS IDs CORRECTOS DE TU BD
 // MAPEO DE PRUEBA - VALORES EXTREMOS
const actionMap = {
    'ADELANTE': 1,
    'ATRAS': 2,
    'DETENER': 3,
    'V ADE DER': 100,    // ← Valor único
    'V ADE IZQ': 200,    // ← Valor único  
    'V ATR DER': 300,    // ← Valor único
    'V ATR IZQ': 400,    // ← Valor único
    'G 90 DER': 500,     // ← Valor único
    'G 90 IZQ': 600,     // ← Valor único
    'G 360 DER': 700,    // ← Valor único
    'G 360 IZQ': 800,    // ← Valor único
    'SUBIR VEL': 12,
    'BAJAR VEL': 13,
    'GUARDAR MOV': 14,
    'REPLICAR MOV': 15
};

        if (!actionMap[action]) {
            this.showNotification(`❌ Acción no válida: ${action}`, 'error');
            return;
        }

        const message = {
            type: 'control',
            action: action,
            deviceId: this.deviceId,
            operationId: actionMap[action],
            timestamp: new Date().toISOString()
        };

        console.log('Enviando comando:', message);
        this.ws.send(JSON.stringify(message));
        
        // Actualizar UI inmediatamente
        this.updateMovementStatus(action);
        this.addToHistory(action);
    }

    handleMessage(data) {
        console.log('Mensaje recibido:', data);
        
        switch (data.type) {
            case 'control_response':
                this.showNotification(`✅ ${data.message || `Comando ${data.action} ejecutado`}`, 'success');
                break;
            case 'error':
                this.showNotification(`❌ Error: ${data.message}`, 'error');
                break;
            case 'connection':
                console.log('Info conexión:', data.message);
                break;
            case 'pong':
                // Respuesta de ping, no hacer nada
                break;
        }
    }

    updateMovementStatus(action) {
        const statusElement = document.getElementById('estadoMovimiento');
        if (statusElement) {
            statusElement.textContent = action;
            statusElement.className = 'movement-active';
            
            // Reset después de 2 segundos
            setTimeout(() => {
                statusElement.className = '';
                statusElement.textContent = 'INACTIVO';
            }, 2000);
        }
    }

    addToHistory(action) {
        this.movementHistory.unshift({
            action: action,
            timestamp: new Date().toLocaleTimeString()
        });
        
        // Mantener solo los últimos 10
        this.movementHistory = this.movementHistory.slice(0, 10);
        
        this.updateHistoryUI();
    }

    updateHistoryUI() {
        const historyElement = document.getElementById('historial');
        if (historyElement) {
            if (this.movementHistory.length === 0) {
                historyElement.innerHTML = '<div class="text-muted fst-italic">Presione algún botón para comenzar...</div>';
            } else {
                historyElement.innerHTML = this.movementHistory
                    .map(item => `
                        <div class="history-item">
                            <span class="action">${item.action}</span>
                            <span class="time">${item.timestamp}</span>
                        </div>
                    `)
                    .join('');
            }
        }
    }

    updateUI() {
        // Crear o actualizar indicador de conexión
        let statusIndicator = document.querySelector('.connection-status');
        if (!statusIndicator) {
            statusIndicator = document.createElement('div');
            statusIndicator.className = 'connection-status';
            document.querySelector('h1').after(statusIndicator);
        }
        
        statusIndicator.className = `connection-status ${this.isConnected ? 'connected' : 'disconnected'}`;
        statusIndicator.innerHTML = this.isConnected ? 
            '🟢 CONECTADO - Vehículo IoT en línea' : 
            '🔴 DESCONECTADO - Reconectando...';
    }

    showNotification(message, type = 'info') {
        // Eliminar notificaciones existentes
        document.querySelectorAll('.notification').forEach(notif => notif.remove());
        
        // Crear notificación toast
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Configurar evento de cierre
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-remover después de 4 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 4000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new CarControl();
});