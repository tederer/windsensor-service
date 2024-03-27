/* global assertNamespace, windsensor */

require('./Database.js');
require('../NamespaceUtils.js');
require('../logging/LoggingSystem.js');

assertNamespace('windsensor.database');

windsensor.database.InMemoryDatabase = function InMemoryDatabase(persistedState, optionalTimeSource) {
	
	const LOGGER   = windsensor.logging.LoggingSystem.createLogger('InMemoryDatabase');
	const STATE_ID = 'inMemoryDB';

	var getNowInMillis = optionalTimeSource === undefined ? Date.now : optionalTimeSource;
	var documents = [];
	
	var getIndexOfOldestDocumentNotOlderThan = function getIndexOfOldestDocumentNotOlderThan(maxAgeInMillis) {
		var nowInMillis = getNowInMillis();
		var timestampOfOldestDocument = nowInMillis - maxAgeInMillis;
		return documents.findIndex(d => d.timestamp >= timestampOfOldestDocument);
	};

	this.insert = function insert(document, optionalTimestamp) {
      var optionalTimestampForLogging = (optionalTimestamp === undefined) ? '' : ' at ' + (new Date(optionalTimestamp)).toISOString();
		LOGGER.logDebug(() => 'inserting ' + JSON.stringify(document) + optionalTimestampForLogging);
      var timestamp = (optionalTimestamp === undefined) ? getNowInMillis() : optionalTimestamp;
		documents.push({timestamp: timestamp, document: document});
		persistedState.write(STATE_ID, documents)
			.catch(error => LOGGER.logError('failed to persist state: ' + error));
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

	persistedState.read(STATE_ID)
		.then(state => {
			documents = state ?? [];
			LOGGER.logInfo('restored InMemoryDatabase state containing ' + documents.length + ' entries');
		})
		.catch(error => LOGGER.logError('failed to restore state: ' + error));
};

windsensor.database.InMemoryDatabase.prototype = new windsensor.database.Database();