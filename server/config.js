// Import routes
const authRouter = require('./routes/auth');
const monitorRouter = require('./routes/monitor').router;
const repositoryRouter = require('./routes/repository');

// Express app configuration
const express = require('express');
const app = express();

module.exports = {
    solana: {
        // List of RPC endpoints for failover
        rpcEndpoints: [
            process.env.SOLANA_PRIMARY_RPC || 'https://api.mainnet-beta.solana.com',
            process.env.SOLANA_FALLBACK_RPC1 || 'https://solana-api.projectserum.com',
            process.env.SOLANA_FALLBACK_RPC2 || 'https://api.metaplex.solana.com/'
        ],
        wsEndpoint: process.env.SOLANA_WS_ENDPOINT || 'wss://api.mainnet-beta.solana.com',
        connectionTimeout: 30000, // 30 seconds
        commitment: 'confirmed'
    },
    
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
    },
    
    tokens: {
        // Governance token requirements
        governanceToken: process.env.GOVERNANCE_TOKEN_MINT,
        minRequiredBalance: 1, // Minimum tokens required for access
        premiumThreshold: 100, // Tokens required for premium access
        
        // Required NFTs for access (array of mint addresses)
        requiredNFTs: process.env.REQUIRED_NFT_MINTS ? 
            JSON.parse(process.env.REQUIRED_NFT_MINTS) : [],
            
        // Whitelist addresses that bypass token requirements
        whitelistedAddresses: process.env.WHITELISTED_ADDRESSES ? 
            JSON.parse(process.env.WHITELISTED_ADDRESSES) : []
    },
    
    // Enhanced cache configuration
    cache: {
        ttl: 300, // Reduced to 5 minutes for more real-time verification
        wsUpdateThreshold: 60, // Minimum seconds between WebSocket updates
        batchSize: 100, // Maximum number of accounts to query in a batch
        retryAttempts: 3, // Number of RPC retries before failover
        prefix: 'rolodexter:'
    }
};

// Register routes
app.use('/api/auth', authRouter);
app.use('/api/monitor', monitorRouter);
app.use('/api/repository', repositoryRouter);