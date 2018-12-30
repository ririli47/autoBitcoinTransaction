'use strict';
const ccxt = require ('ccxt');
const config = require ('./config')

const interval = 3000
const profitPrice = 100
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
        if(records.length > 3) {
            records.shift()
        }
        console.log(records)
        if(orderInfo) {
            console.log('latest bid price:', ticker.bid)
            console.log('order price:', orderInfo.price)
            console.log('diff:', ticker.bid - orderInfo.price)
            if(ticker.bid - orderInfo.price > profitPrice) {
                // const order = await bitflyer.createMarketSellOrder ('FX_BTC_JPY', orderSize)
                const order = 'fuga'

                orderInfo = null
                console.log('利確しました', order)
            } else if (ticker.bid - orderInfo.price < -profitPrice) {
                // const order = await bitflyer.createMarketSellOrder ('FX_BTC_JPY', orderSize)
                const order = 'fuga'

                orderInfo = null
                console.log('ロスカットしました', order)
            }
        }
        else {
            if(records[0] < records[1] && records[1] < records[2]) {
                // const order = await bitflyer.createMarketBuyOrder ('FX_BTC_JPY', orderSize)
                const order = 'hoge'
                orderInfo = {
                    order: order,
                    price: ticker.ask
                }
                console.log('買い注文を実施しました', orderInfo)
            }
        }
        await sleep(interval)
    }
}) ();