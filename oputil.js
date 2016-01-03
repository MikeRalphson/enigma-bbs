/* jslint node: true */
'use strict';

//	ENiGMA½
var config	= require('./core/config.js');
var db		= require('./core/database.js');

var _		= require('lodash');
var async	= require('async');

var argv 	= require('minimist')(process.argv.slice(2));

var ExitCodes = {
	SUCCESS		: 0,
	ERROR		: -1,
	BAD_COMMAND	: -2,
	BAD_ARGS	: -3,
}

function printUsage(command) {
	var usage;

	switch(command) {
		case '' :
			usage = 
				'usage: oputil.js [--version] [--help]\n' +
				'                 <command> [<args>]' + 
				'\n' + 
				'global args:\n' +
				'  --config PATH        : specify config path';
			break;

		case 'user' :
			usage = 
				'usage: optutil.js user --user USERNAME <args>\n'	+
				'\n' +
				'valid args:\n'	+
				'  --user USERNAME      : specify username\n' 	+
				'  --password PASS      : reset password to PASS';
			break;
	}

	console.error(usage);
}

function initConfig(cb) {
	var configPath = argv.config ? argv.config : config.getDefaultPath();

	config.init(configPath, cb);
}

function handleUserCommand() {
	if(true === argv.help || !_.isString(argv.user) || 0 === argv.user.length) {
		process.exitCode = ExitCodes.ERROR;
		return printUsage('user');
	}

	if(_.isString(argv.password)) {
		if(0 === argv.password.length) {			
			process.exitCode = ExitCodes.BAD_ARGS;
			return console.error('Invalid password');
		}

		var user;
		async.waterfall(
			[
				function init(callback) {
					initConfig(callback);
				},
				function initDb(callback) {
					db.initializeDatabases(callback);
				},
				function getUser(callback) {					
					user = require('./core/user.js');
					user.getUserIdAndName(argv.user, function userNameAndId(err, username, userId) {
						if(err) {
							process.exitCode = ExitCodes.BAD_ARGS;
							callback(new Error('Failed to retrieve user'));
						} else {
							callback(null, userId);
						}
					});
				},
				function setNewPass(userId, callback) {
					var u = new user.User();
					u.userId = userId;
					u.setNewAuthCredentials(argv.password, function credsSet(err) {
						if(err) {
							process.exitCode = ExitCodes.ERROR;
							callback(new Error('Failed setting password'));
						} else {
							callback(null);
						}
					});
				}
			],
			function complete(err) {
				if(err) {
					console.error(err.message);
				} else {
					console.info('Password set');
				}
			}
		);
	}
}

function main() {

	process.exitCode = ExitCodes.SUCCESS;

	if(0 === argv._.length ||
		'help' === argv._[0])
	{
		printUsage('');
		process.exit(ExitCodes.SUCCESS);
	}

	switch(argv._[0]) {
		case 'user' :
			handleUserCommand();
			break;

		default:
			printUsage('');
			process.exitCode = ExitCodes.BAD_COMMAND;
	}
}

main();