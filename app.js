const _ = require('lodash');
const moment = require('moment');
const tweet = require('./tweet');
const lastSaleForCollectionCache = require('./lastSaleForCollectionCache');
const createOpenSeaClient = require("./clients/opensea/OpenSeaClientFactory");
const createSaleTweet = require("./objects/twitter/OpenSeaSaleToTweetConverter");

async function sleep(ms) {
    console.log(`Sleeping for ${ms} ms before starting next collection...`)
    await new Promise(resolve => setTimeout(resolve, ms));
}

async function tweetSaleForCollection(collection, nftSale) {
    try {
        const saleTweet = createSaleTweet(nftSale, tagsWithSpace);
        console.log(`Tweeting NFT SALE ${nftSale.name} for collection: ${collection} (created_time ${nftSale.created_date})`);
        await tweet.tweet(saleTweet.text);
        lastSaleForCollectionCache.set(collection, nftSale.created_date);
    } catch (e) {
        console.error(e);
    }
}

async function getSalesAndTweetForCollection(collection) {
    try {
        const lastSaleTime = lastSaleForCollectionCache.get(collection, null) || moment().subtract(120, "seconds").toDate();
        console.log(`Fetching OpenSea Sales for ${collection} (after ${lastSaleTime})`);
        const nftSales = await openSeaClient.getOpenSeaCollectionSales(collection, lastSaleTime);
        console.log(`Tweeting ${nftSales.length} sales for collection: ${collection}`);
        return nftSales.map(async (nftSale) => await tweetSaleForCollection(collection, nftSale));
    } catch (e) {
        console.error(e);
    }
}

async function tweetCollectionsSales(collections) {
    console.log(`>>>>>>>>>> Tweet Sales Bot Round STARTED for: ${collections}`)
    await _.reduce(collections, async (_accumulator, collection) => {
        await getSalesAndTweetForCollection(collection);
        await sleep(5000);
        console.log(`!!!!!! OpenSea API throttling COMPLETED for collection: ${collections}!!!!`);
    });
    console.log(`<<<<<<<<<< Tweet Sales Bot Round COMPLETED <<<<<<<<<<`)
}

const collections = JSON.parse(process.env.OPENSEA_COLLECTIONS);
const tagsWithSpace = _.isNil(process.env.TWITTER_TAGS) ? "" : " " + process.env.TWITTER_TAGS;
const openSeaClient = createOpenSeaClient();

async function tweetCollectionsSalesRecursive(delay){
    try {
        await tweetCollectionsSales(collections)
        setTimeout(() => tweetCollectionsSalesRecursive(delay), delay);
        console.log("")
    }catch (e) {
        console.log(e);
    }
}

console.log(`################## Tweet Sales Bot ACTIVATED ##################`)
tweetCollectionsSalesRecursive(120000).catch(e => console.error(e))
