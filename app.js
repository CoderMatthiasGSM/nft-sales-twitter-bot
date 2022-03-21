// external
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const axios = require('axios');
const { ethers } = require('ethers');
const _ = require('lodash');
// local
const { markets } = require('./markets.js');
const { currencies } = require('./currencies.js');
const { transferEventTypes, saleEventTypes } = require('./log_event_types.js');
const { tweet } = require('./tweet');
const abi = require('./abi.json');
const abi2 = require('./abi2.json');

// connect to Alchemy websocket
const web3 = createAlchemyWeb3(`wss://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`);

// sometimes web3.js can return duplicate transactions in a split second, so
let lastTransactionHash;

async function monitorContract() {
    const contract = new web3.eth.Contract(abi, process.env.CONTRACT_ADDRESS);

    contract.events.Transfer({})
        .on('connected', (subscriptionId) => {
            console.log(subscriptionId);
        })
        .on('data', async (data) => {
            const transactionHash = data.transactionHash.toLowerCase();

            // duplicate transaction - skip process
            if (transactionHash == lastTransactionHash) {
                return;
            }

            lastTransactionHash = transactionHash;

            const receipt = await web3.eth.getTransactionReceipt(transactionHash);

            const recipient = receipt.to.toLowerCase();

            // not a marketplace transaction transfer, skip
            if (!(recipient in markets)) {
                return;
            }

            // retrieve market details
            const market = _.get(markets, recipient);

            // default to eth, see currencies.js for currently support currencies
            let currency = {
                'name': 'ETH',
                'decimals': 18,
                'threshold': 1
            };
            let tokens = [];
            let totalPrice;

            for (let log of receipt.logs) {
                const logAddress = log.address.toLowerCase();

                // if non-ETH transaction
                if (logAddress in currencies) {
                    currency = currencies[logAddress];
                }

                // token(s) part of the transaction
                if (log.data == "0x" && transferEventTypes.includes(log.topics[0])) {
                    const tokenId = web3.utils.hexToNumberString(log.topics[3]);

                    tokens.push(tokenId);
                }
                
                const contractType = 'Men';

                // transaction log - decode log in correct format depending on market & retrieve price
                if (logAddress == recipient && saleEventTypes.includes(log.topics[0])) {
                    const decodedLogData = web3.eth.abi.decodeLog(market.logDecoder, log.data, []);

                    totalPrice = ethers.utils.formatUnits(decodedLogData.price, currency.decimals);
                }
            }

            // remove any dupes
            tokens = _.uniq(tokens);

            // custom - don't post sales below a currencies manually set threshold
            // if (Number(totalPrice) < currency.threshold) {
            //     console.log(`Sale under ${currency.threshold}: Token ID: ${tokens[0]}, Price: ${totalPrice}`);

            //     return;
            // }

            // retrieve metadata for the first (or only) ERC21 asset sold
            const tokenData = await getTokenData(tokens[0]);

            // if more than one asset sold, link directly to etherscan tx, otherwise the marketplace item
            if (tokens.length > 1) {
                tweet(`Warrior of Aradena #${_.get(tokenData, 'assetName')} & other assets bought for ${totalPrice} ${currency.name} on ${market.name} https://etherscan.io/tx/${transactionHash}`);
            } else {
                tweet(`Warrior of Aradena #${_.get(tokenData, 'assetName')} has joined a new guild for ${totalPrice} ${currency.name} (${market.name}). Aradena welcomes you ⚔️🍻! #NFT #StrategyGame #PlayToEarn ${market.site}${process.env.CONTRACT_ADDRESS}/${tokens[0]}`);
            }
        })
        .on('changed', (event) => {
            console.log('change');
        })
        .on('error', (error, receipt) => {
            // if the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            console.error(error);
            console.error(receipt);
        });
}

