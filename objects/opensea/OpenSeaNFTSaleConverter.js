const _ = require("lodash");
const {ethers} = require("ethers");
const NFTOpenSeaSale = require("./NFTOpenSeaSale");


function createNFTSale(openSeaEvent) {
	// Handle both individual items + bundle sales
	const assetName = _.get(openSeaEvent, ['asset', 'name'], _.get(openSeaEvent, ['asset_bundle', 'name']));
	const openseaLink = _.get(openSeaEvent, ['asset', 'permalink'], _.get(openSeaEvent, ['asset_bundle', 'permalink']));

	// extract eth prices
	// TODO: handle other currencies
	const totalPrice = _.get(openSeaEvent, 'total_price');
	const tokenDecimals = _.get(openSeaEvent, ['payment_token', 'decimals']);
	const tokenUsdPrice = _.get(openSeaEvent, ['payment_token', 'usd_price']);
	const tokenEthPrice = _.get(openSeaEvent, ['payment_token', 'eth_price']);

	const formattedUnits = ethers.utils.formatUnits(totalPrice, tokenDecimals);
	const formattedEthPrice = formattedUnits * tokenEthPrice;
	const formattedUsdPrice = formattedUnits * tokenUsdPrice;

	return new NFTOpenSeaSale(assetName, formattedEthPrice, formattedUsdPrice, openseaLink);
}


module.exports = createNFTSale



