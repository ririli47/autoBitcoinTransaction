"use strict";
const ccxt = require("ccxt");
const env = require("./env");
const request = require("request-promise");

const interval = 60000;
const orderSize = 0.01;
const middleTerm = 10
const shortTerm = 5

const sleep = timer => {
  return new Promise((resolve, reject) => {
	setTimeout(() => {
	  resolve();
	}, timer);
  });
};

function CulcFirstDay(term) {
	return new Promise((resolve, reject) => {

	/* 1分目の平均値を計算 */
	//Dateオブジェクト生成
	let date = new Date();
	//   console.log(Math.floor(date.getTime() / 1000));
	//仮に30分前にセット
	date.setMinutes(date.getMinutes() - 30);
	let after = Math.floor(date.getTime() / 1000);
	//   console.log(after);

	// APIアクセス afterから60秒ごとのデータを取得
	const options = {
		url: "https://api.cryptowat.ch/markets/bitflyer/btcfxjpy/ohlc",
		method: "GET",
		qs: {
		periods: 60,
		after: after
		}
	};

	request(options)
		.then(function(body) {
			let result = JSON.parse(body);
			//単純平均を計算
			let average = 0
			console.log(term)
			for (let i = result.result["60"].length - 1; i >= result.result["60"].length - term; i-- ) {
				average += result.result["60"][i][4];
				console.log(
					i + " : " + result.result["60"][i][0] + " : " + result.result["60"][i][4]
				);
			}
			average = average / term
			resolve(average);
		})
		.catch(function(err) {
			console.log(err)
			reject(err)
		});
	})
}

(async function() {
  let status = {
		postion: null,
		order: null,
		price: 0,
		neutral = null
	}
  let firstTermFlg = true;
  let yesterdayAverageMiddle = 0
	let yesterdayAverageShort = 0
  while (true) {
		//現在の値
		let date = new Date();
		console.log("\n" + "time: " + date)

		const config = require("./config")
		const bitflyer = new ccxt.bitflyer(config)
		const ticker = await bitflyer.fetchTicker("FX_BTC_JPY")
		console.log("ask : " + ticker.ask)


		status.neutral = false

		let orders = await bitflyer.privateGetGetchildorders({'product_code':'FX_BTC_JPY', 'child_order_state':'ACTIVE'});
		
		if(orders.length != 0) {
			console.log(result)
			let result = await bitflyer.privatePostCancelallchildorders ({"product_code": "FX_BTC_JPY"});
			console.log(result)

			status.neutral = true
		}

		if (firstTermFlg) {
			yesterdayAverageMiddle = await CulcFirstDay(middleTerm)
			yesterdayAverageShort  = await CulcFirstDay(shortTerm)
			console.log('yesterdayAverageMiddle : ' + yesterdayAverageMiddle)
			console.log('yesterdayAverageShort  : ' + yesterdayAverageShort )
			firstTermFlg = false

			if(yesterdayAverageMiddle < yesterdayAverageShort) {
				status.postion = 'buy'
				if (env.production) {
					status.order = await bitflyer.createLimitBuyOrder("FX_BTC_JPY",　orderSize, ticker.ask - 100);
				} else {
					status.order = "hoge";
				}
				status.price = ticker.ask
			}
			else {
				status.postion = 'sell'
				if (env.production) {
					status.order = await bitflyer.createLimitSellOrder("FX_BTC_JPY", orderSize, ticker.ask + 100);
				} else {
					status.order = "hoge";
				}
				status.price = ticker.ask
			}
			console.log(status)
		}


		const todayAverageMiddle = yesterdayAverageMiddle + (2 / (middleTerm + 1)) * (ticker.ask - yesterdayAverageMiddle)
		console.log('todayAverageMiddle : ' + todayAverageMiddle)
		yesterdayAverageMiddle = todayAverageMiddle

		const todayAverageShort = yesterdayAverageShort + (2 / (shortTerm + 1)) * (ticker.ask - yesterdayAverageShort)
		console.log('todayAverageShort : ' + todayAverageShort)
		yesterdayAverageShort = todayAverageShort


		if(todayAverageMiddle < todayAverageShort) {
			if(status.postion == 'sell') {
				if(status.price) {
					console.log('評価額 : ', status.price - ticker.ask)
				}
				console.log('ゴールデンクロス！')
				//ポジション解消分
				if(status.neutral) {
					if (env.production) {
						status.order = await bitflyer.createLimitBuyOrder("FX_BTC_JPY",　orderSize, ticker.ask - 100);
					} else {
						status.order = "hoge";
					}	
				}
				status.postion = 'buy'
				status.price = ticker.ask
				console.log(status)
				//新規ポジション分
				if (env.production) {
					status.order = await bitflyer.createLimitBuyOrder("FX_BTC_JPY",　orderSize, ticker.ask - 100);
				} else {
					status.order = "hoge";
				}
			}
		}
		else if(todayAverageMiddle > todayAverageShort) {
			if(status.postion == 'buy') {
				if(status.price) {
					console.log('評価額 : ', ticker.ask - status.price )
				}
				console.log('デッドクロス！')
				//ポジション解消分
				if(status.neutral) {
					if (env.production) {
						status.order = await bitflyer.createLimitSellOrder("FX_BTC_JPY", orderSize, ticker.ask + 100);
					} else {
						status.order = "hoge";
					}
				}
				status.postion = 'sell'
				status.price = ticker.ask
				console.log(status)
				//新規ポジション分
				if (env.production) {
					status.order = await bitflyer.createLimitSellOrder("FX_BTC_JPY", orderSize, ticker.ask + 100);
				} else {
					status.order = "hoge";
				}
			}
		}
		await sleep(interval)
  }
})();