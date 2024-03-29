/* global assertNamespace, windsensor, process */

require('./NamespaceUtils.js');
require('./logging/LoggingSystem.js');

assertNamespace('windsensor');

/**
 * A PersistedState uses an Azure Cosmos DB in the background to persist
 * states. 
 */
windsensor.PersistedState = function PersistedState() {
    
    var connectionString   = process.env.AZURE_COSMOS_DB_CONNECTION_STRING;
    var useDatabase        = (connectionString ?? '').length > 0;

    const { CosmosClient } = require('@azure/cosmos');
    const LOGGER           = windsensor.logging.LoggingSystem.createLogger('PersistedState');
    
    var container;
    var writeMutex = {};

    if (useDatabase) {
        LOGGER.logInfo('using Azure Cosmos DB');
        var client   = new CosmosClient(connectionString);
        var database = client.database('windsensor');
        container    = database.container('neusiedl');
    }

    
    var isOk = function isOk(statusCode) {
        return (statusCode >= 200) && (statusCode < 300);
    };

    /**
     * Returns the persisted state for the provided stateId or "undefined" if no state exists.
     */
    this.read = async function read(stateId) {
        return new Promise((resolve, reject) => {
            if (!useDatabase) {
                resolve(undefined);
                return;
            }
            var partitionKey = stateId;
            container.item(stateId, partitionKey).read()
                .then(response => {
                    if (isOk(response.statusCode)) {
                        resolve((response.resource ?? {}).state);
                    } else {
                        resolve(undefined);
                    }
                })
                .catch(reject);
            });
    };
    
    /**
     * Persists the provided state which can get read by using
     * the provided stateId.
     * 
     * Returns a HTTP status code.
     */
    this.write = async function write(stateId, state) { 
        return new Promise((resolve, reject) => {
            if (!useDatabase || (writeMutex[stateId] !== undefined)) {
                resolve(200);
                return;
            }
            
            writeMutex[stateId] = true;

            container.items.upsert({id: stateId, state: state})
                .then(response => {
                    writeMutex[stateId] = undefined;
                    if (isOk(response.statusCode)) {
                        resolve(response.statusCode);
                    } else {
                        reject('failed to write state (id=' + stateId + '): ' + response.statusCode);
                    }
                })
                .catch(error => {
                    writeMutex[stateId] = undefined;
                    reject(error);
                });
            });
    };
};
