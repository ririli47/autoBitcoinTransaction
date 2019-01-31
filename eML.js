'use strict';
const ccxt = require ('ccxt')
const config = require ('./config')
const env = require ('./env')

const interval = 5000
const orderSize = 0.01;
const middleTerm = 10
const shortTerm = 5


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


(async function () {
    const bitflyer = new ccxt.bitflyer (config)

    while (true) {
		//現在時刻
		let date = new Date();
		console.log("\n" + "time: " + date)

        //現在のポジション一覧を取得

        //現在の注文状況を取得

        //初回起動時のみ前日の指数平滑移動平均を求める

        //現時点の指数平滑移動平均を求める

        //ニュートラルの場合

        //売りポジションの場合

        //買いポジションの場合




        const ticker = await bitflyer.fetchTicker("FX_BTC_JPY")
		console.log("ask : " + ticker.ask)

		// let result = await bitflyer.privateGetGetchildorders({'product_code':'FX_BTC_JPY', 'child_order_state':'ACTIVE'});
		let result = await bitflyer.privateGetGetpositions({'product_code':'FX_BTC_JPY'});


        console.log(result)
        await sleep(interval)
    }
}) ();
