const { PublicKey, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/web3.js');
const { Metadata } = require('@metaplex-foundation/mpl-token-metadata');
const Redis = require('ioredis');
const config = require('../config');
const solanaConnection = require('./solana-connection');

class TokenVerifier {
    constructor() {
        this.redis = new Redis(config.redis);
        this.requiredTokens = {
            governance: new PublicKey(config.tokens.governanceToken),
            nfts: config.tokens.requiredNFTs.map(mint => new PublicKey(mint))
        };
        this.activeSubscriptions = new Set();
    }

    async verifyWalletAccess(walletAddress) {
        const cacheKey = `${config.cache.prefix}wallet:${walletAddress}:access`;
        
        // Check cache first
        const cachedResult = await this.redis.get(cacheKey);
        if (cachedResult) {
            return JSON.parse(cachedResult);
        }

        try {
            const publicKey = new PublicKey(walletAddress);
            
            // Setup WebSocket subscription for real-time updates if not already active
            if (!this.activeSubscriptions.has(walletAddress)) {
                await this.setupWalletSubscription(publicKey);
            }

            // Perform initial verification
            const [tokenBalance, nftHoldings] = await Promise.all([
                this.getGovernanceTokenBalance(publicKey),
                this.checkNFTHoldings(publicKey)
            ]);

            const accessResult = this.calculateAccessLevel(tokenBalance, nftHoldings);
            
            // Cache with reduced TTL since we have real-time updates
            await this.redis.setex(cacheKey, config.cache.ttl, JSON.stringify(accessResult));
            
            return accessResult;
        } catch (error) {
            console.error('Token verification error:', error);
            throw error;
        }
    }

    async setupWalletSubscription(publicKey) {
        const walletStr = publicKey.toString();
        if (this.activeSubscriptions.has(walletStr)) return;

        try {
            await solanaConnection.subscribeToAccountChanges(
                publicKey,
                async (account, timestamp) => {
                    await this.handleAccountUpdate(publicKey, account, timestamp);
                }
            );
            this.activeSubscriptions.add(walletStr);
        } catch (error) {
            console.error('Failed to setup wallet subscription:', error);
        }
    }

    async handleAccountUpdate(publicKey, account, timestamp) {
        const cacheKey = `${config.cache.prefix}wallet:${publicKey.toString()}:access`;
        const lastUpdate = await this.redis.get(`${cacheKey}:lastUpdate`);

        // Throttle updates based on configured threshold
        if (lastUpdate && (timestamp - parseInt(lastUpdate)) < (config.cache.wsUpdateThreshold * 1000)) {
            return;
        }

        try {
            // Re-verify access on account change
            const [tokenBalance, nftHoldings] = await Promise.all([
                this.getGovernanceTokenBalance(publicKey),
                this.checkNFTHoldings(publicKey)
            ]);

            const accessResult = this.calculateAccessLevel(tokenBalance, nftHoldings);
            
            // Update cache
            await Promise.all([
                this.redis.setex(cacheKey, config.cache.ttl, JSON.stringify(accessResult)),
                this.redis.setex(`${cacheKey}:lastUpdate`, config.cache.ttl, timestamp.toString())
            ]);
        } catch (error) {
            console.error('Failed to handle account update:', error);
        }
    }

    async getGovernanceTokenBalance(publicKey) {
        const cacheKey = `${config.cache.prefix}wallet:${publicKey.toString()}:balance`;
        
        // Check cache
        const cachedBalance = await this.redis.get(cacheKey);
        if (cachedBalance) {
            return parseFloat(cachedBalance);
        }

        try {
            const tokenAccounts = await solanaConnection.batchGetAccountInfo([
                await this.findAssociatedTokenAddress(publicKey, this.requiredTokens.governance)
            ]);
            
            const balance = tokenAccounts[0] ? this.parseTokenBalance(tokenAccounts[0]) : 0;
            
            // Cache the result
            await this.redis.setex(cacheKey, config.cache.ttl, balance.toString());
            
            return balance;
        } catch (error) {
            console.error('Error fetching token balance:', error);
            return 0;
        }
    }

    async checkNFTHoldings(publicKey) {
        const cacheKey = `${config.cache.prefix}wallet:${publicKey.toString()}:nfts`;
        
        // Check cache
        const cachedNFTs = await this.redis.get(cacheKey);
        if (cachedNFTs) {
            return JSON.parse(cachedNFTs);
        }

        try {
            // Get all NFT token accounts in one batch
            const nftAddresses = await Promise.all(
                this.requiredTokens.nfts.map(nft => 
                    this.findAssociatedTokenAddress(publicKey, nft)
                )
            );

            const accountInfos = await solanaConnection.batchGetAccountInfo(nftAddresses);
            const holdings = accountInfos.map(info => info !== null);

            // Cache the result
            await this.redis.setex(cacheKey, config.cache.ttl, JSON.stringify(holdings));

            return holdings;
        } catch (error) {
            console.error('Error checking NFT holdings:', error);
            return this.requiredTokens.nfts.map(() => false);
        }
    }

    calculateAccessLevel(tokenBalance, nftHoldings) {
        const hasAccess = tokenBalance >= config.tokens.minRequiredBalance || 
                         nftHoldings.some(holds => holds);
        
        return {
            hasAccess,
            level: tokenBalance >= config.tokens.premiumThreshold ? 'premium' : 
                   hasAccess ? 'standard' : 'none',
            balance: tokenBalance,
            nftCount: nftHoldings.filter(Boolean).length,
            timestamp: Date.now()
        };
    }

    parseTokenBalance(accountInfo) {
        if (!accountInfo) return 0;
        // Parse token account data to get balance
        // Implementation depends on token program version
        return accountInfo.amount?.toNumber() || 0;
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

    async cleanup() {
        // Cleanup WebSocket subscriptions
        for (const wallet of this.activeSubscriptions) {
            await solanaConnection.unsubscribeFromAccount(new PublicKey(wallet));
        }
        this.activeSubscriptions.clear();
        
        // Close Redis connection
        await this.redis.quit();
    }
}

module.exports = new TokenVerifier();