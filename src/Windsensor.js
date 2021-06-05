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
   
   LOGGER.logInfo('creating windsensor [id = ' + id + ', direction = ' + direction + '°] ...');

   var defaultTimestampFactory = function defaultTimestampFactory() {
      return (new Date()).toISOString();
   };

   var averagerFactory = (optionalAveragerFactory === undefined) ? windsensor.averaging.Factory : optionalAveragerFactory;
   var timestampFactory = (optionalTimestampFactory === undefined) ? defaultTimestampFactory : optionalTimestampFactory;

   var TwoHourHistory = function TwoHourHistory() {
      var dataOfLast2Hours = [];

      var createDataForHistory = function createDataForHistory(timestamp, tenMinAverage) {
         var data = {timestamp: timestamp};
   
         if (tenMinAverage.direction !== undefined) {
            data.averageDirection = tenMinAverage.direction.average;
         }
            
         if (tenMinAverage.speed !== undefined) {
            data.averageSpeed = tenMinAverage.speed.average;
            data.minimumSpeed = tenMinAverage.speed.minimum;
            data.maximumSpeed = tenMinAverage.speed.maximum;
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
      
      this.add = function add(nowAsIsoString, tenMinAverage) {
         dataOfLast2Hours.push(createDataForHistory(nowAsIsoString, tenMinAverage));
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
         database.insert(message);
         database.removeAllDocumentsOlderThan(TEN_MINUTES);
         var oneMinAverage = calculateAverage(oneMinAverager);
         var tenMinAverage = calculateAverage(tenMinAverager);
         averages.timestamp = nowAsIsoString;
         averages.oneMinute = oneMinAverage;
         averages.tenMinutes = tenMinAverage;
         historyOf2Hours.add(nowAsIsoString, tenMinAverage);
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
};
