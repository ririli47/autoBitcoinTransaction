'use strict'
const ccxt = require ('ccxt')
const request = require("request-promise")
const config = require ('./config')
const env = require ('./env')


const interval = 60000
const orderSize = 0.01
const middleTerm = 10
const shortTerm = 5

const Cancellation = 50
const New = 100

let beforeAverageMiddle = 0
let beforeAverageShort = 0


const sleep = (timer) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, timer)
    })
}


function CulcFirstDay(term) {
	return new Promise((resolve, reject) => {

	/* 1分目の平均値を計算 */
	//Dateオブジェクト生成
	let date = new Date()
	//   console.log(Math.floor(date.getTime() / 1000))
	//仮に30分前にセット
	date.setMinutes(date.getMinutes() - 30)
	let after = Math.floor(date.getTime() / 1000)
	//   console.log(after)

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
			console.log(term)
			for (let i = result.result["60"].length - 1; i >= result.result["60"].length - term; i-- ) {
				average += result.result["60"][i][4]
				console.log(
					i + " : " + result.result["60"][i][0] + " : " + result.result["60"][i][4]
				)
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


(async function () {
    const bitflyer = new ccxt.bitflyer (config)

	let firstTermFlg = true
	let position = 'SQUARE'
	let order = null
	let order1 = null
	let order2 = null

    while (true) {
		//現在時刻
		let date = new Date()
		console.log("\n" + "time: " + date)

        /* 現在のポジション一覧を取得 */
		let resultPositions = await bitflyer.privateGetGetpositions({'product_code':'FX_BTC_JPY'})
		console.log('Position list : ', resultPositions)

		//ポジションがあったらステータスを変更
		if(resultPositions.length != 0) {
			position = resultPositions[0]['side']
		}
		else {
			position = 'SQUARE'
		}
		console.log('Now Position : ', position)

        /* 現在の注文状況を取得 */
		let resultOrders = await bitflyer.privateGetGetchildorders({'product_code':'FX_BTC_JPY', 'child_order_state':'ACTIVE'})
		console.log('Order list : ', resultOrders)

		//必要であればキャンセル
		if(resultOrders.length != 0) {
			let result = await bitflyer.privatePostCancelallchildorders ({"product_code": "FX_BTC_JPY"})
		}

        /* 初回起動時のみ前日の指数平滑移動平均を求める */
		if (firstTermFlg) {
			beforeAverageMiddle = await CulcFirstDay(middleTerm)
			beforeAverageShort  = await CulcFirstDay(shortTerm)
			console.log('beforeAverageMiddle : ' + beforeAverageMiddle)
			console.log('beforeAverageShort  : ' + beforeAverageShort )
			firstTermFlg = false
		}

		/* 現時点の指数平滑移動平均を求める */
        const ticker = await bitflyer.fetchTicker("FX_BTC_JPY")
		console.log("ask : " + ticker.ask)

		//中期指数平滑移動平均
		const nowAverageMiddle = beforeAverageMiddle + (2 / (middleTerm + 1)) * (ticker.ask - beforeAverageMiddle)
		console.log('nowAverageMiddle : ' + nowAverageMiddle)
		beforeAverageMiddle = nowAverageMiddle

		//短期指数平滑移動平均
		const nowAverageShort = beforeAverageShort + (2 / (shortTerm + 1)) * (ticker.ask - beforeAverageShort)
		console.log('nowAverageShort  : ' + nowAverageShort)
		beforeAverageShort = nowAverageShort

		/* 注文実施 */
		if(position == 'SQUARE') {
		    //ニュートラルの場合
			if(nowAverageMiddle < nowAverageShort) {
				if (env.production) {
					order = await bitflyer.createLimitBuyOrder("FX_BTC_JPY",　orderSize, ticker.ask - New);
				} else {
					order = "hoge";
				}
			}
			else {
				if (env.production) {
					order = await bitflyer.createLimitSellOrder("FX_BTC_JPY", orderSize, ticker.ask + New);
				} else {
					order = "hoge";
				}
			}
			console.log('Square order : ', order)
		}
		else if(position == 'SELL') {
			//売りポジションの場合
			if(nowAverageMiddle < nowAverageShort) {
				//ゴールデンクロス
				if (env.production) {
                    //ポジション解消
                    order1 = await bitflyer.createLimitBuyOrder("FX_BTC_JPY",　orderSize, ticker.ask - Cancellation);
                    //新規ポジション
                    order2 = await bitflyer.createLimitBuyOrder("FX_BTC_JPY",　orderSize, ticker.ask - New);
				} else {
					order = "hoge";
                }
                console.log('Cancellation positioning order : ', order1)
				console.log('Long positioning order : ', order2)
			}
		}
		else if(position == 'BUY') {
        	//買いポジションの場合
			if(nowAverageShort < nowAverageMiddle) {
				//ゴールデンクロス
				if (env.production) {
                    //ポジション解消
                    order1 = await bitflyer.createLimitSellOrder("FX_BTC_JPY",　orderSize, ticker.ask - Cancellation);
                    //新規ポジション
					order2 = await bitflyer.createLimitSellOrder("FX_BTC_JPY",　orderSize, ticker.ask + New);
				} else {
					order = "hoge";
				}
                console.log('Cancellation positioning order : ', order1)
				console.log('Short positioning order : ', order2)
			}
		}
        await sleep(interval)
    }
}) ()