async function monitorContractWOMEN() {
    const contract = new web3.eth.Contract(abi2, process.env.CONTRACT_ADDRESS_2);

    contract.events.Transfer({})
        .on('connected', (subscriptionId) => {
            console.log(subscriptionId);
        })
        .on('data', async (data) => {
            const transactionHash = data.transactionHash.toLowerCase();

            // duplicate transaction - skip process
            if (transactionHash == lastTransactionHash) {
                return;
            }

            lastTransactionHash = transactionHash;

            const receipt = await web3.eth.getTransactionReceipt(transactionHash);

            const recipient = receipt.to.toLowerCase();

            // not a marketplace transaction transfer, skip
            if (!(recipient in markets)) {
                return;
            }

            // retrieve market details
            const market = _.get(markets, recipient);

            // default to eth, see currencies.js for currently support currencies
            let currency = {
                'name': 'ETH',
                'decimals': 18,
                'threshold': 1
            };
            let tokens = [];
            let totalPrice;

            for (let log of receipt.logs) {
                const logAddress = log.address.toLowerCase();

                // if non-ETH transaction
                if (logAddress in currencies) {
                    currency = currencies[logAddress];
                }

                // token(s) part of the transaction
                if (log.data == "0x" && transferEventTypes.includes(log.topics[0])) {
                    const tokenId = web3.utils.hexToNumberString(log.topics[3]);

                    tokens.push(tokenId);
                }

                // transaction log - decode log in correct format depending on market & retrieve price
                if (logAddress == recipient && saleEventTypes.includes(log.topics[0])) {
                    const decodedLogData = web3.eth.abi.decodeLog(market.logDecoder, log.data, []);

                    totalPrice = ethers.utils.formatUnits(decodedLogData.price, currency.decimals);
                }
                
                const contractType = 'Women';
            }

            // remove any dupes
            tokens = _.uniq(tokens);

            // custom - don't post sales below a currencies manually set threshold
            // if (Number(totalPrice) < currency.threshold) {
            //     console.log(`Sale under ${currency.threshold}: Token ID: ${tokens[0]}, Price: ${totalPrice}`);

            //     return;
            // }

            // retrieve metadata for the first (or only) ERC21 asset sold
            const tokenData = await getTokenData(tokens[0]);

            // if more than one asset sold, link directly to etherscan tx, otherwise the marketplace item
            if (tokens.length > 1) {
                tweet(`Woman of Aradena #${_.get(tokenData, 'assetName')} & other assets bought for ${totalPrice} ${currency.name} on ${market.name} https://etherscan.io/tx/${transactionHash}`);
            } else {
                tweet(`Woman of Aradena #${_.get(tokenData, 'assetName')} has joined a new guild for ${totalPrice} ${currency.name} (${market.name}). Aradena welcomes you ⚔️🍻! #NFT #StrategyGame #PlayToEarn ${market.site}${process.env.CONTRACT_ADDRESS}/${tokens[0]}`);
            }
        })
        .on('changed', (event) => {
            console.log('change');
        })
        .on('error', (error, receipt) => {
            // if the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            console.error(error);
            console.error(receipt);
        });
}

async function getTokenData(tokenId,contractType) {
    try {
        // retrieve metadata for asset from opensea
        if (contractType == "Men"){
            const response = await axios.get(`https://api.opensea.io/api/v1/asset/${process.env.CONTRACT_ADDRESS}/${tokenId}`, {
                headers: {
                    'X-API-KEY': process.env.X_API_KEY
            }
        });}
        else {
            const response = await axios.get(`https://api.opensea.io/api/v1/asset/${process.env.CONTRACT_ADDRESS_2}/${tokenId}`, {
                headers: {
                   'X-API-KEY': process.env.X_API_KEY
            }   
        });}

        const data = response.data;

        // just the asset name for now, but retrieve whatever you need
        return {
            'assetName': _.get(data, 'token_id')
        };F
    } catch (error) {
        if (error.response) {
            console.log(error.response.data);
            console.log(error.response.status);
        } else {
            console.error(error.message);
        }
    }
}

// initate websocket connection
monitorContract();
monitorContractWOMEN();
