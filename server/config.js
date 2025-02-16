const express = require('express');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const monitorRoutes = require('./routes/monitor');
const repositoryRouter = require('./routes/repository');

// Note: Knowledge Graph routes have been removed as the graph now runs entirely client-side
// for GitHub Pages compatibility. See /docs/knowledge-graph.md for implementation details.

// Server config
const config = {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    
    // Configure routes
    configureRoutes: (app) => {
        app.use('/api/auth', authRoutes);
        app.use('/api/monitor', monitorRoutes);
        app.use('/api/repository', repositoryRouter);
    },
    
    // Static file serving
    configureStatic: (app) => {
        app.use(express.static(path.join(__dirname, '../')));
    }
};

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
config.configureRoutes(app);
config.configureStatic(app);