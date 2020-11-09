/* global assertNamespace, windsensor */

require('./Database.js');
require('../NamespaceUtils.js');
require('../logging/LoggingSystem.js');

assertNamespace('windsensor.database');

windsensor.database.InMemoryDatabase = function InMemoryDatabase(optionalTimeSource) {
	
	var LOGGER = windsensor.logging.LoggingSystem.createLogger('InMemoryDatabase');

	var getNowInMillis = optionalTimeSource === undefined ? Date.now : optionalTimeSource;
	var documents = [];
	
	var getIndexOfOldestDocumentNotOlderThan = function getIndexOfOldestDocumentNotOlderThan(maxAgeInMillis) {
		var nowInMillis = getNowInMillis();
		var timestampOfOldestDocument = nowInMillis - maxAgeInMillis;
		return documents.findIndex(d => d.timestamp >= timestampOfOldestDocument);
	};

	this.insert = function insert(document) {
		LOGGER.logDebug(() => 'inserting ' + JSON.stringify(document));
		documents.push({timestamp: getNowInMillis(), document: document});
	};

	this.getAllDocumentsNotOlderThan = function getAllDocumentsNotOlderThan(maxAgeInMillis) {
		LOGGER.logDebug(() => 'getAllDocumentsNotOlderThan ' + maxAgeInMillis + 'ms');
		var index = getIndexOfOldestDocumentNotOlderThan(maxAgeInMillis);
		return (index === -1) ? [] : documents.slice(index, documents.length);
	};

	this.removeAllDocumentsOlderThan = function removeAllDocumentsOlderThan(maxAgeInMillis) {
		LOGGER.logDebug(() => 'removing everything older than ' + maxAgeInMillis + 'ms');
		var index = getIndexOfOldestDocumentNotOlderThan(maxAgeInMillis);
		documents = (index === -1) ? [] : documents.slice(index, documents.length);	
	};
};

windsensor.database.InMemoryDatabase.prototype = new windsensor.database.Database();