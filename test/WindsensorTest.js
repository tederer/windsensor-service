/* global global, windsensor, testing */

require(global.PROJECT_SOURCE_ROOT_PATH + '/Windsensor.js');
require(global.PROJECT_SOURCE_ROOT_PATH + '/logging/LoggingSystem.js');
require('./Utils.js');

var utils = new testing.Utils();

var ANY_V1_MESSAGE = {
   'version':'1.0.0',
   'sequenceId':5,
   'anemometerPulses':[0,0,0,0,0],
   'directionVaneValues':[32,38,35,38,39]
};
var V2_ENVELOPE_WITH_TWO_MESSAGES = {
   'version':'2.0.0',
   'sequenceId':987, 
   'messages':[
      {'anemometerPulses':[0,1], 'directionVaneValues':[32,38], 'secondsSincePreviousMessage':0}, 
      {'anemometerPulses':[2,1], 'directionVaneValues':[22,20], 'secondsSincePreviousMessage':62}
   ], 
   'errors': []
};

var SENSOR_ID = '123456';
var UNDEFINED_AVERAGER_RESULT = {direction: {average: undefined}, speed: {average: undefined, minimum: undefined, maximum: undefined}};

var sensor;
var sensorId;
var direction;
var testingDatabase;
var testingAveragerFactory;
var testing1minAverager;
var testing10minAverager;
var testingTimeSource;
var lastMessageProvidedForProcessing;
var averages;
var dataOfLast2Hours;
var timestamps;
var timestampIndex;
var mockedAverageInstanceId = 1;
var mockedPersistedState = {
   read: async function read(stateId) {
      return new Promise((resolve, reject) => {
         resolve(undefined);
      });
   },

   write: async function write(stateId, state) { 
      return new Promise((resolve, reject) => {
         resolve(200);
      });
   }
};

var degrees = function degrees(value) {
   return value;
};

var TestingAverager = function TestingAverager(database) {
   this.database = database;
   this.calculateAverageInvocationCount = 0;
   this.capturedTimeOffsetInMs = [];

   var returnValues = [];
   var returnValuesIndex = 0;

   this.calculateAverage = function calculateAverage(timeOffsetInMs) {
      this.calculateAverageInvocationCount++;
      this.capturedTimeOffsetInMs.push(timeOffsetInMs);

      var value = returnValues[returnValuesIndex];
      if (returnValuesIndex < returnValues.length) {
         returnValuesIndex++;
      }
      return (value !== undefined) ? value : {direction: {average: undefined}, speed: {average: undefined, minimum: undefined, maximum: undefined}};
   };

   this.setReturnValues = function setReturnValues(values) {
      returnValues = values;
      returnValuesIndex = 0;
   };
};

var createMockedAverage = function createMockedAverage() {
   var mock = {
      direction: {
         average: (mockedAverageInstanceId * 10) % 360,
      },
      
      speed: {
         average: mockedAverageInstanceId, 
         minimum: mockedAverageInstanceId - 0.5, 
         maximum: mockedAverageInstanceId + 0.5
      }
   };
   mockedAverageInstanceId++;
   return mock;
};

var givenAWindsensor = function givenAWindsensor(optionalId) {
   sensorId = (optionalId === undefined) ? SENSOR_ID : optionalId;
   var optionals = {
      averagerFactory:  testingAveragerFactory, 
      timeSource:       testingTimeSource
   };
   sensor = new windsensor.Windsensor(sensorId, direction, testingDatabase, mockedPersistedState, optionals);
};

var givenAWindsensorWithADirection = function givenAWindsensorWithADirection(directionToUse) {
   direction = directionToUse;
   givenAWindsensor();
};

var EmptyMessage = function emptyMessage() {
   this.version               = '1.0.0';
   this.sequenceId            = 4;
   this.anemometerPulses      = [];
   this.directionVaneValues   = [];
};

var createV2EnvelopeWithMessages = function createV2EnvelopeWithMessages(messages) {
   return {
      'version':'2.0.0',
      'sequenceId':987, 
      'messages': messages, 
      'errors': []
   };
};

var givenMessage = function givenMessage(anemometerPulses, directionVaneValues) {
   var message = new EmptyMessage();
   message.anemometerPulses      = anemometerPulses;
   message.directionVaneValues   = directionVaneValues;
   return message;
};

