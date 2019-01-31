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

exports.module = this