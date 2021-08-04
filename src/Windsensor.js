/* global assertNamespace, windsensor */

require('./NamespaceUtils.js');
require('./logging/LoggingSystem.js');
require('./averaging/Factory.js');

assertNamespace('windsensor');

/**
 * id                         String                           ID of the windsensor (format = [1-9][0-9]{5})
 * direction                  Number                           the direction (in degrees) of the sensor that should be used when the sensor reports 0°.
 * database                   windsensor.database.Database     the database that should get used to store the data
 * optionalAveragerFactory    windsensor.averaging.Factory     a factory supplying Averagers - required for testing   
 */
windsensor.Windsensor = function Windsensor(id, direction, database, optionalAveragerFactory, optionalTimestampFactory) {
   
   var LOGGER          = windsensor.logging.LoggingSystem.createLogger('Windsensor[' + id + ']');
   var MESSAGE_VERSION = '1.0.0';
   var TEN_MINUTES     = 10 * 60 * 1000;
   
   var messagesContainingOutliers            = [];
   var capturedSensorErrors                  = [];
   var messagesContainingPulsesGreaterThan30 = [];

   LOGGER.logInfo('creating windsensor [id = ' + id + ', direction = ' + direction + '°] ...');

   var defaultTimestampFactory = function defaultTimestampFactory() {
      return (new Date()).toISOString();
   };

   var averagerFactory = (optionalAveragerFactory === undefined) ? windsensor.averaging.Factory : optionalAveragerFactory;
   var timestampFactory = (optionalTimestampFactory === undefined) ? defaultTimestampFactory : optionalTimestampFactory;

   var TwoHourHistory = function TwoHourHistory() {
      var dataOfLast2Hours = [];

      var createDataForHistory = function createDataForHistory(timestamp, oneMinAverage) {
         var data = {timestamp: timestamp};
   
         if (oneMinAverage.direction !== undefined) {
            data.averageDirection = oneMinAverage.direction.average;
         }
            
         if (oneMinAverage.speed !== undefined) {
            data.averageSpeed = oneMinAverage.speed.average;
            data.minimumSpeed = oneMinAverage.speed.minimum;
            data.maximumSpeed = oneMinAverage.speed.maximum;
         }
   
         return data;      
      };
   
      var removeDataOlderThan2Hours = function removeDataOlderThan2Hours(nowAsIsoString) {
         var twoHoursInMillis = 2 * 60 * 60 * 1000;
         var nowInMillis = Date.parse(nowAsIsoString);
         if (!isNaN(nowInMillis)) {
            dataOfLast2Hours = dataOfLast2Hours.filter(data => {
               var ageInMillis = nowInMillis - Date.parse(data.timestamp);
               return ageInMillis <= twoHoursInMillis;
            });
         }
      };
      
      this.add = function add(nowAsIsoString, oneMinAverage) {
         dataOfLast2Hours.push(createDataForHistory(nowAsIsoString, oneMinAverage));
         removeDataOlderThan2Hours(nowAsIsoString);
      };

      this.get = function get() {
         var nowAsIsoString = timestampFactory();
         removeDataOlderThan2Hours(nowAsIsoString);
         return dataOfLast2Hours;
      };
   };

   var historyOf2Hours = new TwoHourHistory();

   var lastSequenceId;
   
   var oneMinAverager = averagerFactory.create1minAverager(database);
   var tenMinAverager = averagerFactory.create10minAverager(database);
   
   var averages = { version: MESSAGE_VERSION };
   
   var isNewSequenceId = function isNewSequenceId(id) {
      return lastSequenceId === undefined || lastSequenceId !== id;
   };
   
   var calculateAverage = function calculateAverage(averager) {
      var average = averager.calculateAverage();
      LOGGER.logDebug(() => 'calculateAverage (before): ' + JSON.stringify(average));
      if (average.direction.average !== undefined) {
         var sum = average.direction.average + direction;
         var correctedDirection = sum % 360;
         LOGGER.logDebug(() => 'input = ' + average.direction.average + ', offset = ' + direction + ', sum = ' + sum + ', correctedDirection = ' + correctedDirection);
         average.direction.average = correctedDirection;
      }
      LOGGER.logDebug(() => 'calculateAverage (after) : ' + JSON.stringify(average));
      return average;
   };

   var calculateAveragePulsesIgnoringIndex = function calculateAveragePulsesIgnoringIndex(pulses, indexToIgnore) {
      var sum = 0;
      for(var index = 0; index < pulses.length; index++) {
         if (index !== indexToIgnore) {
            sum += pulses[index];
         }
      }
      return sum / (pulses.length - 1);
   };

   var calculateStandardDevationOfPulsesIgnoringIndex = function calculateStandardDevationOfPulsesIgnoringIndex(pulses, pulsesAverage, indexToIgnore) {
      var sum = 0;
      for (var index = 0; index < pulses.length; index++) {
         if (index !== indexToIgnore) {
            sum += Math.pow(pulses[index] - pulsesAverage, 2);
         }
      }
      return Math.pow(sum / (pulses.length - 1), 0.5);
   };

   var removeIndexFromArray = function removeIndexFromArray(data, indexToRemove) {
      var result = [];
      for (var index = 0; index < data.length; index++) {
         if (index !== indexToRemove) {
            result.push(data[index]);
         }
      }
      return result;
   };

   /**
    * This method removes samples whose pulse value is not realistic. This sporadically happens when a lightning hits the ground close to the sensor.
    */
   var removeOutliers = function removeOutliers(message, nowAsIsoString) {
      if (message !== undefined && message.anemometerPulses !== undefined && message.directionVaneValues !== undefined &&
            message.anemometerPulses.length > 0 && message.directionVaneValues.length > 0) {
         var indicesToRemove = [];
         for (var index = 0; index < message.anemometerPulses.length; index++) {
            var pulsesAverage = calculateAveragePulsesIgnoringIndex(message.anemometerPulses, index);
            var standardDeviationOfPulses = calculateStandardDevationOfPulsesIgnoringIndex(message.anemometerPulses, pulsesAverage, index);
            var maxAllowedPulses = pulsesAverage + Math.max(30, 5 * standardDeviationOfPulses);
            if (message.anemometerPulses[index] >= maxAllowedPulses) {
               indicesToRemove.push(index);
            }
         }
         
         if (indicesToRemove.length > 0) {
            var originalMessage = JSON.parse(JSON.stringify(message)); // creating a clone of the message
            var pulses          = message.anemometerPulses;
            var directions      = message.directionVaneValues;

            indicesToRemove.forEach(indexToRemove => {
               pulses     = removeIndexFromArray(pulses, indexToRemove);
               directions = removeIndexFromArray(directions, indexToRemove);
            });

            message.anemometerPulses    = pulses;
            message.directionVaneValues = directions;
            
            messagesContainingOutliers.push({timestamp: nowAsIsoString, original: originalMessage, removedIndices: indicesToRemove});
            messagesContainingOutliers = messagesContainingOutliers.slice(-10);
         }
      }
   };

   var captureSensorErrors = function captureSensorErrors(message, nowAsIsoString) {
      if (message !== undefined && message.errors !== undefined && message.errors.length > 0) {
         capturedSensorErrors.push({timestamp: nowAsIsoString, errors: message.errors});
         capturedSensorErrors = capturedSensorErrors.slice(-5);
      }
   };

   var captureMessagesContainingPulsesGreaterThan30 = function captureMessagesContainingPulsesGreaterThan30(message, nowAsIsoString) {
      if (message !== undefined && message.anemometerPulses !== undefined && message.anemometerPulses.length > 0) {
         if (message.anemometerPulses.filter(pulses => pulses > 30).length > 0) {
            messagesContainingPulsesGreaterThan30.push({timestamp: nowAsIsoString, message: message});
            messagesContainingPulsesGreaterThan30 = messagesContainingPulsesGreaterThan30.slice(-10);
         }
      }
   };
   
   /**
    * processMessage gets called to provide new sensor data for processing.
    * 
    *  message    Object   e.g. {version:"1.0.0",sequenceId:5,anemometerPulses:[0,0,0,0,0],directionVaneValues:[32,38,35,38,39]} 
    */
   this.processMessage = function processMessage(message) {
      if (isNewSequenceId(message.sequenceId) ) {
         LOGGER.logInfo(() => 'process message: ' + JSON.stringify(message));
         lastSequenceId = message.sequenceId;
         var nowAsIsoString = timestampFactory();
         
         captureMessagesContainingPulsesGreaterThan30(message, nowAsIsoString);
         removeOutliers(message, nowAsIsoString);
         captureSensorErrors(message, nowAsIsoString);
         
         database.insert(message);
         database.removeAllDocumentsOlderThan(TEN_MINUTES);
         var oneMinAverage = calculateAverage(oneMinAverager);
         var tenMinAverage = calculateAverage(tenMinAverager);
         averages.timestamp = nowAsIsoString;
         averages.oneMinute = oneMinAverage;
         averages.tenMinutes = tenMinAverage;
         historyOf2Hours.add(nowAsIsoString, oneMinAverage);
         LOGGER.logInfo(() => 'current averages (including direction correction): ' + JSON.stringify(averages));
      } else {
         LOGGER.logWarning(() => 'ignoring message because sequence ID is not a new one in the following message: ' + JSON.stringify(message));
      }
   };

   /**
    * getAverages returns the current average values in the following format. 
    * The fields timestamp, oneMinute and tenMinutes will be undefined if no
    * sensor data were processed in the past.
    * 
    *   {
    *       version:   '1.0.0',              
    *       timestamp: '2020-09-21T11:53:40.560Z',    simplified extended ISO format (ISO 8601)
    *       oneMinute: {
    *          direction: {
    *             average: 182.9                      unit: degrees
    *          }, 
    *          speed: {
    *             average: 23.2,                      unit: km/h
    *             minimum: 12.1,                      unit: km/h
    *             maximum: 30.9,                      unit: km/h
    *				   linearTrend:{
    *                gradient: 2.4,		               unit: km/h
    *                offset: 13.2                     unit: km/h
    *             }
    *          }, 
    *       tenMinutes: {
    *          direction: {
    *             average: 150.3                      unit: degrees
    *          }, 
    *          speed: {
    *             average: 25.4,                      unit: km/h
    *             minimum: 11.9,                      unit: km/h
    *             maximum: 35.9,                      unit: km/h
    *				   linearTrend:{
    *                gradient: 0.3,		               unit: km/h per averaging duration
    *                offset: 25.1                     unit: km/h
    *             }
    *          }
    *    }
    *
    * The linear speed trend is the best possible straight line that can be laid through this data. 
    * Such a line is described by two values, the gradient and the vertical offset. Mathematically 
    * speaking it would be "f(t) = offset + t * gradient" - t stands for the time passed since the 
    * first sample in the averaging period was received.
    * 
    * For details please have a look at linear_trend.jpg or https://www.crashkurs-statistik.de/einfache-lineare-regression/.
    * Errors: 'undefined' gets return if the sensorId is not correct.
    */
   this.getAverages = function getAverages() {
      LOGGER.logDebug(() => 'get averages');
      return averages;
   };

   /*
    * getDataOfLast2Hours returns the 10 minute average values of the last 2 hours.
    *
    *   {
    *       version:   '1.0.0',
    *       data: [{timestamp: '2020-09-21T11:53:40.560Z', averageDirection: 127.4, averageSpeed: 14.2, minimumSpeed: 7.9, maximumSpeed: 23.8}, ...]
    *   }          
    */
   this.getDataOfLast2Hours = function getDataOfLast2Hours() {
      return {version: '1.0.0', data: historyOf2Hours.get()};
   };

   // for debugging only
   this.getMessagesContainingOutliers = function getMessagesContainingOutliers() {
      return messagesContainingOutliers;
   };

   // for debugging only
   this.getMessagesContainingPulsesGreaterThan30 = function getMessagesContainingPulsesGreaterThan30() {
      return messagesContainingPulsesGreaterThan30;
   };

   // for debugging only
   this.getSensorErrors = function getSensorErrors() {
      return capturedSensorErrors;
   };
};
