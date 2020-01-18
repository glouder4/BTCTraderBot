const express = require("express"); 
const delay = require('delay');
const  colors  = require ( 'colors' ) ; 
var app = express();

var Pair = "TROYBNB"; var OrderID = 0;
var TimeDelay = 0; var lastClosePrice = 0; var quantity = 180; var PurchasePrice = 0;var SELLlimitPlaced = false; var BUYLimitPlaced = false; var tradeStatus = false;
var SpentAmount = 0; var ReceivedAmount = 0; var SalePrice = 0; var PurchaseCommision = 0; var SaleCommision = 0; var lastkey = 0;
var BoughtPrice = 0;
app.use(express.static(__dirname));
 
app.use('/scripts',  express.static(__dirname+'/js/'));

const binance = require('node-binance-api')().options({
  APIKEY: '***',
  APISECRET: '***',
  useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
  'test':false
});

function getStatus(){
	binance.openOrders(Pair, (error, OpenOrders, symbol) => {
		if(OpenOrders[0]){
			var Order = OpenOrders[0];
			console.log(Order);
			if(Order.status == 'NEW') {
				if(Order.side == 'SELL'){
					SELLLimitPlaced = true;
					BUYLimitPlaced = false;
					tradeStatus = true;
				}	
				else {
					BUYLimitPlaced = true;
					SELLLimitPlaced = false;
					tradeStatus = false;
				}
				OrderID = Order.orderId;
			}
			SpentAmount = Order.price; 
			BoughtPrice = Order.price;
		}
		else{
			binance.balance((error, balances) => {
				var BalanceOfCurrency = eval('balances.'+Pair.split('"')[0].split("BNB")[0]+'.available');
				if ( error ) console.error(error.body);
				if(BalanceOfCurrency >= quantity) tradeStatus = true;
				else tradeStatus = false;
			});
		}
	});
}

function ChangedPrices(){
	console.log('change');
	binance.openOrders(Pair, (error, OpenOrders, symbol) => {
		if(OpenOrders[0]){
			var Order = OpenOrders[0];
			if(Order.status == 'NEW') {
				if(Order.side == 'SELL'){
					binance.depth(Pair, (error, depth, symbol) => {
						if ( error ) console.error(error.body);
						var DepthAsks = depth.asks; var countOfAsks = 0; var MaxValueOfAsk = 0;
						var Turn = [10]; var TurnPrices = [10]; turner = 0; var newLimitPrice =0;
						for(key in DepthAsks){
							Turn[turner] = DepthAsks[key];
							TurnPrices[turner] = key;
							turner++;
							if(DepthAsks[key] > MaxValueOfAsk) MaxValueOfAsk = DepthAsks[key];
							countOfAsks++;
							if(countOfAsks == 10) break;
						}
						turner = 0;
						for(var i =0; i < 10; i++){
							if(Turn[i] == MaxValueOfAsk){ turner = i; break;}
						}
						console.log(TurnPrices[turner] ,' ', BoughtPrice,' %: ',TurnPrices[turner]*100/BoughtPrice);
						if((TurnPrices[turner]*100)/BoughtPrice > 100.3){
							binance.cancel(Pair, OrderID, (error, response, symbol) => {
								if(error) console.error(error.body);
								if(response.status == 'CANCELED'){
									if(turner >= 2) {newLimitPrice = TurnPrices[turner-2];lastkey = turner-2;}
									if(turner == 1) {newLimitPrice = TurnPrices[turner-1];lastkey = turner-1;}
									if(turner == 0) {newLimitPrice = TurnPrices[turner];lastkey = turner;}
									turner = 0;
									if(newLimitPrice != SpentAmount){
										binance.sell(Pair, quantity, newLimitPrice, {type:'LIMIT'}, (error, response) => {
											if ( error ) console.error(error.body);
											OrderID = response.orderId;
											SpentAmount = response.price;
											SELLLimitPlaced = true;
											BUYLimitPlaced = false;
											tradeStatus = true;
											console.log('////////////////////////////////////');
											console.log("newAskOrder id: " + response.orderId);
											console.log("% от цены покупки: " , (SpentAmount*100/BoughtPrice));
											console.log("newAsk Placed On: ", response);
											console.log('////////////////////////////////////');
										});
									}
								}
							});
						}
						
					});
				}	
				else {
					binance.depth(Pair, (error, depth, symbol) => {
						var DepthBids = depth.bids; var countOfBids = 0; var MaxValueOfBid = 0;
						var Turn = [10]; var TurnPrices = [10]; turner = 0; var newLimitPrice =0;
						for(key in DepthBids){
							Turn[turner] = DepthBids[key];
							TurnPrices[turner] = key;
							turner++;
							if(DepthBids[key] > MaxValueOfBid) MaxValueOfBid = DepthBids[key];
							countOfBids++;
							if(countOfBids == 10) break;
						}
						turner = 0;
						for(var i =0; i < 10; i++){
							if(Turn[i] == MaxValueOfBid){ turner = i; break;}
						}
						console.log(TurnPrices[turner] ,' ', SpentAmount,' %: ',TurnPrices[turner]*100/SpentAmount);
						if((TurnPrices[lastkey] != SpentAmount)&&(((TurnPrices[turner]*100)/SpentAmount < 99.8))||((TurnPrices[turner]*100)/SpentAmount > 100.3)){
							binance.cancel(Pair, OrderID, (error, response, symbol) => {
								if(error) console.error('body',error.body);
								if(response.status == 'CANCELED'){
									if(turner >= 2) {newLimitPrice = TurnPrices[turner-2];lastkey = turner-2;}
									if(turner == 1) {newLimitPrice = TurnPrices[turner-1];lastkey = turner-1;}
									if(turner == 0) {newLimitPrice = TurnPrices[turner];lastkey = turner;}
									lastkey = turner;
									turner = 0;
									binance.buy(Pair, quantity, newLimitPrice, {type:'LIMIT'}, (error, response) => {
										if ( error ) console.error(error.body);
										OrderID = response.orderId;
										SpentAmount = response.price;
										BUYLimitPlaced = true;
										SELLLimitPlaced = false;
										tradeStatus = false;
										console.log('////////////////////////////////////');
										console.log("newOrder id: " + response.orderId);
										console.log("newBid Placed On: ", response);
										console.log('////////////////////////////////////');
									});
								}
							});
							
						}
					});
				}
			}
			else{
				setTimeout(getStatus,2000);
				//PARTIALLY_FILLED status of sell's
			}
		}
		else{
			setTimeout(getStatus,2000);
		}
	});
	Init();
}

