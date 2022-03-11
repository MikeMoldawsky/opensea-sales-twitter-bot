class NFTOpenSeaSale {
	constructor(name, eth_price, usd_price, link, created_date, assetOwner) {
		this.name = name;
		this.eth_price = eth_price;
		this.usd_price = usd_price;
		this.link = link;
		this.created_date = new Date(created_date);
		this.asset_owner = assetOwner;
	}
}

module.exports = NFTOpenSeaSale;
