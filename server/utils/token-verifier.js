const { Connection, PublicKey, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/web3.js');
const { Metadata } = require('@metaplex-foundation/mpl-token-metadata');
const Redis = require('ioredis');
const config = require('../config');

// Redis client for server-side caching
const redis = new Redis(config.redis);

// Solana connection
const connection = new Connection(config.solana.rpcEndpoint);

// Cache TTL in seconds (10 minutes)
const CACHE_TTL = 600;

class TokenVerifier {
    constructor() {
        this.requiredTokens = {
            governance: new PublicKey(config.tokens.governanceToken),
            nfts: config.tokens.requiredNFTs.map(mint => new PublicKey(mint))
        };
    }

    async verifyWalletAccess(walletAddress) {
        const cacheKey = `wallet:${walletAddress}:access`;
        
        // Check cache first
        const cachedResult = await redis.get(cacheKey);
        if (cachedResult) {
            return JSON.parse(cachedResult);
        }

        try {
            const publicKey = new PublicKey(walletAddress);
            
            // Check governance token balance
            const tokenBalance = await this.getGovernanceTokenBalance(publicKey);
            const hasRequiredBalance = tokenBalance >= config.tokens.minRequiredBalance;

            // Check NFT holdings in parallel
            const nftHoldings = await this.checkNFTHoldings(publicKey);
            
            const accessResult = {
                hasAccess: hasRequiredBalance || nftHoldings.some(holds => holds),
                level: this.determineAccessLevel(tokenBalance, nftHoldings),
                timestamp: Date.now()
            };

            // Cache the result
            await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(accessResult));
            
            return accessResult;
        } catch (error) {
            console.error('Token verification error:', error);
            throw error;
        }
    }

    async getGovernanceTokenBalance(publicKey) {
        const cacheKey = `wallet:${publicKey.toString()}:balance`;
        
        // Check cache
        const cachedBalance = await redis.get(cacheKey);
        if (cachedBalance) {
            return parseFloat(cachedBalance);
        }

        try {
            const balance = await connection.getTokenAccountBalance(
                await this.findAssociatedTokenAddress(publicKey, this.requiredTokens.governance)
            );
            
            // Cache the result
            await redis.setex(cacheKey, CACHE_TTL, balance.value.uiAmount.toString());
            
            return balance.value.uiAmount;
        } catch (error) {
            console.error('Error fetching token balance:', error);
            return 0;
        }
    }

    async checkNFTHoldings(publicKey) {
        const cacheKey = `wallet:${publicKey.toString()}:nfts`;
        
        // Check cache
        const cachedNFTs = await redis.get(cacheKey);
        if (cachedNFTs) {
            return JSON.parse(cachedNFTs);
        }

        try {
            // Batch query for NFT holdings
            const nftAddresses = await Promise.all(
                this.requiredTokens.nfts.map(nft => 
                    this.findAssociatedTokenAddress(publicKey, nft)
                )
            );

            const accountInfos = await connection.getMultipleAccountsInfo(nftAddresses);
            const holdings = accountInfos.map(info => info !== null);

            // Cache the result
            await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(holdings));

            return holdings;
        } catch (error) {
            console.error('Error checking NFT holdings:', error);
            return this.requiredTokens.nfts.map(() => false);
        }
    }

    determineAccessLevel(tokenBalance, nftHoldings) {
        if (tokenBalance >= config.tokens.premiumThreshold) {
            return 'premium';
        } else if (tokenBalance >= config.tokens.minRequiredBalance || nftHoldings.some(holds => holds)) {
            return 'standard';
        }
        return 'none';
    }

    async findAssociatedTokenAddress(walletAddress, tokenMint) {
        const [associatedTokenAddress] = await PublicKey.findProgramAddress(
            [
                walletAddress.toBuffer(),
                TOKEN_PROGRAM_ID.toBuffer(),
                tokenMint.toBuffer(),
            ],
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        return associatedTokenAddress;
    }
}

module.exports = new TokenVerifier();