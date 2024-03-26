/* global assertNamespace, windsensor */

require('./Database.js');
require('../NamespaceUtils.js');
require('../logging/LoggingSystem.js');

assertNamespace('windsensor.database');

/**
 * This database implementation works in memory and stores a backup in an Azure
 * Cosmos DB to be able to restore the state when the service restarts.
 */
windsensor.database.AzureCosmosDb = function AzureCosmosDb(connectionString) {
    
    const { CosmosClient } = require('@azure/cosmos');

    const ID               = 'sensorDataState';
    const client           = new CosmosClient(connectionString);
    const database         = client.database('windsensor');
    const container        = database.container('neusiedl');

    const LOGGER           = windsensor.logging.LoggingSystem.createLogger('AzureCosmosDb');
    
    var getNowInMillis     = Date.now;
    var documents          = [];
    
    var isOk = function isOk(statusCode) {
        return (statusCode >= 200) && (statusCode < 300);
    };

    var readStateFromCosmosDb = async function readStateFromCosmosDb() {
        return new Promise((resolve, reject) => {
            var partitionKey = ID;
            container.item(ID, partitionKey).read()
                .then(response => {
                    if (isOk(response.statusCode)) {
                        resolve((response.resource ?? {}).state);
                    } else {
                        reject('faied to read: ' + response.statusCode);
                    }
                })
                .catch(reject);
            });
    };
    
    var writeStateToCosmosDb = async function writeStateToCosmosDb() { 
        return new Promise((resolve, reject) => {
            container.items.upsert({id: ID, state: documents})
                .then(response => {
                    if (isOk(response.statusCode)) {
                        resolve(response.statusCode);
                    } else {
                        reject('faied to write: ' + response.statusCode);
                    }
                })
                .catch(reject);
            });
    };
        
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
        writeStateToCosmosDb(documents).catch(LOGGER.logError);
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

    readStateFromCosmosDb()
        .then(state => {
            documents = state ?? [];
            LOGGER.logInfo('successfully restored ' + documents.length + ' state entries');
        })
        .catch(error => LOGGER.logError('failed to read state from Cosmos DB: ' + error));
};

windsensor.database.AzureCosmosDb.prototype = new windsensor.database.Database();