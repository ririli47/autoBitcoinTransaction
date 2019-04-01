'use strict'
const ccxt = require ('ccxt')
const request = require("request-promise")
const config = require ('./config')
const env = require ('./env')

const interval = 10000

let sma = 0
let SD = 0
let period = 20

const sleep = (timer) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, timer)
    })
}


function CulcSMA(term) {
	return new Promise((resolve, reject) => {

	//Dateオブジェクト生成
	let date = new Date()
	date.setMinutes(date.getMinutes() - term*2)
	let after = Math.floor(date.getTime() / 1000)

	// APIアクセス afterから60秒ごとのデータを取得
	const options = {
		url: "https://api.cryptowat.ch/markets/bitflyer/btcfxjpy/ohlc",
		method: "GET",
		qs: {
            periods: 60,
    		after: after
		}
	}

	request(options)
		.then(function(body) {
			let result = JSON.parse(body)
			//単純平均を計算
			let average = 0
			// console.log(term)
			for (let i = result.result["60"].length - 1; i >= result.result["60"].length - term; i-- ) {
				average += result.result["60"][i][4]
				// console.log(
				// 	i + " : " + result.result["60"][i][0] + " : " + result.result["60"][i][4]
				// )
			}
			average = average / term
			resolve(average)
		})
		.catch(function(err) {
			console.log(err)
			reject(err)
		})
	})
}


function culcStandardDeviation(term) {
	return new Promise((resolve, reject) => {

	//Dateオブジェクト生成
	let date = new Date()
	date.setMinutes(date.getMinutes() - term*2)
	let after = Math.floor(date.getTime() / 1000)

	// APIアクセス afterから60秒ごとのデータを取得
	const options = {
		url: "https://api.cryptowat.ch/markets/bitflyer/btcfxjpy/ohlc",
		method: "GET",
		qs: {
    		periods: 60,
	    	after: after
		}
	}

	request(options)
		.then(function(body) {
            let results = JSON.parse(body)
            // const under = (term * (term - 1))
            const under = term

            //記述量削減のため
            let result = results.result["60"]

            let sum2Power = 0
            let simpleSum = 0
            let simpleSum2Power = 0
            for(let i = result.length - 1; i >= result.length - term; i-- ) {
                //2乗の合計
                sum2Power += (result[i][4]*result[i][4])

                //合計
                simpleSum += result[i][4]
                console.log(sum2Power + ' : ' + simpleSum)
            }

            //合計の2乗
            simpleSum2Power = simpleSum * simpleSum
            console.log(simpleSum2Power)

            //標準偏差を計算
            let beforeRoot = (((term * sum2Power) - simpleSum2Power) / (under))
            console.log(beforeRoot)
            let afterRoot = Math.sqrt(beforeRoot)

            resolve(afterRoot)
		})
		.catch(function(err) {
			console.log(err)
			reject(err)
		})
	})
}


(async function () {
    const bitflyer = new ccxt.bitflyer (config)
    let upper1 = 0
    let upper2 = 0
    let lower1 = 0
    let lower2 = 0

    while (true) {
		//現在時刻
		let date = new Date()
		console.log("\n" + "time: " + date + '---------------------------------------')

        //単純移動平均線を計算
        sma = await CulcSMA(period)

        //標準偏差を計算
        SD = await culcStandardDeviation(period)

        //上部バンド+1
        upper1 = sma + SD

        //上部バンド+2
        upper2 = sma + SD*2

        //下部バンド
        lower1 = sma - SD

        //下部バンド
        lower2 = sma - SD*2

        console.log('sma    : ', sma)
        console.log('SD     : ', SD)
        console.log('upper1 : ', upper1)
        console.log('upper2 : ', upper2)
        console.log('lower1 : ', lower1)
        console.log('lower2 : ', lower2)

        await sleep(interval)
    }
}) ()
