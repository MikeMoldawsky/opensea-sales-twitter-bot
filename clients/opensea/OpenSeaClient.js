const axios = require("axios");
const _ = require("lodash");
const createNFTSale = require("../../objects/opensea/OpenSeaNFTSaleConverter");
const openSeaEventsApi = 'https://api.opensea.io/api/v1/events';

function inTimeFrameSale(occurred_after, nftSale) {
	const isInTimeFrameSale = _.isNil(occurred_after) || occurred_after < nftSale.created_date;
	console.log(`${JSON.stringify(nftSale)} is in time frame ${isInTimeFrameSale}`);
	return isInTimeFrameSale;
}

class OpenSeaClient {
	constructor(apiKey) {
		this.api_key = apiKey;
	}

	async getOpenSeaCollectionSales(collectionSlug, occurred_after) {
		let isLastPage = false;
		let nextPage = null;
		const nftSalesResult = [];
		for (let i = 0; i < 5 && !isLastPage; i++) { //limit max rounds to 5
			console.log(`>>>>> Page ${i}: Fetching OpenSea sales for collection: ${collectionSlug}`);
			const response = await axios.get(openSeaEventsApi, {
				headers: {
					'X-API-KEY': this.api_key
				},
				params: {
					collection_slug: collectionSlug,
					event_type: 'successful',
					only_opensea: 'false',
					cursor: nextPage
				}
			});
			const events = _.get(response, ['data', 'asset_events']);
			const nftSales = _.map(events, (event) =>  createNFTSale(event));

			const lastPageSale = _.last(nftSales);
			nextPage = _.get(response, ['data', 'next']);
			// when occurred after is nil we'll tweet a single page
			if(_.isNil(occurred_after) || _.isNil(lastPageSale) || _.isNil(nextPage)  || lastPageSale.created_date < occurred_after ){
				isLastPage = true;
			}

		 const salesInTimeFrame = _.filter(nftSales, nftSale => inTimeFrameSale(occurred_after, nftSale));

		salesInTimeFrame.forEach(sale => nftSalesResult.push(sale));
		}
		console.log(`Successfully Fetched OpenSea sales for collection: ${collectionSlug} with a total of ${nftSalesResult.length} Sales`);
		return nftSalesResult;

	}
}

module.exports =  OpenSeaClient
