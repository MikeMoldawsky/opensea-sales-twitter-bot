const _ = require('lodash');
const moment = require('moment');
const tweet = require('./tweet');
const lastSaleForCollectionCache = require('./lastSaleForCollectionCache');
const createOpenSeaClient = require("./clients/opensea/OpenSeaClientFactory");
const SaleTweet = require("./objects/twitter/SaleTweet");

function sleep(ms) {
    console.log(`Sleeping for ${ms} ms before starting next collection...`)
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Poll OpenSea every 60 seconds & retrieve all sales for a given collection in either the time since the last sale OR in the last minute
setInterval(() => {
    const collections = JSON.parse(process.env.OPENSEA_COLLECTIONS);
    const openSeaClient = createOpenSeaClient();
    console.log(`>>>>>>>>>> Fetching all sales for collections: ${collections}`)
    _.each(collections, async (collection) => {
        console.log(`##### Tweeting for collection: ${collection} ######`)
        const lastSaleTime = lastSaleForCollectionCache.get(collection, null) || moment().startOf('minute').subtract(120, "seconds").toDate();

        openSeaClient.getOpenSeaCollectionSales(collection, lastSaleTime)
            .then( nftSales => {
                nftSales.forEach( nftSale => {
                    console.log(`Setting lastSale for collection: ${collection} to ${nftSale.created_date}`)
                    const saleTweet = new SaleTweet(nftSale);
                    // TODO: await for tweet
                    tweet.tweet(saleTweet.text);
                    lastSaleForCollectionCache.set(collection, nftSale.created_date);
                    console.log(`<<<<< Successfully tweeted events for collection: ${collection}`)
                });
            })
            .catch((error) => console.error(error)
            );
        console.log(`##### Successfully tweeted for collection: ${collection} ######`)
        await sleep(5000);
    });
    console.log(`<<<<<<<<<< Successfully fetched all all sales for collections: ${collections}`)
    }, 120000);
