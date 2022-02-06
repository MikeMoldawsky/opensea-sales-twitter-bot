const axios = require('axios');
const _ = require('lodash');
const moment = require('moment');
const { ethers } = require('ethers');
const tweet = require('./tweet');
const lastSaleForCollectionCache = require('./lastSaleForCollectionCache');

// Format tweet text
function formatAndSendTweet(event, collection, tags) {
    // Handle both individual items + bundle sales
    const assetName = _.get(event, ['asset', 'name'], _.get(event, ['asset_bundle', 'name']));
    const openseaLink = _.get(event, ['asset', 'permalink'], _.get(event, ['asset_bundle', 'permalink']));

    const totalPrice = _.get(event, 'total_price');

    const tokenDecimals = _.get(event, ['payment_token', 'decimals']);
    const tokenUsdPrice = _.get(event, ['payment_token', 'usd_price']);
    const tokenEthPrice = _.get(event, ['payment_token', 'eth_price']);

    const formattedUnits = ethers.utils.formatUnits(totalPrice, tokenDecimals);
    const formattedEthPrice = formattedUnits * tokenEthPrice;
    const formattedUsdPrice = formattedUnits * tokenUsdPrice;

    const tweetText = `${assetName} bought for ${formattedEthPrice}${ethers.constants.EtherSymbol} ($${Number(formattedUsdPrice).toFixed(2)}) #NFT ${tags} ${openseaLink}`;

    console.log(tweetText);

    // OPTIONAL PREFERENCE - don't tweet out sales below X ETH (default is 1 ETH - change to what you prefer)
    // if (Number(formattedEthPrice) < 1) {
    //     console.log(`${assetName} sold below tweet price (${formattedEthPrice} ETH).`);
    //     return;
    // }

    // OPTIONAL PREFERENCE - if you want the tweet to include an attached image instead of just text
    // const imageUrl = _.get(event, ['asset', 'image_url']);
    // return tweet.tweetWithImage(tweetText, imageUrl);

    return tweet.tweet(tweetText);
}

function getOpenSeaCollectionSalesResponse(lastSaleTime, collectionSlug) {
    console.log(`>>>>> Fetching OpenSea sales for collection: ${collectionSlug} since: ${lastSaleTime}`)
    const openSeaEventsApi = 'https://api.opensea.io/api/v1/events';
    // const openSeaEventsApi = 'https://testnets-api.opensea.io/api/v1/events';
    // const X_API_KEY_TEST_OPENSEA = '5bec8ae0372044cab1bef0d866c98618' // remove
    return axios.get(openSeaEventsApi, {
        headers: {
            'X-API-KEY': process.env.X_API_KEY
        },
        params: {
            collection_slug: collectionSlug,
            event_type: 'successful',
            occurred_after: lastSaleTime,
            only_opensea: 'false'
        }
    });
}

function sortOpenSeaCollectionEventsAndTweet(response, collection, tags) {
    const events = _.get(response, ['data', 'asset_events']);
    console.log(`>>>>> Tweeting ${events.length} events for collection: ${collection}`)
    const sortedEvents = _.sortBy(events, function (event) {
        const created = _.get(event, 'created_date');

        return new Date(created);
    });


    _.each(sortedEvents, (event) => {
        const created = _.get(event, 'created_date');
        console.log(`Setting lastSale for collection: ${collection} to ${created}`)
        lastSaleForCollectionCache.set(collection, moment(created).unix());
        return formatAndSendTweet(event, collection, tags);
    });
    console.log(`<<<<< Successfully tweeted events for collection: ${collection}`)
}

// Poll OpenSea every 60 seconds & retrieve all sales for a given collection in either the time since the last sale OR in the last minute
setInterval(() => {
    const collections = JSON.parse(process.env.OPENSEA_COLLECTIONS);
    console.log(`>>>>>>>>>> Fetching all sales for collections: ${collections}`)
    _.each(collections, (collection) => {
        console.log(`##### Tweeting for collection: ${collection} ######`)
        const lastSaleTime = lastSaleForCollectionCache.get(collection, null) || moment().startOf('minute').subtract(120, "seconds").unix();
        getOpenSeaCollectionSalesResponse(lastSaleTime, collection)
            .then((response) => sortOpenSeaCollectionEventsAndTweet(response, collection, process.env.TWITTER_TAGS))
            .catch((error) => console.error(error)
            );
        console.log(`##### Successfully tweeted for collection: ${collection} ######`)
    });
    console.log(`<<<<<<<<<< Successfully fetched all all sales for collections: ${collections}`)
    }, 120000);
