/**
 * IPCCommunication - Inter-process communication coordinator for Electron
 * Provides secure message passing between main and renderer processes
 */

export interface IPCConfig {
  enableSecurity?: boolean;
  allowedOrigins?: string[];
  messageTimeout?: number;
  maxMessageSize?: number;
  enableEncryption?: boolean;
}

export interface IPCMessage {
  id: string;
  channel: string;
  data: any;
  timestamp: number;
  origin?: string;
  checksum?: string;
}

export interface IPCResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}

export class IPCCommunication {
  private config: Required<IPCConfig>;
  private messageHandlers: Map<string, Function[]>;
  private pendingMessages: Map<string, {
    resolve: Function;
    reject: Function;
    timeout: NodeJS.Timeout;
  }>;
  private isMainProcess: boolean;
  private ipcMain: any = null;
  private ipcRenderer: any = null;

  constructor(config: IPCConfig = {}) {
    this.config = {
      enableSecurity: config.enableSecurity ?? true,
      allowedOrigins: config.allowedOrigins || ['*'],
      messageTimeout: config.messageTimeout || 30000,
      maxMessageSize: config.maxMessageSize || 1024 * 1024, // 1MB
      enableEncryption: config.enableEncryption ?? false,
      ...config
    };

    this.messageHandlers = new Map();
    this.pendingMessages = new Map();
    this.isMainProcess = this.detectProcessType();

    this.init();
  }

  /**
   * Initialize IPC communication
   */
  private init(): void {
    try {
      if (this.isMainProcess) {
        this.initMainProcess();
      } else {
        this.initRendererProcess();
      }

      this.setupSecurityHandlers();
      console.log(`[IPCCommunication] Initialized for ${this.isMainProcess ? 'main' : 'renderer'} process`);
    } catch (error) {
      console.error('[IPCCommunication] Initialization failed:', error);
    }
  }

  /**
   * Send message to the other process
   */
  async send(channel: string, data: any, targetWindow?: any): Promise<IPCResponse> {
    const message: IPCMessage = {
      id: this.generateMessageId(),
      channel,
      data: this.processOutgoingData(data),
      timestamp: Date.now(),
      origin: this.getOrigin()
    };

    // Add checksum for security
    if (this.config.enableSecurity) {
      message.checksum = this.calculateChecksum(message);
    }

    // Validate message size
    if (this.getMessageSize(message) > this.config.maxMessageSize) {
      throw new Error('Message size exceeds limit');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(message.id);
        reject(new Error(`IPC message timeout: ${channel}`));
      }, this.config.messageTimeout);

      this.pendingMessages.set(message.id, { resolve, reject, timeout });

