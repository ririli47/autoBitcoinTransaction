'use strict';
const ccxt = require ('ccxt')
const config = require ('./config')
const env = require ('./env')

const interval = 1000
const profitPrice = 500
const lossCutPrice = -250
const orderSize = 0.01
const records = []

let orderInfo = null
let allSales = 0

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
        if(records.length > 5) {
            records.shift()
            console.log(records)

            if(orderInfo) {
                if(orderInfo.position == 'buy') {
                    if(records[0] > records[1] && records[1] > records[2]) {
                        let order = null
                        if(env.production) {
                            order = await bitflyer.createMarketSellOrder ('FX_BTC_JPY', orderSize)
                        }
                        else {
                            order = 'fuga'
                        }
                        allSales +=  (ticker.ask - orderInfo.price)
                        console.log('売り注文を実施しました' + "\n", order)
                        console.log('単収支報告：', ticker.ask - orderInfo.price)
                        console.log('総収支報告：', allSales)
                        orderInfo = null
                    }
                }
                else if(orderInfo.position == 'sell') {
                    if(records[2] > records[1] && records[1] > records[0]) {
                        let order = null
                        if(env.production) {
                            order = await bitflyer.createMarketBuyOrder ('FX_BTC_JPY', orderSize)
                        }
                        else {
                            order = 'fuga'
                        }
                        allSales +=  (orderInfo.price - ticker.ask)
                        console.log('買い注文を実施しました' + "\n", order)
                        console.log('単収支報告：', orderInfo.price - ticker.ask)
                        console.log('総収支報告：', allSales)
                        orderInfo = null
                    }    
                }
            }
            else {
                if(records[0] < records[1] && records[1] < records[2] && records[2] < records[3] && records[3] < records[4]) {
                    let order = null
                    if(env.production) {
                        order = await bitflyer.createMarketBuyOrder ('FX_BTC_JPY', orderSize)
                    }
                    else {
                        order = 'hoge'
                    }
                    orderInfo = {
                        order: order,
                        price: ticker.ask,
                        position: 'buy'
                    }
                    console.log('買い注文を実施しました' + "\n", orderInfo)
                }
                else if (records[4] < records[3] && records[3] < records[2] && records[2] < records[1] && records[1] < records[0]) {
                    let order = null
                    if(env.production) {
                        order = await bitflyer.createMarketSellOrder ('FX_BTC_JPY', orderSize)
                    }
                    else {
                        order = 'hoge'
                    }
                    orderInfo = {
                        order: order,
                        price: ticker.ask,
                        position: 'sell'
                    }
                    console.log('売り注文を実施しました' + "\n", orderInfo)
                }
            }
        }
        await sleep(interval)
    }
}) ();
