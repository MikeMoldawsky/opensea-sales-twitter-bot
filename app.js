const _ = require('lodash');
const moment = require('moment');
const tweet = require('./tweet');
const lastSaleForCollectionCache = require('./lastSaleForCollectionCache');
const createOpenSeaClient = require("./clients/opensea/OpenSeaClientFactory");
const createSaleTweet = require("./objects/twitter/OpenSeaSaleToTweetConverter");

function sleep(ms) {
    console.log(`Sleeping for ${ms} ms before starting next collection...`)
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Poll OpenSea every 60 seconds & retrieve all sales for a given collection in either the time since the last sale OR in the last minute
setInterval(() => {
    const collections = JSON.parse(process.env.OPENSEA_COLLECTIONS);
    const tagsWithSpace = _.isNil(process.env.TWITTER_TAGS) ? "" : " " + process.env.TWITTER_TAGS;
    const openSeaClient = createOpenSeaClient();
    console.log(`>>>>>>>>>> Fetching all sales for collections: ${collections}`)
    _.each(collections,  (collection) => {
        const lastSaleTime = lastSaleForCollectionCache.get(collection, null) || moment().subtract(120, "seconds").toDate();
        openSeaClient.getOpenSeaCollectionSales(collection, lastSaleTime)
            .then( nftSales => {
                console.log(`##### Tweeting Sales for collection: ${collection} that occurred after ${lastSaleTime} ######`)
                nftSales.forEach( nftSale => {
                    const saleTweet = createSaleTweet(nftSale, tagsWithSpace);
                    // TODO: await for tweet
                    tweet.tweet(saleTweet.text);
                    lastSaleForCollectionCache.set(collection, nftSale.created_date);
                    console.log(`Successfully tweeted for collection: ${collection} with created_time ${nftSale.created_date}`)
                });
                console.log(`##### Successfully tweeted ${nftSales.length} for collection: ${collection}  ######`)
            })
            .catch((error) => console.error(error)
            );
        sleep(5000).then(_ => console.log(`Sleep complete...`));
    });
    console.log(`<<<<<<<<<< Successfully fetched all all sales for collections: ${collections}`)
    }, 120000);
