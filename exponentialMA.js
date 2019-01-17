"use strict";
const ccxt = require("ccxt");
const env = require("./env");
const request = require("request-promise");

const interval = 10000;
const profitPrice = 500;
const lossCutPrice = -250;
const orderSize = 0.01;
const records = [];

let orderInfo = null;
let allSales = 0;

const sleep = timer => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, timer);
  });
};

function CulcFirstDay() {
  /* 1分目の平均値を計算 */
  //Dateオブジェクト生成
  let date = new Date();
//   console.log(Math.floor(date.getTime() / 1000));
  //仮に30分前にセット
  date.setMinutes(date.getMinutes() - 30);
//   let after = Math.floor(date.getTime() / 1000);
  console.log(after);

  // APIアクセス afterから60秒ごとのデータを取得
  const options = {
    url: "https://api.cryptowat.ch/markets/bitflyer/btcjpy/ohlc",
    method: "GET",
    qs: {
      periods: 60,
      after: after
    }
  };

  request(options)
    .then(function(body) {
      console.log("-----------------------------------------");
      let result = JSON.parse(body);
    //   console.log(result.result["60"]);
      //21分前から現在までの単純平均を計算
      let average = 0;
      for (
        let i = result.result["60"].length - 1;
        i >= result.result["60"].length - 21;
        i--
      ) {
        average += result.result["60"][i][4];
        console.log(
          i +
            " : " +
            result.result["60"][i][0] +
            " : " +
            result.result["60"][i][4]
        );
      }
      average = average / 21
      return average;
    })
    .catch(function(err) {
      console.log(err)
    });
}

(async function() {
  let firstTermFlg = true;
  let yesterdayAverage = 0
  while (true) {
    if (firstTermFlg) {
            yesterdayAverage =  CulcFirstDay() //requestが非同期で動いてる
            console.log(yesterdayAverage)
            firstTermFlg = false
    }

    //現在の値
    (async function() {
      const config = require("./config")
      const bitflyer = new ccxt.bitflyer(config)
      const ticker = await bitflyer.fetchTicker("FX_BTC_JPY")
      console.log("ask : " + ticker.ask)
      //   exp[21] = exp[20] + (2 / (21 + 1)) * (ticker.ask - exp[20]);
      const todayAverage = yesterdayAverage + (2 / (21 + 1)) * (ticker.ask - yesterdayAverage)
      console.log('todayAverage : ' + todayAverage)
      yesterdayAverage = todayAverage
    })();

    await sleep(interval)
  }
})();