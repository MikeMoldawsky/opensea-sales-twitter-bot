const OpenSeaClient = require("./OpenSeaClient");

function createOpenSeaClient(){
	return new OpenSeaClient(process.env.X_API_KEY);
}


module.exports = createOpenSeaClient;
