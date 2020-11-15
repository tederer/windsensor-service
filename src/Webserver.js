/* global windsensor, process */
require('./logging/LoggingSystem.js');
require('./database/InMemoryDatabase.js');
require('./Windsensor.js');
require('./Version.js');

var LOGGER = windsensor.logging.LoggingSystem.createLogger('Webserver');

var configuredlogLevel		= process.env.LOG_LEVEL;
var sensorId				= process.env.SENSOR_ID;
var sensorDirection			= process.env.SENSOR_DIRECTION;
var sensorDirectionAsNumber	= Number.parseFloat(sensorDirection);

var logLevel = windsensor.logging.Level.INFO;
if (configuredlogLevel !== undefined && windsensor.logging.Level[configuredlogLevel] !== undefined) {
    logLevel = windsensor.logging.Level[configuredlogLevel];
}
windsensor.logging.LoggingSystem.setMinLogLevel(logLevel);
LOGGER.logInfo('log level = ' + logLevel.description);

var info = {
    version:    windsensor.getVersion(),
    start:      (new Date()).toISOString()
};

if (typeof info.version === 'string') {
    LOGGER.logInfo('version = ' + info.version);
} else {
    LOGGER.logError('failed to evaluate version: ' + info.version.message);
}

var assertValidSensorId = function assertValidSensorId() {
    if (sensorId === undefined) {
        LOGGER.logError('No sensor ID configured! Please provide it via the environment variable called SENSOR_ID.');
        process.exit(1);
    }
    if (sensorId.match(/^[1-9][0-9]{4}$/) === null) {
        LOGGER.logError('Wrong format of sensor ID "' + sensorId + '". Expected format = [1-9][0-9]{5}');
        process.exit(1);
    }
};

var assertValidSensorDirection = function assertValidSensorDirection() {
    if (sensorDirection === undefined) {
        sensorDirectionAsNumber = 0;
    } else {
        if (Number.isNaN(sensorDirectionAsNumber) || sensorDirectionAsNumber < 0 || sensorDirectionAsNumber >= 360) {
            LOGGER.logError('sensorDirectionAsNumber = ' + sensorDirectionAsNumber);
            LOGGER.logError('The sensor direction "' + sensorDirection + '" is invalid. Allowed values = {direction | 0 <= direction < 360}');
            process.exit(1);		
        }
    }
};

var extractSensorId = function extractSensorId(requestPath) {
    var sensorId;
    if (requestPath !== undefined) {
        sensorId = requestPath.replace(/.*\//, '');
    }
    return sensorId;
};

var sensorIdInRequestPathIsCorrect = function sensorIdInRequestPathIsCorrect(path) {
    var sensorIdInRequest = extractSensorId(path);
    return (sensorIdInRequest !== undefined && sensorIdInRequest === sensorId);
};

assertValidSensorId();
assertValidSensorDirection();

var express 	= require('express');
var bodyParser = require('body-parser');
var app 			= express();
var port			= 80;
var database 	= new windsensor.database.InMemoryDatabase();
var sensor		= new windsensor.Windsensor(sensorId, sensorDirectionAsNumber, database);

app.use(bodyParser.json({ type: 'application/json' }));

app.post(/\/windsensor\/\d+/, (request, response) => {
    var path = request.path;
    var message = request.body;
    LOGGER.logDebug('POST request [path: ' + path + 'body: ' + JSON.stringify(message) + ']');

    if (sensorIdInRequestPathIsCorrect(path)) {
        response.status(200).send('accepted');
        sensor.processMessage(message);
    } else {
        response.status(400).send('invalid request');
    }
});

app.get(/\/windsensor\/\d+/, (request, response) => {
    var path = request.path;
    LOGGER.logDebug('GET request [path: ' + path + ']');

    if (sensorIdInRequestPathIsCorrect(path)) {
        response.status(200).json({averages: sensor.getAverages()});
    } else {
        response.status(400).send('invalid request');
    }
});

app.get(/\/info/, (request, response) => {
    var path = request.path;
    LOGGER.logDebug('GET request [path: ' + path + ']');
    response.status(200).json(info);
});

app.listen(port, () => {
    LOGGER.logInfo('server listening on port ' + port);
});
