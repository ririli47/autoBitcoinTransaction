'use strict';
const ccxt = require ('ccxt')
const config = require ('./config')
const env = require ('./env')
const axiosBase = require ('axios')

const interval = 10000
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


const axios = axiosBase.create({
    baseURL: 'https://api.cryptowat.ch/markets/',
    timeout: 30000,
    // headers: ''
})

axios.get('bitflyer/btcjpy/ohlc', {
    params: {
        periods: 3600,
        after: 1483196400
    }
})
.then(response => { 
    console.log(response.data)
    let result = JSON.parse(response.data)
    console.log(result)
})
.catch(error => {
    console.log(error.response)
});





// (async function () {
//     const bitflyer = new ccxt.bitflyer (config)

//     while (true) {
//         const ticker = await bitflyer.fetchTicker ('FX_BTC_JPY')
//         records.push(ticker.ask)

        

//         await sleep(interval)
//     }
// }) ();