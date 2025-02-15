module.exports = {
    solana: {
        rpcEndpoint: process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com',
        wsEndpoint: process.env.SOLANA_WS_ENDPOINT || 'wss://api.mainnet-beta.solana.com',
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
    
    // Cache configuration
    cache: {
        ttl: 600, // 10 minutes in seconds
        prefix: 'rolodexter:'
    }
};