var givenMessageGetsProcessed = function givenMessageGetsProcessed(message) {
   sensor.processMessage(message);
   lastMessageProvidedForProcessing = message;
};

var givenOneMinuteAveragerReturns = function givenOneMinuteAveragerReturns(returnValue) {
   testing1minAverager.setReturnValues(returnValue);
};

var givenOneMinuteAveragerReturnsAverageDirection = function givenOneMinuteAveragerReturnsAverageDirection(direction) {
   var anySpeedValue = {average: 5, minimum: 2, maximum: 6};
   var value = {direction: {average: direction}, speed: anySpeedValue};
   givenOneMinuteAveragerReturns([value]);
};

var givenTenMinuteAveragerReturns = function givenTenMinuteAveragerReturns(returnValue) {
   testing10minAverager.setReturnValues(returnValue);
};

var givenTenMinuteAveragerReturnsAverageDirection = function givenTenMinuteAveragerReturnsAverageDirection(direction) {
   var anySpeedValue = {average: 5, minimum: 2, maximum: 6};
   var value = {direction: {average: direction}, speed: anySpeedValue};
   givenTenMinuteAveragerReturns([value]);
};

var givenTimeSourceReturns = function givenTimeSourceReturns(timestampToReturn) {
   timestamps = [timestampToReturn];
   timestampIndex = 0;
};

var whenSameMessageGetsProcessedAgain = function whenSameMessageGetsProcessedAgain() {
   givenMessageGetsProcessed(lastMessageProvidedForProcessing);
};

var whenAWindsensorGetsCreated = function whenAWindsensorGetsCreated() {
   givenAWindsensor();
};

var whenMessageGetsProcessed = function whenMessageGetsProcessed(message) {
   givenMessageGetsProcessed(message);
};

var whenAveragesGetRequested = function whenAveragesGetRequested() {
    averages = sensor.getAverages();
};

var whenDataOfLast2HoursGetRequested = function whenDataOfLast2HoursGetRequested() {
   dataOfLast2Hours = sensor.getDataOfLast2Hours();
};

var thenTheMessageShouldHaveBeenInsertedIntoDatabase = function thenTheMessageShouldHaveBeenInsertedIntoDatabase(expectedMessage) {
   var documents = testingDatabase.insertedDocuments;
   var lastInsertedDocument = (documents.length > 0) ? documents[documents.length - 1] : undefined;
   expect(lastInsertedDocument).to.be.eql(expectedMessage);
};

var thenTheNumberOfInsertedMessagesInDatabaseShouldBe = function thenTheNumberOfInsertedMessagesInDatabaseShouldBe(expectedMessageCount) {
   expect(testingDatabase.insertedDocuments.length).to.be.eql(expectedMessageCount);
};

var thenTheTimestampOfTheInsertedMessagesShouldBe = function thenTheTimestampOfTheInsertedMessagesShouldBe(expectedTimestamps) {
   expect(testingDatabase.timestamps).to.be.eql(expectedTimestamps);
};

var thenDatabaseEntriesOlderThan10MinutesShouldHaveBeenRemovedTimes = function thenDatabaseEntriesOlderThan10MinutesShouldHaveBeenRemovedTimes(times) {
   expect(testingDatabase.removeAllDocumentsOlderThanInvocations.length).to.be.eql(times);
   expect(testingDatabase.removeAllDocumentsOlderThanInvocations[0]).to.be.eql(10 * 60 * 1000);
};

var thenA1minAveragerShouldHaveBeenCreated = function thenA1minAveragerShouldHaveBeenCreated() {
   expect(testingAveragerFactory.create1minAveragerInvocationCount).to.be.eql(1);
};

var thenA10minAveragerShouldHaveBeenCreated = function thenA10minAveragerShouldHaveBeenCreated() {
   expect(testingAveragerFactory.create10minAveragerInvocationCount).to.be.eql(1);
};

var thenThe1minAveragerShouldHaveBeenCalledWithTimeOffsets = function thenThe1minAveragerShouldHaveBeenCalledWithTimeOffsets(expectedTimeOffsets) {
   expect(testing1minAverager.capturedTimeOffsetInMs).to.be.eql(expectedTimeOffsets);
};

