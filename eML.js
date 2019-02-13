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
		console.log("last : " + ticker.last)

		//中期指数平滑移動平均
		const nowAverageMiddle = beforeAverageMiddle + (2 / (middleTerm + 1)) * (ticker.last - beforeAverageMiddle)
		console.log('nowAverageMiddle : ' + nowAverageMiddle)
		beforeAverageMiddle = nowAverageMiddle

		//短期指数平滑移動平均
		const nowAverageShort = beforeAverageShort + (2 / (shortTerm + 1)) * (ticker.last - beforeAverageShort)
		console.log('nowAverageShort  : ' + nowAverageShort)
		beforeAverageShort = nowAverageShort


        /* ポジションの評価損益を取得 */
        let pnl = await bitflyer.privateGetGetcollateral()
        console.log(pnl)


		/* 注文実施 */
		if(position == 'SQUARE') {
		    //ニュートラルの場合
			if(nowAverageMiddle < nowAverageShort) {
				if (env.production) {
					order = await bitflyer.createLimitBuyOrder("FX_BTC_JPY",　orderSize, ticker.last);
				} else {
					order = "hoge";
				}
			}
			else {
				if (env.production) {
					order = await bitflyer.createLimitSellOrder("FX_BTC_JPY", orderSize, ticker.last);
				} else {
					order = "hoge";
				}
			}
			console.log('Square order : ', order)
		}
		else if(position == 'SELL') {
			if(pnl.open_position_pnl > 0) {
				//売りポジションの場合
				if(nowAverageMiddle < nowAverageShort && beforeAverageMiddle > beforeAverageShort) {
					//ゴールデンクロス
					if (env.production) {
						//ポジション解消
						//新規ポジション
						order = await bitflyer.createLimitBuyOrder("FX_BTC_JPY",　orderSize*2, ticker.last);
					} else {
						order = "hoge";
					}
					console.log('Cancellation & Long positioning order : ', order)
				}
			}
			else if(pnl.open_position_pnl < -15){
				if (env.production) {
					//ポジション解消
					//新規ポジション
					order = await bitflyer.createLimitBuyOrder("FX_BTC_JPY",　orderSize*2, ticker.last);
				} else {
					order = "hoge";
				}
				console.log('Loss cut order : ', order)
			}
		}
		else if(position == 'BUY') {
			if(pnl.open_position_pnl > 0) {
				//買いポジションの場合
				if(nowAverageShort < nowAverageMiddle && beforeAverageShort > beforeAverageMiddle) {
					//デッドクロス
					if (env.production) {
						//ポジション解消
						//新規ポジション
						order = await bitflyer.createLimitSellOrder("FX_BTC_JPY",　orderSize*2, ticker.last);
					} else {
						order = "hoge";
					}
					console.log('Cancellation & Short positioning order : ', order)
				}
			}
			else if(pnl.open_position_pnl < -15){
				if (env.production) {
					//ポジション解消
					//新規ポジション
					order = await bitflyer.createLimitSellOrder("FX_BTC_JPY",　orderSize*2, ticker.last);
				} else {
					order = "hoge";
				}
				console.log('Loss cut order : ', order)
			}
		}
        await sleep(interval)
    }
}) ()
