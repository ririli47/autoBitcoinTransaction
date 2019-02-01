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

		// let result = await bitflyer.privateGetGetchildorders({'product_code':'FX_BTC_JPY', 'child_order_state':'ACTIVE'});
		let resultPositions = await bitflyer.privateGetGetpositions({'product_code':'FX_BTC_JPY'});
        console.log('Position list : ', resultPositions)
        // JSON.parse(resultPositions)
        // console.log(JSON.parse(resultPositions))
		console.log('Position list : ', resultPositions[0]['side'])


        await sleep(interval)
    }
}) ();