var thenThe1minAveragerShouldHaveBeenTriggeredTimes = function thenThe1minAveragerShouldHaveBeenTriggeredTimes(times) {
   expect(testing1minAverager.calculateAverageInvocationCount).to.be.eql(times);
};

var thenThe1minAveragerShouldHaveBeenTriggeredOnce = function thenThe1minAveragerShouldHaveBeenTriggeredOnce() {
   thenThe1minAveragerShouldHaveBeenTriggeredTimes(1);
};

var thenThe1minAveragerShouldNotHaveBeenTriggered = function thenThe1minAveragerShouldNotHaveBeenTriggered() {
   thenThe1minAveragerShouldHaveBeenTriggeredTimes(0);
};

var thenThe10minAveragerShouldHaveBeenTriggeredTimes = function thenThe10minAveragerShouldHaveBeenTriggeredTimes(times) {
   expect(testing10minAverager.calculateAverageInvocationCount).to.be.eql(times);
};

var thenThe10minAveragerShouldHaveBeenTriggeredOnce = function thenThe10minAveragerShouldHaveBeenTriggeredOnce() {
   thenThe10minAveragerShouldHaveBeenTriggeredTimes(1);
};

var thenThe10minAveragerShouldNotHaveBeenTriggered = function thenThe10minAveragerShouldNotHaveBeenTriggered() {
   thenThe10minAveragerShouldHaveBeenTriggeredTimes(0);
};

var then1minAverageShouldHaveBeenCreatedWithDatabase = function then1minAverageShouldHaveBeenCreatedWithDatabase() {
   expect(testing1minAverager.database).to.be.eql(testingDatabase);
};

var then10minAverageShouldHaveBeenCreatedWithDatabase = function then10minAverageShouldHaveBeenCreatedWithDatabase() {
   expect(testing10minAverager.database).to.be.eql(testingDatabase);
};

var thenAveragesShouldBeUndefined = function thenAveragesShouldBeUndefined() {
   expect(averages).to.be.eql(undefined);
};

var thenAveragesShouldBe = function thenAveragesShouldBe(expectedOneMinAverage, expectedTenMinAverage) {
   expect(averages.oneMinute).to.be.eql(expectedOneMinAverage);
   expect(averages.tenMinutes).to.be.eql(expectedTenMinAverage);
};

var thenAveragesTimestampShouldBe = function thenAveragesTimestampShouldBe(expectedTimestamp) {
   expect(averages.timestamp).to.be.eql(expectedTimestamp);
};

var thenAverageDirectionsShouldBe = function thenAverageDirectionsShouldBe(expectedOneMinAverageDirection, expectedTenMinAverageDirection) {
   var oneMincalculateShortestDistance = utils.calculateShortestDistance(utils.toRadians(averages.oneMinute.direction.average), utils.toRadians(expectedOneMinAverageDirection));
   expect(oneMincalculateShortestDistance).to.be.lessThan(utils.toRadians(0.01));
   var tenMincalculateShortestDistance = utils.calculateShortestDistance(utils.toRadians(averages.tenMinutes.direction.average), utils.toRadians(expectedTenMinAverageDirection));
   expect(tenMincalculateShortestDistance).to.be.lessThan(utils.toRadians(0.01));
};

var thenAveragesVersionShouldBe = function thenAveragesVersionShouldBe(expectedVersion) {
   expect(averages.version).to.be.eql(expectedVersion);
};

var thenVersionOfDataOfLast2HoursShouldBe = function thenVersionOfDataOfLast2HoursShouldBe(expectedVersion) {
   expect(dataOfLast2Hours.version).to.be.eql(expectedVersion);
};

var thenDataOfLast2HoursShouldContainDataSamples = function thenDataOfLast2HoursShouldContainDataSamples(expectedSampleCount) {
   expect(dataOfLast2Hours.data.length).to.be.eql(expectedSampleCount);
};

var toExpectedFormat = function toExpectedFormat(data) {
   return {
      timestamp:        data.timestamp, 
      averageDirection: data.average.direction.average, 
      averageSpeed:     data.average.speed.average, 
      minimumSpeed:     data.average.speed.minimum, 
      maximumSpeed:     data.average.speed.maximum
   };
};

