const _ = require("lodash");
const {ethers} = require("ethers");
const NFTOpenSeaSale = require("./NFTOpenSeaSale");

// ############################################################################################################
// ########### EXAMPLE FOR OTHER FUNCTIONALITY ###########
// OPTIONAL PREFERENCE - don't tweet out sales below X ETH (default is 1 ETH - change to what you prefer)
// if (Number(formattedEthPrice) < 1) {
//     console.log(`${assetName} sold below tweet price (${formattedEthPrice} ETH).`);
//     return;
// }
//
// OPTIONAL PREFERENCE - if you want the tweet to include an attached image instead of just text
// const imageUrl = _.get(event, ['asset', 'image_url']);
// return tweet.tweetWithImage(tweetText, imageUrl);
// ############################################################################################################
function createNFTSale(openSeaEvent) {
	// Handle both individual items + bundle sales
	const assetName = _.get(openSeaEvent, ['asset', 'name'], _.get(openSeaEvent, ['asset_bundle', 'name']));
	const openseaLink = _.get(openSeaEvent, ['asset', 'permalink'], _.get(openSeaEvent, ['asset_bundle', 'permalink']));
	let assetOwner = _.get(openSeaEvent, ['asset', 'owner', 'user', 'username'], _.get(openSeaEvent, ['asset_bundle', 'owner', 'user', 'username']));
	const createdDate = _.get(openSeaEvent, 'created_date');

	// extract eth prices
	// TODO: handle other currencies
	const totalPrice = _.get(openSeaEvent, 'total_price');
	const tokenDecimals = _.get(openSeaEvent, ['payment_token', 'decimals']);
	const tokenUsdPrice = _.get(openSeaEvent, ['payment_token', 'usd_price']);
	const tokenEthPrice = _.get(openSeaEvent, ['payment_token', 'eth_price']);

	const formattedUnits = ethers.utils.formatUnits(totalPrice, tokenDecimals);
	const formattedEthPrice = formattedUnits * tokenEthPrice;
	const formattedUsdPrice = formattedUnits * tokenUsdPrice;
	if(_.isNil(assetOwner) || assetOwner === 'NullAddress'){
		assetOwner = 'Unknown';
	}
	return new NFTOpenSeaSale(assetName, formattedEthPrice, formattedUsdPrice, openseaLink, createdDate, assetOwner);
}


module.exports = createNFTSale



