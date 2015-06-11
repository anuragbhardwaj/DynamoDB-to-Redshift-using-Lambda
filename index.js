var pjson = require('./package.json');
var region = process.env['AWS_REGION'];

if (!region || region === null || region === "") {
	region = "us-west-2";
	console.log("AWS Lambda Redshift Database Loader using default region " + region);
}

var aws = require('aws-sdk');
aws.config.update({
	region : region
});
var s3 = new aws.S3({
	apiVersion : '2006-03-01',
	region : region
});
var dynamoDB = new aws.DynamoDB({
	apiVersion : '2012-08-10',
	region : region
});
var sns = new aws.SNS({
	apiVersion : '2010-03-31',
	region : region
});
require('./constants');
var kmsCrypto = require('./kmsCrypto');
kmsCrypto.setRegion(region);
var common = require('./common');
var async = require('async');
var uuid = require('node-uuid');
var pg = require('pg');
var upgrade = require('./upgrades');
var conString = "postgresql://abhardwaj:Master12@rs-instance.cysomezynckr.us-west-2.redshift.amazonaws.com:5439/mydb";
var queryTextInsert = 'INSERT INTO sunedison (email,name,kwh_cost) values ($1,$2,$3)';

// main function for AWS Lambda
exports.handler = 
        function(event, context) {
			var tableName = "SunEdison";   
            
            dynamoDB.scan({
                TableName : tableName,
                Limit : 10
            },  function(err, data) {
                    if (err) {
                        context.done('error','reading dynamodb failed: '+ err);
                    }
                    for (var i in data.Items) {
                        i = data.Items[i];
                 	    insertData(i);
                    }
                });

        var insertData = function(i){
        	
        		pg.connect(conString, function(err,client){
        		if(err){
        			return console.log("Connection Error.", err);
                    context.done("Fatal Error");
        		}
        		console.log("Connection Established.");
        		client.query(queryTextInsert, [i.EmailID.S, i.Name.S, i.KWH.N * i.Cost.N], function(err,result){
                	if(err){
                    	return console.log('Error returning query', err);
                	}
                	console.log('Row inserted. Go and check on Redshift: ' + result);
                	return client;
            	});
        	});
        	
        }

		};