var thenDataOfLast2HoursShouldContain = function thenDataOfLast2HoursShouldContain(expectedData) {
   expect(dataOfLast2Hours.data.length).to.be.eql(expectedData.length);
   expect(dataOfLast2Hours.data).to.be.eql(expectedData.map(toExpectedFormat));
};

var setup = function setup() {
   sensorId = '';
   direction = 0;
   lastMessageProvidedForProcessing = undefined;
   averages = undefined;
   dataOfLast2Hours = undefined;
   timestamps = [];
   timestampIndex = 0;
   
   testingDatabase = {
      insertedDocuments: [],
      timestamps: [],
      removeAllDocumentsOlderThanInvocations: [],

      insert: function insert(document, optionalTimestamp) {
         this.timestamps.push(optionalTimestamp);
         this.insertedDocuments.push(document);
      },

      removeAllDocumentsOlderThan: function removeAllDocumentsOlderThan(maxAgeInMillis) {
         this.removeAllDocumentsOlderThanInvocations.push(maxAgeInMillis);
      }
   };

   testingAveragerFactory = {
      create1minAveragerInvocationCount: 0,
      create10minAveragerInvocationCount: 0,

      create1minAverager: function create1minAverager(database) {
         this.create1minAveragerInvocationCount++;
         testing1minAverager = new TestingAverager(database);
         return testing1minAverager;
      },

      create10minAverager:function create10minAverager(database) {
         this.create10minAveragerInvocationCount++;
         testing10minAverager = new TestingAverager(database);
         return testing10minAverager;
      }
   };

   testingTimeSource = function testingTimeSource() {
      if (timestamps.length === 0) {
         return Date.now();
      }
      var timestamp = timestamps[timestampIndex];
      if (timestampIndex < (timestamps.length - 1)) {
         timestampIndex++;
      }
      return (new Date(timestamp)).getTime();
   };
};