function PurchaseSide(){
	if(BUYLimitPlaced == false){
		binance.candlesticks(Pair, "1m", (error, ticks, symbol) => {
				for(var i=0; i < ticks.length-1;i++){
					if(parseFloat(ticks[i].toString().split(',')[1]) > parseFloat(ticks[i].toString().split(',')[4])){
						console.log("CandleStick"+i, "open: "+ticks[i].toString().split(',')[1], "close: "+ticks[i].toString().split(',')[4], "result: "+"LOW".bold.red);
						if(i == ticks.length-2) lastClosePrice = parseFloat(ticks[i].toString().split(',')[4]);
					}
					else{ 
						console.log("CandleStick"+i, "open: "+ticks[i].toString().split(',')[1], "close: "+ticks[i].toString().split(',')[4], "result: "+"UP".bold.green);
						TimeDelay = parseFloat(ticks[2].toString().split(',')[6]) - parseFloat(Date.now());
						console.log("leaving in delay on "+TimeDelay/1000+" seconds..zZ");
						break;
					}
				}
			if(TimeDelay > 0) { setTimeout(Init, TimeDelay); TimeDelay = 0;}
			else if(TimeDelay <0){setTimeout(Init, (-1)*TimeDelay); TimeDelay = 0;}
			else{
					let last_tick = ticks[ticks.length - 1];
					let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = last_tick;
					if(open >= close){ 
						var MaxValueOfBid = 0;
						binance.depth(Pair, (error, depth, symbol) => {
							var DepthBids = depth.bids; var countOfBids = 0;
							var Turn = [10]; var TurnPrices = [10]; turner = 0;
							for(key in DepthBids){
								Turn[turner] = DepthBids[key];
								TurnPrices[turner] = key;
								turner++;
								if(DepthBids[key] > MaxValueOfBid) MaxValueOfBid = DepthBids[key];
								countOfBids++;
								if(countOfBids == 10) break;
							}
							turner = 0;
							for(var i =0; i < 10; i++){
								if(Turn[i] == MaxValueOfBid){ turner = i; break;}
							}
							binance.buy(Pair, quantity, TurnPrices[turner], {type:'LIMIT'}, (error, response) => {
								if(error) console.error(error.body);
								BUYLimitPlaced = true;
								OrderID = response.orderId;
								SpentAmount = response.price;
								BoughtPrice = response.price;
								console.log('////////////////////////////////////');
								console.log("Order id: " + response.orderId);
								console.log("Bid Placed On: ", response);
								console.log('////////////////////////////////////');
							});
						});
					}
					else console.log(symbol+" last price: "+close +" (up)".bold.green);
					console.log('___________________________________________________________________');
					Init();
			}
		}, {limit: 3, endTime: Date.now()});
	}
	else{
		ChangedPrices();
	}
}

