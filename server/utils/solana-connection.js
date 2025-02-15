const { Connection, PublicKey } = require('@solana/web3.js');
const config = require('../config');

class SolanaConnectionManager {
    constructor() {
        this.currentEndpointIndex = 0;
        this.connections = new Map();
        this.wsSubscriptions = new Map();
        this.lastFailure = new Map();
        this.initialize();
    }

    initialize() {
        // Initialize connections for all endpoints
        config.solana.rpcEndpoints.forEach((endpoint, index) => {
            this.connections.set(index, new Connection(endpoint, {
                commitment: config.solana.commitment,
                confirmTransactionInitialTimeout: config.solana.connectionTimeout
            }));
        });

        // Initialize WebSocket connection
        this.wsConnection = new Connection(config.solana.wsEndpoint, {
            commitment: config.solana.commitment,
            wsEndpoint: config.solana.wsEndpoint
        });
    }

    async getCurrentConnection() {
        const connection = this.connections.get(this.currentEndpointIndex);
        try {
            // Test connection health
            await connection.getRecentBlockhash();
            return connection;
        } catch (error) {
            console.error(`RPC endpoint ${this.currentEndpointIndex} failed:`, error);
            return this.failover();
        }
    }

    async failover() {
        const now = Date.now();
        let attempts = 0;
        let nextIndex = this.currentEndpointIndex;

        while (attempts < config.solana.rpcEndpoints.length) {
            nextIndex = (nextIndex + 1) % config.solana.rpcEndpoints.length;
            const lastFail = this.lastFailure.get(nextIndex) || 0;

            // Only try endpoints that haven't failed in the last minute
            if (now - lastFail > 60000) {
                const connection = this.connections.get(nextIndex);
                try {
                    await connection.getRecentBlockhash();
                    this.currentEndpointIndex = nextIndex;
                    return connection;
                } catch (error) {
                    this.lastFailure.set(nextIndex, now);
                    console.error(`Failover to endpoint ${nextIndex} failed:`, error);
                }
            }
            attempts++;
        }

        throw new Error('All RPC endpoints are unavailable');
    }

    async subscribeToAccountChanges(publicKey, callback) {
        try {
            // Unsubscribe from existing subscription if any
            await this.unsubscribeFromAccount(publicKey);

            // Create new subscription
            const subscriptionId = this.wsConnection.onAccountChange(
                new PublicKey(publicKey),
                (account) => {
                    const timestamp = Date.now();
                    callback(account, timestamp);
                },
                config.solana.commitment
            );

            this.wsSubscriptions.set(publicKey.toString(), subscriptionId);
            return subscriptionId;
        } catch (error) {
            console.error('WebSocket subscription failed:', error);
            throw error;
        }
    }

    async unsubscribeFromAccount(publicKey) {
        const subscriptionId = this.wsSubscriptions.get(publicKey.toString());
        if (subscriptionId) {
            try {
                await this.wsConnection.removeAccountChangeListener(subscriptionId);
                this.wsSubscriptions.delete(publicKey.toString());
            } catch (error) {
                console.error('Failed to unsubscribe:', error);
            }
        }
    }

    async batchGetAccountInfo(publicKeys) {
        const connection = await this.getCurrentConnection();
        const chunks = [];
        
        // Split into chunks to avoid exceeding RPC limits
        for (let i = 0; i < publicKeys.length; i += config.cache.batchSize) {
            chunks.push(publicKeys.slice(i, i + config.cache.batchSize));
        }

        // Process chunks with retries
        const results = [];
        for (const chunk of chunks) {
            let attempts = 0;
            while (attempts < config.cache.retryAttempts) {
                try {
                    const accounts = await connection.getMultipleAccountsInfo(chunk);
                    results.push(...accounts);
                    break;
                } catch (error) {
                    attempts++;
                    if (attempts === config.cache.retryAttempts) {
                        throw error;
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                }
            }
        }

        return results;
    }

    cleanup() {
        // Cleanup all WebSocket subscriptions
        for (const [publicKey] of this.wsSubscriptions) {
            this.unsubscribeFromAccount(publicKey).catch(console.error);
        }
    }
}

module.exports = new SolanaConnectionManager();