const {ethers} = require("ethers");
const SaleTweet = require("./SaleTweet");
const _ = require("lodash");

function createSaleTweet(nftSale) {
	const tagsWithSpace = _.isNil(process.env.TWITTER_TAGS) ? "" : " " + process.env.TWITTER_TAGS;
	const tweetText = `${nftSale.asset_owner} bought ${nftSale.name} for ${nftSale.eth_price}${ethers.constants.EtherSymbol} ($${Number(nftSale.usd_price).toFixed(2)}) #NFT${tagsWithSpace} ${nftSale.link}`;
	return new SaleTweet(tweetText);
}


module.exports = createSaleTweet
