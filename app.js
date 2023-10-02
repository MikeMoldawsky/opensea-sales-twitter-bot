import { Network, Alchemy } from 'alchemy-sdk';
import { ethers } from 'ethers';
import { createClient } from 'redis';
import { TwitterApi } from 'twitter-api-v2';

// NFT SALES CLIENT
async function getNftSalesForCollection(client, contractAddress, fromBlock) {
    const result = await client.nft.getNftSales({
        contractAddress,
        fromBlock: fromBlock || 'latest',
    });
    result.nftSales = result.nftSales.filter((sale) => sale.buyerAddress !== sale.sellerAddress);
    return result;
}

async function getNftMetadata(client, contractAddress, tokenId) {
    return await client.nft.getNftMetadata(contractAddress, tokenId, {});
}

// TWITTER
const userClient = new TwitterApi({
    appKey: process.env.CONSUMER_KEY,
    appSecret: process.env.CONSUMER_SECRET,
    accessToken: process.env.ACCESS_TOKEN_KEY,
    accessSecret: process.env.ACCESS_TOKEN_SECRET,
});

function formatEthereumAddress(address) {
    return address.slice(0, 6) + '...' + address.slice(-4);
}

function normalizeMarketplaceName(marketplaceName) {
    const nameLowerCase = marketplaceName.toLowerCase();
    if (nameLowerCase.includes('seaport') || nameLowerCase.includes('wyvern')) {
        return 'OpenSea';
    }
    return marketplaceName.charAt(0).toUpperCase() + marketplaceName.slice(1);
}

function formatTokenId(tokenId) {
    const idString = tokenId.toString(); // Ensure it's a string
    if (idString.length > 8) {
        return idString.slice(0, 4) + '...' + idString.slice(-4);
    }
    return idString;
}

function calculateTotalWETH(sale) {
    let totalFee = BigInt(sale.sellerFee.amount);
    if (sale.taker === 'buyer') {
        totalFee =
            totalFee +
            BigInt(sale.marketplaceFee.amount || 0) +
            BigInt(sale.royaltyFee.amount || 0);
    }
    return ethers.utils.formatUnits(totalFee.toString(), sale.sellerFee.decimals);
}

function generateTweet(nftSale, nftMetadata) {
    let priceInWETH = calculateTotalWETH(nftSale);
    const marketplace = normalizeMarketplaceName(nftSale.marketplace);
    let tweet = `📣 Recently Sold 📣\n\n🎨 Title: ${nftMetadata.title} #${formatTokenId(
        nftMetadata.tokenId,
    )}\n💰 Price: ${priceInWETH} ${
        nftSale.sellerFee.symbol
    }\n\n👥 Sold on ${marketplace} from ${formatEthereumAddress(
        nftSale.sellerAddress,
    )} to ${formatEthereumAddress(nftSale.buyerAddress)}\n\nhttps://opensea.io/assets/ethereum/${
        nftMetadata.contract.address
    }/${nftMetadata.tokenId}`;

    return tweet;
}

// REDIS
async function getFromBlockCache(redis, contractAddress) {
    const blockNumber = await redis.get(contractAddress);
    console.log(`📜 Retrieved from block number for contract ${contractAddress}: ${blockNumber}`);
    return blockNumber || 'latest';
}

async function setFromBlockCache(redis, contractAddress, fromBlock) {
    await redis.set(contractAddress, fromBlock);
    console.log(`📝 Updated block number for contract ${contractAddress} to: ${fromBlock}`);
}

async function main() {
    console.log(`🤖 Bot waking up: ${new Date().toISOString()}`);
    const redis = await createClient({ url: process.env.REDISCLOUD_URL })
        .on('error', (err) => console.log('Redis Client Error', err))
        .connect();
    const alchemy = new Alchemy({
        apiKey: process.env.ALCHEMY_API_KEY,
        network: Network.ETH_MAINNET,
    });
    const collections = JSON.parse(process.env.NFT_CONTRACTS);

    for (const collection of collections) {
        console.log(`Processing collection: ${collection}`);

        let fromBlock;
        try {
            fromBlock = await getFromBlockCache(redis, collection);
            console.log(`Listing sales from block ${fromBlock} for collection ${collection}`);
        } catch (error) {
            console.error(`Failed to fetch block number for collection ${collection}:`, error);
            continue; // Skip to the next collection
        }

        let nftSalesForContract;
        try {
            nftSalesForContract = await getNftSalesForCollection(alchemy, collection, fromBlock);
        } catch (error) {
            console.error(`Failed to fetch sales for collection ${collection}:`, error);
            continue; // Skip to the next collection
        }
        console.log(
            `Identifies ${nftSalesForContract.nftSales.length} sales for collection ${collection}`,
        );
        for (const nftSale of nftSalesForContract.nftSales) {
            try {
                const nftMetadata = await getNftMetadata(
                    alchemy,
                    nftSale.contractAddress,
                    nftSale.tokenId,
                    {},
                );
                const tweetMessage = generateTweet(nftSale, nftMetadata);
                console.log(
                    `Tweeting sale for token ${nftSale.tokenId} in collection ${collection}:`,
                    tweetMessage,
                );
                await userClient.v2.tweet(tweetMessage);
            } catch (error) {
                console.error(
                    `Failed to tweet sale for token ${nftSale.tokenId} in collection ${collection}:`,
                    error,
                );
            }
        }

        try {
            const { blockNumber } = nftSalesForContract.validAt;
            await setFromBlockCache(redis, collection, BigInt(blockNumber + 1).toString());
        } catch (error) {
            console.error(`Failed to update block number for collection ${collection}:`, error);
        }
    }

    try {
        await redis.disconnect();
    } catch (error) {
        console.error('Failed to disconnect from Redis:', error);
    }
    console.log(`🤖 Bot going to sleep: ${new Date().toISOString()}`);
}

console.log(`################## Tweet Sales Bot ACTIVATED ##################`);
const interval_minutes = 4;
async function continuousExecution() {
    try {
        await main();
    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        setTimeout(continuousExecution, interval_minutes * 60 * 1000); // Schedule the next run after 4 minutes
    }
}

// Start the first execution immediately upon startup
continuousExecution();