describe('Windsensor', function() {
   
   beforeEach(setup);

   it('the constructor of the windsensor creates a 1min averager', function() {
      whenAWindsensorGetsCreated();
      thenA1minAveragerShouldHaveBeenCreated();
   });

   it('the constructor of the windsensor provides the database to the 1min averager', function() {
      whenAWindsensorGetsCreated();
      then1minAverageShouldHaveBeenCreatedWithDatabase();
   });

   it('the constructor of the windsensor creates a 10min averager', function() {
      whenAWindsensorGetsCreated();
      thenA10minAveragerShouldHaveBeenCreated();
   });

   it('the constructor of the windsensor provides the database to the 10min averager', function() {
      whenAWindsensorGetsCreated();
      then10minAverageShouldHaveBeenCreatedWithDatabase();
   });
   
   it('a message with the same sequence ID does not get inserted into the database', function() {
      givenAWindsensor();
      givenMessageGetsProcessed(ANY_V1_MESSAGE);
      whenSameMessageGetsProcessedAgain();
      thenTheNumberOfInsertedMessagesInDatabaseShouldBe(1);
   });
   
   it('all messages in a V2 message envelope get added to the database', function() {
      givenAWindsensor();
      givenMessageGetsProcessed(V2_ENVELOPE_WITH_TWO_MESSAGES);
      thenTheNumberOfInsertedMessagesInDatabaseShouldBe(2);
   });
   
   it('all messages in a V2 message envelope get added to the database with corresponding timestamp', function() {
      var messages = [
         {'anemometerPulses':[0,1], 'directionVaneValues':[32,33], 'secondsSincePreviousMessage':0}, 
         {'anemometerPulses':[2,3], 'directionVaneValues':[34,35], 'secondsSincePreviousMessage':62}
      ];
      var v2Envelope = createV2EnvelopeWithMessages(messages);
      var currentTimeInMsSinceEpoch = 100000;
      givenTimeSourceReturns((new Date(currentTimeInMsSinceEpoch)).toISOString());
      givenAWindsensor();
      whenMessageGetsProcessed(v2Envelope);
      thenTheTimestampOfTheInsertedMessagesShouldBe([100000 - (62 * 1000), 100000]);
   });
   
   it('a V1 message gets added to the database with current timee as timestamp', function() {
      var currentTimeInMsSinceEpoch = 20000;
      givenTimeSourceReturns((new Date(currentTimeInMsSinceEpoch)).toISOString());
      givenAWindsensor();
      whenMessageGetsProcessed(ANY_V1_MESSAGE);
      thenTheTimestampOfTheInsertedMessagesShouldBe([currentTimeInMsSinceEpoch]);
   });
   
   it('every new message requests the database to remove all entries older than 10 minutes', function() {
      givenAWindsensor();
      whenMessageGetsProcessed(ANY_V1_MESSAGE);
      thenDatabaseEntriesOlderThan10MinutesShouldHaveBeenRemovedTimes(1);
   });

   it('1min averager gets triggered to recalculate the averages on a new message', function() {
      givenAWindsensor();
      whenMessageGetsProcessed(ANY_V1_MESSAGE);
      thenThe1minAveragerShouldHaveBeenTriggeredOnce();
   });

   it('1min averager gets triggered only once on duplicate messages', function() {
      givenAWindsensor();
      givenMessageGetsProcessed(ANY_V1_MESSAGE);
      whenSameMessageGetsProcessedAgain();
      thenThe1minAveragerShouldHaveBeenTriggeredOnce();
   });

   it('10min averager gets triggered to recalculate the averages on a new message', function() {
      givenAWindsensor();
      whenMessageGetsProcessed(ANY_V1_MESSAGE);
      thenThe10minAveragerShouldHaveBeenTriggeredOnce();
   });

   it('10min averager gets triggered only once on duplicate messages', function() {
      givenAWindsensor();
      givenMessageGetsProcessed(ANY_V1_MESSAGE);
      whenSameMessageGetsProcessedAgain();
      thenThe10minAveragerShouldHaveBeenTriggeredOnce();
   });

   it('getAverages() result contains the values provided by the averagers - A', function() {
      var averageA = createMockedAverage();
      var averageB = createMockedAverage();
      givenAWindsensor();
      givenOneMinuteAveragerReturns([averageA]);
      givenTenMinuteAveragerReturns([averageB]);
      givenMessageGetsProcessed(ANY_V1_MESSAGE);
      whenAveragesGetRequested();
      thenAveragesShouldBe(averageA, averageB);
   });

   it('getAverages() result contains the values provided by the averagers - B', function() {
      givenAWindsensor();
      givenOneMinuteAveragerReturns([UNDEFINED_AVERAGER_RESULT]);
      givenTenMinuteAveragerReturns([UNDEFINED_AVERAGER_RESULT]);
      givenMessageGetsProcessed(ANY_V1_MESSAGE);
      whenAveragesGetRequested();
      thenAveragesShouldBe(UNDEFINED_AVERAGER_RESULT, UNDEFINED_AVERAGER_RESULT);
   });

   it('getAverages() returns undefined timestamp if processMessage() was never called before', function() {
      givenAWindsensor();
      whenAveragesGetRequested();
      thenAveragesTimestampShouldBe(undefined);
   });

   it('getAverages() returns the timestamp of the last invocation of processMessage()', function() {
      givenAWindsensor();
      givenTimeSourceReturns('1980-06-03T11:53:40.100Z');
      givenMessageGetsProcessed(ANY_V1_MESSAGE);
      whenAveragesGetRequested();
      thenAveragesTimestampShouldBe('1980-06-03T11:53:40.100Z');
   });

   it('the direction gets added to the average direction values - A', function() {
      givenAWindsensorWithADirection(degrees(90));
      givenOneMinuteAveragerReturnsAverageDirection(degrees(120.3));
      givenTenMinuteAveragerReturnsAverageDirection(degrees(355.9));
      givenMessageGetsProcessed(ANY_V1_MESSAGE);
      whenAveragesGetRequested();
      thenAverageDirectionsShouldBe(degrees(210.3), degrees(85.9));
   });

   it('the direction gets added to the average direction values - B', function() {
      givenAWindsensorWithADirection(degrees(0));
      givenOneMinuteAveragerReturnsAverageDirection(degrees(120.3));
      givenTenMinuteAveragerReturnsAverageDirection(degrees(355.9));
      givenMessageGetsProcessed(ANY_V1_MESSAGE);
      whenAveragesGetRequested();
      thenAverageDirectionsShouldBe(degrees(120.3), degrees(355.9));
   });

   it('the version of the returned averages is 1.0.0', function() {
      givenAWindsensorWithADirection(degrees(0));
      givenMessageGetsProcessed(ANY_V1_MESSAGE);
      whenAveragesGetRequested();
      thenAveragesVersionShouldBe('1.0.0');
   });

   it('getDataOfLast2Hours() returns the average values for the last 2 hours', function() {
      givenAWindsensorWithADirection(degrees(0));
      givenTimeSourceReturns('2021-06-03T11:53:40.100Z');
      givenOneMinuteAveragerReturnsAverageDirection(degrees(50.0));
      givenMessageGetsProcessed(ANY_V1_MESSAGE);
      whenDataOfLast2HoursGetRequested();
      thenDataOfLast2HoursShouldContainDataSamples(1);
   });

   it('getDataOfLast2Hours() does not return data older than 2 hours', function() {
     
      var tuples = [ {timestamp: '2021-06-05T11:53:40.100Z', average: createMockedAverage()},
                     {timestamp: '2021-06-05T13:53:40.100Z', average: createMockedAverage()},
                     {timestamp: '2021-06-05T13:53:40.101Z', average: createMockedAverage()}];

      givenAWindsensorWithADirection(degrees(0));
      givenOneMinuteAveragerReturns(tuples.map(tuple => tuple.average));
      for(var i = 0; i < 3; i++) {
         givenTimeSourceReturns(tuples[i].timestamp);
         givenMessageGetsProcessed(ANY_V1_MESSAGE);
         ANY_V1_MESSAGE.sequenceId++;
      }
      whenDataOfLast2HoursGetRequested();
      thenDataOfLast2HoursShouldContain([tuples[1], tuples[2]]);
   });

   it('getDataOfLast2Hours() removes expired data', function() {
     
      var tuples = [ {timestamp: '2021-06-05T11:53:40.100Z', average: createMockedAverage()},
                     {timestamp: '2021-06-05T13:53:40.100Z', average: createMockedAverage()},
                     {timestamp: '2021-06-05T13:53:40.101Z', average: createMockedAverage()}];

      givenAWindsensorWithADirection(degrees(0));
      givenOneMinuteAveragerReturns(tuples.map(tuple => tuple.average));
      for(var i = 0; i < 3; i++) {
         givenTimeSourceReturns(tuples[i].timestamp);
         givenMessageGetsProcessed(ANY_V1_MESSAGE);
         ANY_V1_MESSAGE.sequenceId++;
      }
      givenTimeSourceReturns('2021-06-05T15:53:40.101Z');
      whenDataOfLast2HoursGetRequested();
      thenDataOfLast2HoursShouldContain([tuples[2]]);
   });

   it('getDataOfLast2Hours() returns a JSON object with version 1.0.0', function() {
      givenAWindsensorWithADirection(degrees(0));
      givenTimeSourceReturns('2021-06-05T11:53:40.100Z');
      givenOneMinuteAveragerReturnsAverageDirection(degrees(50.0));
      givenMessageGetsProcessed(ANY_V1_MESSAGE);
      whenDataOfLast2HoursGetRequested();
      thenVersionOfDataOfLast2HoursShouldBe('1.0.0');
   });

   it('two hour history contains as many one minute average vales as the V2 message envelope contains messages', function() {
      var messages = [
         {'anemometerPulses':[0,1], 'directionVaneValues':[32,33], 'secondsSincePreviousMessage':0}, 
         {'anemometerPulses':[2,3], 'directionVaneValues':[34,35], 'secondsSincePreviousMessage':62}
      ];
      var v2Envelope = createV2EnvelopeWithMessages(messages);
      var mocked1MinAverageData = [createMockedAverage(), createMockedAverage()];
      
      var expected = [  {timestamp: '2021-06-05T11:52:38.100Z', average: mocked1MinAverageData[0]},
                        {timestamp: '2021-06-05T11:53:40.100Z', average: mocked1MinAverageData[1]}];

      givenTimeSourceReturns('2021-06-05T11:53:40.100Z');
      givenAWindsensor();
      givenOneMinuteAveragerReturns(mocked1MinAverageData);
      givenMessageGetsProcessed(v2Envelope);
      whenDataOfLast2HoursGetRequested();
      thenDataOfLast2HoursShouldContain(expected);
   });
   
   it('one minute averager gets called with corresponding time offsets for each message in a V2 message envelope', function() {
      var messages = [
         {'anemometerPulses':[0,1], 'directionVaneValues':[32,33], 'secondsSincePreviousMessage':0}, 
         {'anemometerPulses':[2,3], 'directionVaneValues':[34,35], 'secondsSincePreviousMessage':62}
      ];
      var v2Envelope = createV2EnvelopeWithMessages(messages);
       
      givenTimeSourceReturns('2021-06-05T11:53:40.100Z');
      givenAWindsensor();
      whenMessageGetsProcessed(v2Envelope);
      thenThe1minAveragerShouldHaveBeenCalledWithTimeOffsets([62000, 0]);
   });
   
   it('anemometer pulses and their following 0 get removed if they are at least 25 (10 bft) and it is at least 2 times the standard deviation higher than the median', function() {
      givenAWindsensor();
      var anemometerPulses    = [13, 13, 12, 13, 25, 0, 9, 9, 9];
      var directionVaneValues = [ 0,  1,  2,  3,  4, 5, 6, 7, 8];
      var message = givenMessage(anemometerPulses, directionVaneValues);
      whenMessageGetsProcessed(message);
      var expectedAnemometerPulses    = [13, 13, 12, 13, 9, 9, 9];
      var expectedDirectionVaneValues = [ 0,  1,  2,  3, 6, 7, 8];
      var expectedMessage = givenMessage(expectedAnemometerPulses, expectedDirectionVaneValues);
      thenTheMessageShouldHaveBeenInsertedIntoDatabase(expectedMessage);
   });

   it('anemometer pulses get removed if they are at least 25 (10 bft) and it is at least 2 times the standard deviation higher than the median - A', function() {
      givenAWindsensor();
      var anemometerPulses    = [15, 15, 15, 15, 25, 9, 9, 9, 9];
      var directionVaneValues = [ 0,  1,  2,  3,  4, 5, 6, 7, 8];
      var message = givenMessage(anemometerPulses, directionVaneValues);
      whenMessageGetsProcessed(message);
      var expectedAnemometerPulses    = [15, 15, 15, 15, 9, 9, 9, 9];
      var expectedDirectionVaneValues = [ 0,  1,  2,  3, 5, 6, 7, 8];
      var expectedMessage = givenMessage(expectedAnemometerPulses, expectedDirectionVaneValues);
      thenTheMessageShouldHaveBeenInsertedIntoDatabase(expectedMessage);
   });

   it('anemometer pulses get removed if they are at least 25 (10 bft) and it is at least 2 times the standard deviation higher than the median - B', function() {
      givenAWindsensor();
      var anemometerPulses    = [19, 19, 18, 18, 25, 9, 9, 9, 9, 9];
      var directionVaneValues = [ 0,  1,  2,  3,  4, 5, 6, 7, 8, 9];
      var message = givenMessage(anemometerPulses, directionVaneValues);
      whenMessageGetsProcessed(message);
      var expectedAnemometerPulses    = [19, 19, 18, 18, 9, 9, 9, 9, 9];
      var expectedDirectionVaneValues = [ 0,  1,  2,  3, 5, 6, 7, 8, 9];
      var expectedMessage = givenMessage(expectedAnemometerPulses, expectedDirectionVaneValues);
      thenTheMessageShouldHaveBeenInsertedIntoDatabase(expectedMessage);
   });

   it('anemometer pulses get removed if they are at least 25 (10 bft) and it is at least 2 times the standard deviation higher than the median - C', function() {
      givenAWindsensor();
      var anemometerPulses    = [15, 15, 15, 15, 9, 9, 9, 25];
      var directionVaneValues = [ 0,  1,  2,  3,  4, 5, 6, 7];
      var message = givenMessage(anemometerPulses, directionVaneValues);
      whenMessageGetsProcessed(message);
      var expectedAnemometerPulses    = [15, 15, 15, 15, 9, 9, 9];
      var expectedDirectionVaneValues = [ 0,  1,  2,  3, 4, 5, 6];
      var expectedMessage = givenMessage(expectedAnemometerPulses, expectedDirectionVaneValues);
      thenTheMessageShouldHaveBeenInsertedIntoDatabase(expectedMessage);
   });
});  