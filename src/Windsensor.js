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

   var calculateAverageOf = function calculateAverageOf(pulses) {
      var sum = 0;
      for(var index = 0; index < pulses.length; index++) {
         sum += pulses[index];
      }
      return sum / (pulses.length - 1);
   };

   var calculateStandardDevationOfPulses = function calculateStandardDevationOfPulses(pulses, pulsesAverage) {
      var sum = 0;
      for (var index = 0; index < pulses.length; index++) {
         sum += Math.pow(pulses[index] - pulsesAverage, 2);
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
    * 
    * examples:   {"timestamp":"2021-08-16T20:11:13.046Z","message":{"version":"1.0.0","sequenceId":135,"anemometerPulses":[13,14,12,12,12,11,12,10,10,9,9,11,12,12,12,11,10,14,12,11,10,11,10,10,12,11,12,11,11,13,11,10,12,11,9,8,7,9,9,8,10,11,11,12,12,11,11,10,10,9,38,0,7,16,16,24,20,16,13,10],"directionVaneValues":[2047,2241,2167,2167,1904,2243,2195,2063,2263,2415,2358,2219,2221,2097,2161,2219,2174,2169,2206,2315,2303,2203,2143,2186,2225,2205,2202,2259,2213,2275,2271,2171,2064,2239,2192,2177,2481,2127,2047,2035,2335,2275,2259,2285,2284,2255,2298,2243,2319,2327,2283,2222,2161,2279,2263,2269,2183,2258,2195,2203],"errors":[]}},
	 *             {"timestamp":"2021-08-16T20:14:54.595Z","message":{"version":"1.0.0","sequenceId":138,"anemometerPulses":[9,10,9,9,9,9,8,7,7,7,7,8,10,9,10,10,10,10,11,10,11,10,9,9,8,8,8,8,11,10,10,9,11,11,10,11,10,9,10,10,10,12,10,9,11,12,12,13,11,10,11,11,11,11,12,10,2,2,33,0],"directionVaneValues":[2160,2305,2257,2222,2303,2369,2337,2407,2366,2160,2274,2263,2457,2275,2151,2359,2237,2255,2391,2397,2447,2430,2407,2247,2384,2286,2359,2271,2368,2181,2461,2431,2471,2447,2461,2367,2460,2416,2335,2327,2210,2311,2352,2371,2382,2285,2321,2338,2559,2494,2333,2322,2231,2327,2353,2371,2256,2272,2340,2210],"errors":[]}}
    * 
    * Observation: Until now a peak value is always followed by a 0.
    */
   var removeOutliers = function removeOutliers(message, nowAsIsoString) {
      if (message !== undefined && message.anemometerPulses !== undefined && message.directionVaneValues !== undefined &&
            message.anemometerPulses.length > 0 && message.directionVaneValues.length > 0) {

         var indicesToRemove           = [];
         var averagePulses             = calculateAverageOf(message.anemometerPulses);
         var standardDeviationOfPulses = calculateStandardDevationOfPulses(message.anemometerPulses, averagePulses);
         
         for (var index = 0; index < (message.anemometerPulses.length - 1); index++) {
            var absoluteDiff = Math.abs(averagePulses - message.anemometerPulses[index]);
            if (message.anemometerPulses[index] >= 25 &&  message.anemometerPulses[index + 1] === 0 && absoluteDiff >= (2 * standardDeviationOfPulses)) {
               indicesToRemove.push(index);
               indicesToRemove.push(index + 1);
            }
         }

         if (indicesToRemove.length > 0) {
            var originalMessage = JSON.parse(JSON.stringify(message)); // creating a clone of the message
            var pulses          = message.anemometerPulses;
            var directions      = message.directionVaneValues;

            indicesToRemove.reverse().forEach(indexToRemove => {
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
