var express = require('express');
var app = express();
var mongo = require('mongodb').MongoClient;
var path = require('path');

var port = process.env.PORT || 3000;
var mongoUrl = process.env.MONGOLAB_URI || 'mongodb://localhost:27017/FreeCodeCamp';
var api_key = process.env.API_KEY;
var bingSearch = require('node-bing-api')({ accKey: api_key });

app.set('json spaces', 30);
mongo.connect(mongoUrl, function(err, db) {
	if (err) throw err;
	db.createCollection('searchHistory', {
		capped: true,
		size: 5242880,
		max: 5000
	});
	var searchHistory = db.collection('searchHistory');

	app.get('/', function(req, res) {
		res.sendFile(path.join(__dirname, 'index.html'));
	});

	app.get('/search/:query', function(req, res) {
		var query = req.params.query;
		var size = req.query.offset || 10;
		var history = {
			"term": query,
			"when": new Date().toLocaleString()
		};

		if (query !== 'favicon.ico') {
			save(history, searchHistory);
		}

		bingSearch.images(query, {
			top: size
		}, function(err, response, results) {
			if (err) throw err;
			results = results['value'].map(makeList);
			res.json(results);
		});
	});

	app.get('/lastest', function(req, res) {
		searchHistory.find({}, null, {
			"limit": 10,
			"sort":  {
				"when": -1
			}
		}).toArray(function(err, docs) {
			if (err) throw err;
			res.json(docs.map(function(arg) {
				return {
					term: arg.term,
					when: arg.when
				};
			}));
		});
	});

	app.listen(port, function() {
		console.log('Server is listening on port ' + port);
	});
});

function save(obj, collection) {
	collection.save(obj, function(err, result) {
		if (err) throw err;
		console.log('Saved query');
	});
}

function makeList(img) {
	return {
		"url": img.contentUrl,
		"alt text": img.name,
		"thumbnail": img.thumbnailUrl,
		"page url": img.hostPageUrl
	};
}
