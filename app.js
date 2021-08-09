const createError = require('http-errors');
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const helpers = require('./helpers/json_helper')

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors());

const url = "https://api.coingecko.com/api/v3/coins/bitcoin/history"
const priceDB = helpers.readJson('priceList.json');
const priceDB2 = helpers.readJson('priceList3.json');


const fetchPriceApi = (req, res) => {
	let {data} = req.body
	data = JSON.parse(data);
	if(!Array.isArray(data)){
		res.status(400).json({message: "data is not an array"})
	}else{
		const priceDB = helpers.readJson('priceList.json');
		let deposit = 0;
		let credit = 0;
		const duration = [];
		const rates = [];
		const priceArr = [];
		data.forEach(async (item, index) => {
			let dd = typeof item.time === 'number' ? new Date(item.time) : new Date(item.time.toString());
			let date = `${dd.getFullYear()}-${padNum(dd.getMonth() + 1)}-${padNum(dd.getDate())}`
			let amount = 0;

			if(index == 0) duration.push(date);
			if(index == (data.length - 1)) duration.unshift(date);
			
			if(date in priceDB){
				amount = item.amount * priceDB[date]
			}else{
				let price = await getPriceFromGecko(date.split("-").reverse().join("-"));
				amount = item.amount * price;
			}

			if(amount < 0) {
				deposit += Math.abs(amount);
			}else{
				credit += Math.abs(amount);
			}
			rates.push([item.time, priceDB[date]])
			priceArr.push([item.time, Math.abs(amount)])
		})
	
		if(priceArr){
			res.status(200).json({price: priceArr, rates, total: [duration, deposit, credit]});
		}else{
			res.status(400).json({message: "data was not valid. Ensure that the date or time passed is valid"})
		}
	}
}

//get request
const fetchSinglePrice = (req, res) => {
	const {date} = req.query
	const dd = typeof date === 'number' ? new Date(date) : new Date(date.toString());
	const dateFormatted = `${dd.getFullYear()}-${padNum(dd.getMonth() + 1)}-${padNum(dd.getDate())}`
	if(dateFormatted in priceDB){
		res.status(200).json({price: priceDB[dateFormatted]})
	}else{
		res.status(404).json({message: "price not found"})
	}
}


const padNum = (num, base = 10, chr = '0') => {
    var  len = (String(base || 10).length - String(num).length)+1;
    return len > 0? new Array(len).join(chr || '0')+num : num;
}

const getPriceFromGecko = async (date) => {
	try{
		const {data} = await axios.get(url, { params: {date, localization: false}})
		if(data.hasOwnProperty("market_data"))
			return data.market_data.current_price.usd
		return null
	}catch(e){
		return null
	}
	
}

const logger = (msg, date) => {
	if(date){
		console.log(msg + ' - ' +date);
	}else{
		console.log(msg);
	}
}

const getDBPrices = async () => {
	let process = true;
	const priceDB = helpers.readJson('priceList3.json')
	const start = '20-03-2014' // dd-mm-yyyy
	const stop = '08-08-2018'; // dd-mm-yyyy
	const dates_data = [];
	let current = start

	logger("starting database seeding... ", current)

	while(process){
		let curr = current.split("-");
		let curr_mod = `${curr[1]}-${curr[0]}-${curr[2]}`
		let today = new Date(curr_mod);
		let nextDay = new Date(today);
		nextDay.setDate(today.getDate() + 1);
		current = `${padNum(nextDay.getDate())}-${padNum(nextDay.getMonth() + 1)}-${nextDay.getFullYear()}`

		logger('fetching new price...', current)

		if(current == stop){
			process = false;
			break;
		}
		let temp_current = current.split("-").reverse().join("-");
		let date_obj = {};
		let d = "";
		if(temp_current in priceDB){
			date_obj[temp_current] = priceDB[temp_current]
			d = `"${temp_current}" : ${priceDB[temp_current]},\n`
			logger('already in db ...', current)
		}else{
			// get from coingecko
			let price = await getPriceFromGecko(current);
			console.log('price is => ', price)
			if (price) {
				date_obj[temp_current] = price
				d = `"${temp_current}" : ${price},\n`
				logger('new price added ...', current)
			}else{
				console.log("couldn't get price for given date")
				helpers.write('failed.txt', current+'\n');
				logger('price not found ...', current)
			}
		}
		
		dates_data.push(date_obj)
		helpers.write('newPriceList.txt', d);
		logger('carrying out next date operation...')

	}
}

app.route('/api/getprice').post(fetchPriceApi);
app.route('/api/getoneprice').get(fetchSinglePrice);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
	res.status(err.status || 500);
	res.json({
		message: err.message,
		error: req.app.get('env') === 'development' ? err : {},
	});
});

module.exports = app;
