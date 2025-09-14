interface EncryptionConfig {
    algorithm: 'AES-256-GCM' | 'AES-192-GCM' | 'AES-128-GCM';
    keyRotation: string; // e.g., '30d', '7d', '1h'
    keyDerivation: {
        algorithm: 'PBKDF2' | 'Argon2' | 'scrypt';
        iterations: number;
        saltLength: number;
    };
    storage: {
        encryptLocal: boolean;
        encryptSession: boolean;
        encryptIndexedDB: boolean;
    };
}

interface EncryptedData {
    data: string;
    iv: string;
    tag: string;
    algorithm: string;
    keyId: string;
    timestamp: number;
}

interface EncryptionKey {
    id: string;
    key: CryptoKey;
    created: Date;
    expires: Date;
    algorithm: string;
}

export class DataEncryption {
    private config: EncryptionConfig;
    private keys = new Map<string, EncryptionKey>();
    private currentKeyId: string | null = null;
    private masterKey: CryptoKey | null = null;

    constructor(config: EncryptionConfig) {
        this.config = config;
        this.initializeEncryption();
    }

    private async initializeEncryption(): Promise<void> {
        try {
            await this.generateMasterKey();
            await this.generateDataEncryptionKey();
            this.setupPeriodicKeyRotation();
        } catch (error) {
            console.error('Failed to initialize encryption:', error);
            throw new Error('Encryption initialization failed');
        }
    }

