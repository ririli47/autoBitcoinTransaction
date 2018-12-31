'use strict';
const ccxt = require ('ccxt')
const config = require ('./config')

const production = false

const interval = 30000
const profitPrice = 300
const lossCutPrice = -250
const orderSize = 0.01
const records = []

let orderInfo = null


const sleep = (timer) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, timer)
    })
}

(async function () {
    const bitflyer = new ccxt.bitflyer (config)

    while (true) {
        const ticker = await bitflyer.fetchTicker ('FX_BTC_JPY')
        records.push(ticker.ask)
        if(records.length > 4) {
            records.shift()
        }
        console.log(records)
        if(orderInfo) {
            console.log('latest bid price:', ticker.bid)
            console.log('order price     :', orderInfo.price)
            console.log('diff            :', ticker.bid - orderInfo.price)
            if(ticker.bid - orderInfo.price > profitPrice) {
                let order = null
                if(production) {
                    order = await bitflyer.createMarketSellOrder ('FX_BTC_JPY', orderSize)
                }
                else {
                    order = 'fuga'
                }
                orderInfo = null
                console.log('利確しました' + "\n", order)
                // sendToSlack('利確しました')
            } else if (ticker.bid - orderInfo.price < lossCutPrice) {
                let order = null
                if(production) {
                    order = await bitflyer.createMarketSellOrder ('FX_BTC_JPY', orderSize)
                }
                else {
                    order = 'fuga'
                }
                orderInfo = null
                console.log('ロスカットしました' + "\n", order)
                // sendToSlack('ロスカットしました')
            }
        }
        else {
            if( records[0] < records[1] &&
                records[1] < records[2] && 
                records[2] < records[3] ) {
                let order = null
                if(production) {
                    order = await bitflyer.createMarketBuyOrder ('FX_BTC_JPY', orderSize)
                }
                else {
                    order = 'hoge'
                }
                orderInfo = {
                    order: order,
                    price: ticker.ask
                }
                console.log('買い注文を実施しました' + "\n", orderInfo)
                // sendToSlack('買い注文を実施しました')
            }
        }
        await sleep(interval)
    }
}) ();

function sendToSlack(message) {
    const axiosBase = require('axios');

    const axios = axiosBase.create({
        baseURL: 'https://hooks.slack.com/services/',
        timeout: 10000,
        headers: ''
    })

    var data = {
        "channel": "#bitcoin_transaction",
        "username": "webhookbot",
        "text": message,
    }

    axios.post('T5E58Q00N/BCQ459QGJ/zwHpxXy1sVwzSMIc5xNLcD9k', {
        params: {
            payload: data
        }
    })
    .then(response => { 
        console.log(response)
    })
    .catch(error => {
        console.log(error.response)
    });
}