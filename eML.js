'use strict'
const ccxt = require ('ccxt')
const request = require("request-promise")
const config = require ('./config')
const env = require ('./env')


const interval = 10000
const orderSize = 0.03
const middleTerm = 10
const shortTerm = 5

const Cancellation = -10
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
	let times = 0
	let resultPositions = 0
	let resultOrders = 0
	let ticker = null
	let pnl = null

    while (true) {
		//現在時刻
		let date = new Date()
		console.log("\n" + "time: " + date)


        /* 初回起動時のみ前日の指数平滑移動平均を求める */
		if (firstTermFlg) {
			beforeAverageMiddle = await CulcFirstDay(middleTerm*2)
			beforeAverageShort  = await CulcFirstDay(shortTerm*2)
			firstTermFlg = false
		}

		/* 現時点の指数平滑移動平均を求める */
		try {
			ticker = await bitflyer.fetchTicker("FX_BTC_JPY")
			console.log("last : " + ticker.last)
		}
		catch(error) {
			console.log('FetchTicker Error : ', error)
		}

		console.log('beforeAverageMiddle : ' + beforeAverageMiddle)
		console.log('beforeAverageShort  : ' + beforeAverageShort )

		//中期指数平滑移動平均
		const nowAverageMiddle = beforeAverageMiddle + (2 / (middleTerm + 1)) * (ticker.last - beforeAverageMiddle)
		console.log('nowAverageMiddle : ' + nowAverageMiddle)

		//短期指数平滑移動平均
		const nowAverageShort = beforeAverageShort + (2 / (shortTerm + 1)) * (ticker.last - beforeAverageShort)
		console.log('nowAverageShort  : ' + nowAverageShort)



		/* 現在のポジション一覧を取得 */
		try {
			resultPositions = await bitflyer.privateGetGetpositions({'product_code':'FX_BTC_JPY'})
			console.log('Position list : ', resultPositions)
		}
		catch(error) {
			console.log('GetPositions Error : ', error)
		}

		//ポジションがあったらステータスを変更
		if(resultPositions.length != 0) {
			position = resultPositions[0]['side']

			let size = 0
			for(let i = 0; i < resultPositions.length; i++) {
				size += resultPositions[i]['size']
			}
			
			console.log('Position size : ', size)

			//所持Bitcoin数が半端になっていた場合は補正する
			if(size != orderSize && position == 'BUY') {
				if (env.production) {
					try {
						order = await bitflyer.createLimitSellOrder("FX_BTC_JPY", orderSize + size, ticker.last);
					}
					catch(error) {
						console.log('CreateLimitSellOrder Error : ', error)
					}
				}
				else {
					order = 'hoge sell order for recovery : ' +  (orderSize + size);
				}
				console.log('Recovering order : ', order)
			}
			else if (size != orderSize && position == 'SELL') {
				if (env.production) {
					try {
						order = await bitflyer.createLimitBuyOrder("FX_BTC_JPY", orderSize + size, ticker.last);
					}
					catch(error) {
						console.log('CreateLimitBuyOrder Error : ', error)
					}
				}
				else {
					order = 'hoge buy order for recovery :' +  (orderSize + size)
				}
				console.log('Recovering order : ', order)
			}
		}
		else {
			position = 'SQUARE'
		}
		console.log('Now Position : ', position)

		/* 現在の注文状況を取得 */
		try {
			resultOrders = await bitflyer.privateGetGetchildorders({'product_code':'FX_BTC_JPY', 'child_order_state':'ACTIVE'})
			console.log('Order list : ', resultOrders)
		}
		catch(error) {
			console.log('GetChildOrders Error : ', error)
		}
        
		//必要であればキャンセル
		if(resultOrders.length != 0) {
			try{
				let result = await bitflyer.privatePostCancelallchildorders ({"product_code": "FX_BTC_JPY"})
				console.log('Canncell Order : ', result)
			}
			catch(error) {
				console.log('CanclelChildOrders Error : ', error)
			}
		}


        /* ポジションの評価損益を取得 */
		try {
			pnl = await bitflyer.privateGetGetcollateral()
			console.log(pnl)
		}
		catch(error) {
			console.log('GetCollateral Error : ', error)
		}



		/* 注文実施 */
		if(position == 'SQUARE') {
		    //ニュートラルの場合
			if(nowAverageMiddle < nowAverageShort) {
				if (env.production) {
					try {
						order = await bitflyer.createLimitBuyOrder("FX_BTC_JPY",　orderSize, ticker.last);
					}
					catch(error) {
						console.log('CreateLimitBuyOrder Error : ', error)
					}
				} else {
					order = "hoge";
				}
			}
			else if(nowAverageShort < nowAverageMiddle){
				if (env.production) {
				try{
						order = await bitflyer.createLimitSellOrder("FX_BTC_JPY", orderSize, ticker.last);
					}
					catch(error) {
						console.log('CreateLimitBuyOrder Error : ', error)
					}
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
						try {
							order = await bitflyer.createLimitBuyOrder("FX_BTC_JPY",　orderSize*2, ticker.last);
						}
						catch(error) {
							console.log('CreateLimitBuyOrder Error : ', error)
						}
					} else {
						order = "hoge";
					}
					console.log('Cancellation & Long positioning order : ', order)
				}
			}
			else if(pnl.open_position_pnl < Cancellation){
				if (env.production) {
					//ポジション解消
					try {
						order = await bitflyer.createLimitBuyOrder("FX_BTC_JPY",　orderSize, ticker.last);
					}
					catch(error) {
						console.log('CreateLimitBuyOrder Error : ', error)
					}
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
						try{
							order = await bitflyer.createLimitSellOrder("FX_BTC_JPY", orderSize*2, ticker.last);
						}
						catch(error) {
							console.log('CreateLimitBuyOrder Error : ', error)
						}
					} else {
						order = "hoge";
					}
					console.log('Cancellation & Short positioning order : ', order)
				}
			}
			else if(pnl.open_position_pnl < Cancellation){
				if (env.production) {
					//ポジション解消
					try {
						order = await bitflyer.createLimitSellOrder("FX_BTC_JPY",　orderSize, ticker.last);
					}
					catch(error) {
						console.log('CreateLimitBuyOrder Error : ', error)
					}
				} else {
					order = "hoge";
				}
				console.log('Loss cut order : ', order)
			}
		}

		times++

		//今回のデータを前回分として保存
		if(times % 6 == 0) {
			beforeAverageMiddle = nowAverageMiddle
			beforeAverageShort = nowAverageShort
			console.log('six times')
		}

        await sleep(interval)
    }
}) ()