      try {
        if (this.isMainProcess && this.ipcMain) {
          // Send from main to renderer
          if (targetWindow && targetWindow.webContents) {
            targetWindow.webContents.send('ipc-message', message);
          } else {
            // Broadcast to all windows
            this.broadcastToRenderers(message);
          }
        } else if (!this.isMainProcess && this.ipcRenderer) {
          // Send from renderer to main
          this.ipcRenderer.send('ipc-message', message);
        } else {
          throw new Error('IPC not available');
        }
      } catch (error) {
        clearTimeout(timeout);
        this.pendingMessages.delete(message.id);
        reject(error);
      }
    });
  }

  /**
   * Register message handler
   */
  on(channel: string, handler: (data: any, sender?: any) => any): void {
    if (!this.messageHandlers.has(channel)) {
      this.messageHandlers.set(channel, []);
    }
    this.messageHandlers.get(channel)!.push(handler);
  }

  /**
   * Remove message handler
   */
  off(channel: string, handler?: Function): void {
    if (!handler) {
      this.messageHandlers.delete(channel);
      return;
    }

    const handlers = this.messageHandlers.get(channel);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(message: IPCMessage, sender?: any): Promise<void> {
    try {
      // Validate message
      if (!this.validateMessage(message)) {
        console.warn('[IPCCommunication] Invalid message received:', message);
        return;
      }

      // Process data
      const processedData = this.processIncomingData(message.data);

      // Get handlers for channel
      const handlers = this.messageHandlers.get(message.channel) || [];

      if (handlers.length === 0) {
        console.warn(`[IPCCommunication] No handlers for channel: ${message.channel}`);
        return;
      }

      // Execute handlers
      const results = await Promise.allSettled(
        handlers.map(handler => handler(processedData, sender))
      );

      // Send response back
      const response: IPCResponse = {
        id: message.id,
        success: true,
        data: results.map(result =>
          result.status === 'fulfilled' ? result.value : result.reason
        ),
        timestamp: Date.now()
      };

      this.sendResponse(response, sender);

    } catch (error) {
      const errorResponse: IPCResponse = {
        id: message.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };

      this.sendResponse(errorResponse, sender);
    }
  }

  /**
   * Handle incoming responses
   */
  private handleResponse(response: IPCResponse): void {
    const pendingMessage = this.pendingMessages.get(response.id);
    if (!pendingMessage) {
      console.warn('[IPCCommunication] Received response for unknown message:', response.id);
      return;
    }

    clearTimeout(pendingMessage.timeout);
    this.pendingMessages.delete(response.id);

    if (response.success) {
      pendingMessage.resolve(response);
    } else {
      pendingMessage.reject(new Error(response.error || 'Unknown error'));
    }
  }

  /**
   * Initialize main process IPC
   */
  private initMainProcess(): void {
    try {
      this.ipcMain = require('electron').ipcMain;

      // Handle messages from renderer
      this.ipcMain.on('ipc-message', (event: any, message: IPCMessage) => {
        this.handleMessage(message, event.sender);
      });

      // Handle responses from renderer
      this.ipcMain.on('ipc-response', (event: any, response: IPCResponse) => {
        this.handleResponse(response);
      });

    } catch (error) {
      console.error('[IPCCommunication] Main process initialization failed:', error);
    }
  }

  /**
   * Initialize renderer process IPC
   */
  private initRendererProcess(): void {
    try {
      this.ipcRenderer = require('electron').ipcRenderer;

      // Handle messages from main
      this.ipcRenderer.on('ipc-message', (event: any, message: IPCMessage) => {
        this.handleMessage(message, event.sender);
      });

      // Handle responses from main
      this.ipcRenderer.on('ipc-response', (event: any, response: IPCResponse) => {
        this.handleResponse(response);
      });

    } catch (error) {
      console.error('[IPCCommunication] Renderer process initialization failed:', error);
    }
  }

  /**
   * Send response back to sender
   */
  private sendResponse(response: IPCResponse, sender?: any): void {
    try {
      if (this.isMainProcess && sender) {
        sender.send('ipc-response', response);
      } else if (!this.isMainProcess && this.ipcRenderer) {
        this.ipcRenderer.send('ipc-response', response);
      }
    } catch (error) {
      console.error('[IPCCommunication] Failed to send response:', error);
    }
  }

  /**
   * Broadcast message to all renderer processes
   */
  private broadcastToRenderers(message: IPCMessage): void {
    try {
      const { BrowserWindow } = require('electron');
      const windows = BrowserWindow.getAllWindows();

      windows.forEach(window => {
        if (window.webContents && !window.webContents.isDestroyed()) {
          window.webContents.send('ipc-message', message);
        }
      });
    } catch (error) {
      console.error('[IPCCommunication] Broadcasting failed:', error);
    }
  }

  /**
   * Validate incoming message
   */
  private validateMessage(message: IPCMessage): boolean {
    if (!message || !message.id || !message.channel || !message.timestamp) {
      return false;
    }

    // Check origin if security is enabled
    if (this.config.enableSecurity) {
      if (message.origin && this.config.allowedOrigins.includes('*')) {
        return true;
      }

      if (message.origin && this.config.allowedOrigins.includes(message.origin)) {
        return true;
      }

      if (!message.origin && this.config.allowedOrigins.includes('*')) {
        return true;
      }

      // Verify checksum
      if (message.checksum) {
        const expectedChecksum = this.calculateChecksum({...message, checksum: undefined});
        if (message.checksum !== expectedChecksum) {
          return false;
        }
      }
    }

    // Check message size
    if (this.getMessageSize(message) > this.config.maxMessageSize) {
      return false;
    }

    return true;
  }

  /**
   * Process outgoing data (encryption, serialization)
   */
  private processOutgoingData(data: any): any {
    let processed = data;

    // Serialize if needed
    if (typeof data === 'object') {
      try {
        processed = JSON.stringify(data);
      } catch (error) {
        console.error('[IPCCommunication] Data serialization failed:', error);
        processed = null;
      }
    }

    // Encrypt if enabled
    if (this.config.enableEncryption && processed) {
      processed = this.encryptData(processed);
    }

    return processed;
  }

  /**
   * Process incoming data (decryption, deserialization)
   */
  private processIncomingData(data: any): any {
    let processed = data;

    // Decrypt if enabled
    if (this.config.enableEncryption && processed) {
      processed = this.decryptData(processed);
    }

    // Deserialize if needed
    if (typeof processed === 'string') {
      try {
        processed = JSON.parse(processed);
      } catch (error) {
        // Not JSON, return as string
      }
    }

    return processed;
  }

  /**
   * Calculate message checksum
   */
  private calculateChecksum(message: Partial<IPCMessage>): string {
    const data = JSON.stringify({
      channel: message.channel,
      data: message.data,
      timestamp: message.timestamp
    });

    // Simple checksum (in production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Get message size in bytes
   */
  private getMessageSize(message: IPCMessage): number {
    return JSON.stringify(message).length * 2; // Approximate byte size
  }

  /**
   * Get current origin
   */
  private getOrigin(): string {
    if (this.isMainProcess) {
      return 'main-process';
    }
    return typeof window !== 'undefined' ? window.location.origin : 'renderer-process';
  }

  /**
   * Detect process type
   */
  private detectProcessType(): boolean {
    try {
      return typeof process !== 'undefined' && process.type === 'browser';
    } catch {
      return false;
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup security handlers
   */
  private setupSecurityHandlers(): void {
    if (!this.config.enableSecurity) {
      return;
    }

    // Monitor message frequency to prevent spam
    const messageFrequency = new Map<string, number[]>();

    this.on('_security_check', (data, sender) => {
      const origin = this.getOrigin();
      const now = Date.now();
      const window = 60000; // 1 minute

      if (!messageFrequency.has(origin)) {
        messageFrequency.set(origin, []);
      }

      const timestamps = messageFrequency.get(origin)!;
      timestamps.push(now);

      // Clean old timestamps
      const cutoff = now - window;
      const validTimestamps = timestamps.filter(ts => ts > cutoff);
      messageFrequency.set(origin, validTimestamps);

      // Check rate limit (max 100 messages per minute)
      if (validTimestamps.length > 100) {
        console.warn(`[IPCCommunication] Rate limit exceeded for origin: ${origin}`);
        return { blocked: true, reason: 'Rate limit exceeded' };
      }

      return { blocked: false };
    });
  }

  /**
   * Simple encryption (placeholder - use proper encryption in production)
   */
  private encryptData(data: string): string {
    // Simple XOR encryption (not secure - use proper encryption)
    const key = 'universal-search-key';
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return btoa(encrypted);
  }

  /**
   * Simple decryption (placeholder - use proper decryption in production)
   */
  private decryptData(encryptedData: string): string {
    try {
      const data = atob(encryptedData);
      const key = 'universal-search-key';
      let decrypted = '';
      for (let i = 0; i < data.length; i++) {
        decrypted += String.fromCharCode(
          data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      return decrypted;
    } catch (error) {
      console.error('[IPCCommunication] Decryption failed:', error);
      return encryptedData;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Clear pending messages
    this.pendingMessages.forEach(({ timeout }) => {
      clearTimeout(timeout);
    });
    this.pendingMessages.clear();

    // Clear handlers
    this.messageHandlers.clear();

    // Remove IPC listeners
    if (this.isMainProcess && this.ipcMain) {
      this.ipcMain.removeAllListeners('ipc-message');
      this.ipcMain.removeAllListeners('ipc-response');
    } else if (!this.isMainProcess && this.ipcRenderer) {
      this.ipcRenderer.removeAllListeners('ipc-message');
      this.ipcRenderer.removeAllListeners('ipc-response');
    }
  }
}