function SellingSide(){
	binance.bookTickers(Pair,(error, lastprice) => {
		if(error) console.error(error.body);
		if(((SpentAmount*100/BoughtPrice) > 101)&&((((lastprice.bidPrice*100)/BoughtPrice) > 100)&&(((lastprice.bidPrice*100)/BoughtPrice) < 101))){
			console.log("leaving in delay before marketSell");
			setTimeout(function(){
				binance.bookTickers(Pair,(error, lastprice) => {
				if(error) console.error(error.body);
					if(((lastprice.bidPrice*100)/BoughtPrice) < 101){
						binance.cancel(Pair, OrderID, (error, response, symbol) => {
						if(error) console.error(error.body);
						if(response.status == 'CANCELED'){
							console.log('++++++++++++++++++++++++++++++++++++');
							console.log(symbol+" cancel response:", response);
							console.log('+          Trying to MarketSell...       +');
							var flags = {type: 'MARKET', newOrderRespType: 'FULL'};
								binance.marketSell(Pair, quantity, flags, function(error, response) {
									if(error) console.error(error.body);
									SalePrice = response.fills[0].price;
									ReceivedAmount = SalePrice*quantity;
									OrderID = response.orderId;
									tradeStatus = false;
									SELLLimitPlaced = false;
									BUYLimitPlaced = false;
									//console.log("Market Buy response", response);
									console.log("+   order id: " , response.orderId,'   +');
									console.log("+   Price: ",SalePrice,'   +');
									console.log("+   ReceivedAmount: ",ReceivedAmount,'   +');
									console.log('+          the received is completed      +');
									console.log('++++++++++++++++++++++++++++++++++++');
									binance.balance((error, balances) => {
									  if(error) console.error(error.body);
									  console.log("BTC balance: ", balances.BTC.available);
									  console.log("BNB balance: ", balances.BNB.available);
									});
								});
							}
						});
						Init();
					}
					else{
						Init();
					}
				});
			}, 60000);
		}
		else{
			console.log((lastprice.bidPrice*100)/SpentAmount);
			binance.openOrders(Pair, (error, OpenOrders, symbol) => {
				if(OpenOrders[0]){
					ChangedPrices();
				}
				else {
					getStatus();
					if(tradeStatus == true){
						setTimeout(function(){
							binance.depth(Pair, (error, depth, symbol) => {
								var DepthAsks = depth.asks; var countOfAsks = 0; var MaxValueOfAsk = 0;
								var Turn = [10]; var TurnPrices = [10]; turner = 0; var newLimitPrice =0;
								for(key in DepthAsks){
									Turn[turner] = DepthAsks[key];
									TurnPrices[turner] = key;
									turner++;
									if(DepthAsks[key] > MaxValueOfAsk) MaxValueOfAsk = DepthAsks[key];
									countOfAsks++;
									if(countOfAsks == 10) break;
								}
								turner = 0;
								for(var i =0; i < 10; i++){
									if(Turn[i] == MaxValueOfAsk){ turner = i; break;}
								}
								if(TurnPrices[turner] > SpentAmount){
								binance.sell(Pair, quantity, TurnPrices[turner], {type:'LIMIT'}, (error, response) => {
									if(error) console.error(error.body);
									OrderID = response.orderId;
									SpentAmount = response.price;
									console.log('////////////////////////////////////');
									console.log("SellOrder id: " + response.orderId);
									console.log("Sell ask Placed On: ", response);
									console.log('////////////////////////////////////');
								});
								}
							});
						}, 1500);
					}
					Init();
				}
			});
		}
	});
}


function Init(){
	setTimeout(function(){
		if(tradeStatus == false) PurchaseSide();
		else{
			SellingSide();
		}
	}, 4000);
}
getStatus();
Init();
 
app.listen(3000);
 
module.exports.app = app;