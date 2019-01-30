"use strict";
const ccxt = require("ccxt");
const env = require("./env");
const request = require("request-promise");

const interval = 60000;
const orderSize = 0.01;
const middleTerm = 21
const shortTerm = 5
const MACDTerm = 16

const signals = [];


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

function sum (arr) {
    return arr.reduce(function(prev, current, i, arr) {
        return prev+current;
    });
};

async function buy(status, bitflyer, ticker, message) {
	status.postion = 'buy'
	if (env.production) {
		status.order = await bitflyer.createMarketBuyOrder("FX_BTC_JPY",　orderSize);
	} else {
		status.order = "hoge";
	}
	status.price = ticker.ask
	console.log(message + ' : ' + status)

	return status
}

async function sell(status, bitflyer, ticker, message) {
	status.postion = 'sell'
	if (env.production) {
		status.order = await bitflyer.createMarketSellOrder("FX_BTC_JPY", orderSize);
	} else {
		status.order = "hoge";
	}
	status.price = ticker.ask
	console.log(message + ' : ' + status)

	return status
}

(async function() {
	let status = {
		postion: null,
		order: null,
		price: 0
	}
	let firstTermFlg = true;
	let yesterdayAverageMiddle = 0	
	let yesterdayAverageShort = 0
	let signal = null

  while (true) {
		//現在の値
		let date = new Date();
		console.log("\n" + "time: " + date)

		const config = require("./config")
		const bitflyer = new ccxt.bitflyer(config)
		const ticker = await bitflyer.fetchTicker("FX_BTC_JPY")
		console.log("ask : " + ticker.ask)
		
		if (firstTermFlg) {
			yesterdayAverageMiddle = await CulcFirstDay(middleTerm)
			yesterdayAverageShort  = await CulcFirstDay(shortTerm)
			console.log('yesterdayAverageMiddle : ' + yesterdayAverageMiddle)
			console.log('yesterdayAverageShort  : ' + yesterdayAverageShort )
			firstTermFlg = false
		}


		const todayAverageMiddle = yesterdayAverageMiddle + (2 / (middleTerm + 1)) * (ticker.ask - yesterdayAverageMiddle)
		console.log('todayAverageMiddle : ' + todayAverageMiddle)
		yesterdayAverageMiddle = todayAverageMiddle

		const todayAverageShort = yesterdayAverageShort + (2 / (shortTerm + 1)) * (ticker.ask - yesterdayAverageShort)
		console.log('todayAverageShort : ' + todayAverageShort)
		yesterdayAverageShort = todayAverageShort

		const MACD =  todayAverageShort - todayAverageMiddle

		signals.push(MACD)
		if(signals.length > MACDTerm){
			signals.shift();
			signal = sum(signals) / MACDTerm
		}
		else {
			signal = sum(signals) / signals.length
		}
		console.log('MACD :' + MACD)
		console.log('signal : ' + signal)



		if(status.postion == null && signal != null) {
			//最初のポジショニング
			if(signal < MACD) {
				status.postion = 'buy'
				if (env.production) {
					status.order = await bitflyer.createMarketBuyOrder("FX_BTC_JPY", orderSize);
				} else {
					status.order = "hoge";
				}
				status.price = ticker.ask
				console.log('初回ポジション : ', status)
			}
			else {
				status.postion = 'sell'
				if (env.production) {
					status.order = await bitflyer.createMarketSellOrder("FX_BTC_JPY", orderSize);
				} else {
					status.order = "hoge";
				}
				status.price = ticker.ask
				console.log('初回ポジション : ', status)			}
		}
		else if (status.postion != null && signal != null){
			if(signal < MACD) {
				if(status.postion == 'sell') {
					if(status.price) {
						console.log('評価額 : ', status.price - ticker.ask)
					}
					console.log('ゴールデンクロス！')
					//ポジション解消分
					status.postion = 'buy'
					if (env.production) {
						status.order = await bitflyer.createMarketBuyOrder("FX_BTC_JPY", orderSize);
					} else {
						status.order = "hoge";
					}
					status.price = ticker.ask
					console.log('ポジション解消分 : ', status)
	

					//新規ポジション分
					if (env.production) {
						status.order = await bitflyer.createMarketBuyOrder("FX_BTC_JPY", orderSize);
					} else {
						status.order = "hoge";
					}
					status.price = ticker.ask
					console.log('新規ポジション分 : ', status)
				}
			}
			else if(signal > MACD) {
				if(status.postion == 'buy') {
					if(status.price) {
						console.log('評価額 : ', ticker.ask - status.price )
					}
					console.log('デッドクロス！')
					status.postion = 'sell'
					if (env.production) {
						status.order = await bitflyer.createMarketSellOrder("FX_BTC_JPY", orderSize);
					} else {
						status.order = "hoge";
					}
					status.price = ticker.ask
					console.log('ポジション解消分 : ', status)
	

					//新規ポジション分
					if (env.production) {
						status.order = await bitflyer.createMarketSellOrder("FX_BTC_JPY", orderSize);
					} else {
						status.order = "hoge";
					}
					status.price = ticker.ask
					console.log('新規ポジション分 : ', status)
				}
			}	
		}

		await sleep(interval)
  }
})();