'use strict';
const ccxt = require ('ccxt')
const config = require ('./config')
const env = require ('./env')

const interval = 5000
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

        let result = bitfler.privateGetGetchildorders();

        console.log(result)
        await sleep(interval)
    }
}) ();