    private async generateMasterKey(): Promise<void> {
        if (!crypto.subtle) {
            throw new Error('Web Crypto API not available');
        }

        // Generate or derive master key from user password/passphrase
        this.masterKey = await crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256
            },
            false, // not extractable
            ['encrypt', 'decrypt']
        );
    }

    private async generateDataEncryptionKey(): Promise<void> {
        if (!this.masterKey) {
            throw new Error('Master key not available');
        }

        const keyId = this.generateKeyId();
        const expirationTime = this.calculateKeyExpiration();

        const key = await crypto.subtle.generateKey(
            {
                name: this.config.algorithm.split('-')[0] + '-GCM',
                length: parseInt(this.config.algorithm.split('-')[1])
            },
            false,
            ['encrypt', 'decrypt']
        );

        const encryptionKey: EncryptionKey = {
            id: keyId,
            key,
            created: new Date(),
            expires: expirationTime,
            algorithm: this.config.algorithm
        };

        this.keys.set(keyId, encryptionKey);
        this.currentKeyId = keyId;
    }

    private generateKeyId(): string {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    private calculateKeyExpiration(): Date {
        const now = new Date();
        const rotationPeriod = this.config.keyRotation;

        if (rotationPeriod.endsWith('d')) {
            const days = parseInt(rotationPeriod);
            return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        } else if (rotationPeriod.endsWith('h')) {
            const hours = parseInt(rotationPeriod);
            return new Date(now.getTime() + hours * 60 * 60 * 1000);
        } else if (rotationPeriod.endsWith('m')) {
            const minutes = parseInt(rotationPeriod);
            return new Date(now.getTime() + minutes * 60 * 1000);
        }

        // Default to 30 days
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    async encrypt(data: any, keyId?: string): Promise<EncryptedData> {
        if (!data) {
            throw new Error('No data provided for encryption');
        }

        const useKeyId = keyId || this.currentKeyId;
        if (!useKeyId) {
            throw new Error('No encryption key available');
        }

        const key = this.keys.get(useKeyId);
        if (!key || this.isKeyExpired(key)) {
            if (!keyId) {
                await this.rotateKeys();
                return this.encrypt(data, this.currentKeyId!);
            }
            throw new Error(`Encryption key ${useKeyId} is expired or not available`);
        }

        try {
            const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
            const encoder = new TextEncoder();
            const encodedData = encoder.encode(plaintext);

            const iv = crypto.getRandomValues(new Uint8Array(12));

            const encryptedBuffer = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv,
                    tagLength: 128
                },
                key.key,
                encodedData
            );

            const encryptedArray = new Uint8Array(encryptedBuffer);
            const tag = encryptedArray.slice(-16);
            const ciphertext = encryptedArray.slice(0, -16);

            return {
                data: Array.from(ciphertext).map(b => b.toString(16).padStart(2, '0')).join(''),
                iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
                tag: Array.from(tag).map(b => b.toString(16).padStart(2, '0')).join(''),
                algorithm: key.algorithm,
                keyId: useKeyId,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Data encryption failed');
        }
    }

    async decrypt(encryptedData: EncryptedData): Promise<any> {
        if (!encryptedData || !encryptedData.data) {
            throw new Error('No encrypted data provided');
        }

        const key = this.keys.get(encryptedData.keyId);
        if (!key) {
            throw new Error(`Decryption key ${encryptedData.keyId} not available`);
        }

        try {
            const ciphertext = new Uint8Array(
                encryptedData.data.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
            );
            const iv = new Uint8Array(
                encryptedData.iv.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
            );
            const tag = new Uint8Array(
                encryptedData.tag.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
            );

            const encryptedBuffer = new Uint8Array(ciphertext.length + tag.length);
            encryptedBuffer.set(ciphertext);
            encryptedBuffer.set(tag, ciphertext.length);

            const decryptedBuffer = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv,
                    tagLength: 128
                },
                key.key,
                encryptedBuffer
            );

            const decoder = new TextDecoder();
            const plaintext = decoder.decode(decryptedBuffer);

            try {
                return JSON.parse(plaintext);
            } catch {
                return plaintext;
            }
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Data decryption failed');
        }
    }

    async encryptStorageData(key: string, value: any, storageType: 'local' | 'session' | 'indexeddb'): Promise<void> {
        const shouldEncrypt = this.config.storage.encryptLocal && storageType === 'local' ||
                             this.config.storage.encryptSession && storageType === 'session' ||
                             this.config.storage.encryptIndexedDB && storageType === 'indexeddb';

        if (!shouldEncrypt) {
            this.setPlaintextStorage(key, value, storageType);
            return;
        }

        try {
            const encryptedData = await this.encrypt(value);
            const storageValue = JSON.stringify(encryptedData);

            switch (storageType) {
                case 'local':
                    localStorage.setItem(key, storageValue);
                    break;
                case 'session':
                    sessionStorage.setItem(key, storageValue);
                    break;
                case 'indexeddb':
                    await this.setIndexedDBItem(key, storageValue);
                    break;
            }
        } catch (error) {
            console.error(`Failed to encrypt ${storageType} storage data:`, error);
            throw error;
        }
    }

    async decryptStorageData(key: string, storageType: 'local' | 'session' | 'indexeddb'): Promise<any> {
        try {
            let storageValue: string | null = null;

            switch (storageType) {
                case 'local':
                    storageValue = localStorage.getItem(key);
                    break;
                case 'session':
                    storageValue = sessionStorage.getItem(key);
                    break;
                case 'indexeddb':
                    storageValue = await this.getIndexedDBItem(key);
                    break;
            }

            if (!storageValue) {
                return null;
            }

            try {
                const encryptedData: EncryptedData = JSON.parse(storageValue);
                if (encryptedData.data && encryptedData.iv && encryptedData.keyId) {
                    return await this.decrypt(encryptedData);
                }
            } catch {
                // Likely plaintext data, return as-is
                return JSON.parse(storageValue);
            }

            return JSON.parse(storageValue);
        } catch (error) {
            console.error(`Failed to decrypt ${storageType} storage data:`, error);
            return null;
        }
    }

    private setPlaintextStorage(key: string, value: any, storageType: 'local' | 'session' | 'indexeddb'): void {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

        switch (storageType) {
            case 'local':
                localStorage.setItem(key, stringValue);
                break;
            case 'session':
                sessionStorage.setItem(key, stringValue);
                break;
            case 'indexeddb':
                this.setIndexedDBItem(key, stringValue);
                break;
        }
    }

    private async setIndexedDBItem(key: string, value: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('EncryptedStorage', 1);

            request.onerror = () => reject(request.error);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('data')) {
                    db.createObjectStore('data');
                }
            };

            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['data'], 'readwrite');
                const store = transaction.objectStore('data');

                const putRequest = store.put(value, key);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            };
        });
    }

    private async getIndexedDBItem(key: string): Promise<string | null> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('EncryptedStorage', 1);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['data'], 'readonly');
                const store = transaction.objectStore('data');

                const getRequest = store.get(key);
                getRequest.onsuccess = () => resolve(getRequest.result || null);
                getRequest.onerror = () => reject(getRequest.error);
            };
        });
    }

    private isKeyExpired(key: EncryptionKey): boolean {
        return new Date() > key.expires;
    }

    private async rotateKeys(): Promise<void> {
        console.log('Rotating encryption keys...');

        // Generate new key
        await this.generateDataEncryptionKey();

        // Clean up expired keys (keep them for a grace period to decrypt old data)
        const gracePeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
        const cutoff = new Date(Date.now() - gracePeriod);

        for (const [keyId, key] of this.keys) {
            if (key.expires < cutoff) {
                this.keys.delete(keyId);
            }
        }
    }

    private setupPeriodicKeyRotation(): void {
        const rotationInterval = this.getRotationInterval();

        setInterval(async () => {
            if (this.currentKeyId) {
                const currentKey = this.keys.get(this.currentKeyId);
                if (currentKey && this.isKeyExpired(currentKey)) {
                    await this.rotateKeys();
                }
            }
        }, rotationInterval);
    }

    private getRotationInterval(): number {
        const rotationPeriod = this.config.keyRotation;

        if (rotationPeriod.endsWith('d')) {
            return parseInt(rotationPeriod) * 24 * 60 * 60 * 1000;
        } else if (rotationPeriod.endsWith('h')) {
            return parseInt(rotationPeriod) * 60 * 60 * 1000;
        } else if (rotationPeriod.endsWith('m')) {
            return parseInt(rotationPeriod) * 60 * 1000;
        }

        return 30 * 24 * 60 * 60 * 1000; // Default 30 days
    }

    async deriveKeyFromPassword(password: string, salt?: Uint8Array): Promise<CryptoKey> {
        if (!salt) {
            salt = crypto.getRandomValues(new Uint8Array(this.config.keyDerivation.saltLength));
        }

        const encoder = new TextEncoder();
        const passwordKey = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.config.keyDerivation.iterations,
                hash: 'SHA-256'
            },
            passwordKey,
            {
                name: 'AES-GCM',
                length: 256
            },
            false,
            ['encrypt', 'decrypt']
        );
    }

    getKeyManagementStatus(): {
        activeKeys: number;
        expiredKeys: number;
        currentKeyId: string | null;
        nextRotation: Date | null;
    } {
        let activeKeys = 0;
        let expiredKeys = 0;
        let nextRotation: Date | null = null;

        for (const key of this.keys.values()) {
            if (this.isKeyExpired(key)) {
                expiredKeys++;
            } else {
                activeKeys++;
                if (!nextRotation || key.expires < nextRotation) {
                    nextRotation = key.expires;
                }
            }
        }

        return {
            activeKeys,
            expiredKeys,
            currentKeyId: this.currentKeyId,
            nextRotation
        };
    }
}