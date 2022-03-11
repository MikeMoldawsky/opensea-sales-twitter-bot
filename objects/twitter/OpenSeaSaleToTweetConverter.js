const {ethers} = require("ethers");
const SaleTweet = require("./SaleTweet");

function createSaleTweet(nftSale, tags) {
	const tweetText = `${nftSale.asset_owner} bought ${nftSale.name} for ${nftSale.eth_price}${ethers.constants.EtherSymbol} ($${Number(nftSale.usd_price).toFixed(2)}) #NFT ${tags} ${nftSale.link}`;
	return new SaleTweet(tweetText);
}


module.exports = createSaleTweet
