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

/* 1日目の平均値を計算 */
//Dateオブジェクト生成
let date = new Date();
console.log(Math.floor(date.getTime() / 1000));
//42分前にセット
date.setMinutes(date.getMinutes() - 42);
let after = Math.floor(date.getTime() / 1000);
console.log(after);

// APIアクセスafterから60秒ごとのデータを取得
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
  })
  .catch(function(err) {
    console.log(err);
  })(async function() {
  while (true) {
    // console.log(result.result['60'])

    for (let i = result.result["60"].length - 1; i >= 0; i--) {
      console.log(
        i +
          " : " +
          result.result["60"][i][0] +
          " : " +
          result.result["60"][i][4]
      );
    }

    //指数平滑移動平均計算開始
    let exp = Array();
    let exp_1 = 0;

    //1分目は完全に平均
    //0~20までで初日の平均を出す
    for (let i = 0; i < 21; i++) {
      exp_1 += result.result["60"][i][4];
    }
    exp.push(exp_1 / 21);
    console.log("day 1 : " + exp[0]);

    //2分目からは計算
    //21~42で計算する
    for (let i = 21; i < 42; i++) {
      exp[i - 20] =
        exp[i - 21] +
        (2 / (21 + 1)) * (result.result["60"][i][4] - exp[i - 21]);
      console.log("day " + (i - 19) + " : " + exp[i - 20]);
    }

    //現在の値
    (async function() {
      const config = require("./config");
      const bitflyer = new ccxt.bitflyer(config);
      const ticker = await bitflyer.fetchTicker("FX_BTC_JPY");
      console.log("ask : " + ticker.ask);
      exp[21] = exp[20] + (2 / (21 + 1)) * (ticker.ask - exp[20]);
    })();

    await sleep(interval);
  }
})();

// (async function () {
//     const bitflyer = new ccxt.bitflyer (config)

//     while (true) {
//         const ticker = await bitflyer.fetchTicker ('FX_BTC_JPY')
//         records.push(ticker.ask)

//         await sleep(interval)
//     }
// }) ();
