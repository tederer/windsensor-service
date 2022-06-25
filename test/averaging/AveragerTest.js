/* global global, windsensor, testing */

require(global.PROJECT_SOURCE_ROOT_PATH + '/averaging/Averager.js');
require('../Utils.js');

var MILLIS_PER_SECOND = 1000;
var ONE_MINUTE = 60 * MILLIS_PER_SECOND;
var TEN_MINUTES = 10 * ONE_MINUTE;

var messageSequenceId = 0;
var averager;
var testingDatabase;
var testingMappers;
var recordsToReturn;
var mappedValues;
var calculationResult;

var utils = new testing.Utils();

var givenAnAverager = function givenAnAverager(durationInMillis) {
   var averagingDuration = (durationInMillis === undefined) ? TEN_MINUTES : durationInMillis;
   averager = new windsensor.averaging.Averager(testingDatabase, averagingDuration, testingMappers);
};

var givenAOneMinuteAverager = function givenAOneMinuteAverager() {
   givenAnAverager(ONE_MINUTE);
};

var givenATenMinuteAverager = function givenATenMinuteAverager() {
   givenAnAverager(TEN_MINUTES);
};

var givenDatabaseProvidesRecords = function givenDatabaseProvidesRecords(records) {
   recordsToReturn = records;
};

var degrees = function degrees(value) {
   return value;
};

var kmh = function kmh(value) {
   return value;
};

var offset = function offset(value) {
   return value;
};

var gradient = function gradient(value) {
   return value;
};

var second = function second(value) {
   return value;
};

var MappedValues = function MappedValues() {
   var directionValues = [];
   var speedValues = [];
   
   this.directions = function directions(directionsInDegrees) {
      directionValues = directionsInDegrees.map(deg => utils.toRadians(deg));
      return this;
   };
      
   this.speeds = function speeds(speedsToReturn) {
      speedValues = speedsToReturn;
      return this;
   };

   this.getDirection = function getDirection(index) {
      return directionValues[index];
   };

   this.getSpeed = function getSpeed(index) {
      return speedValues[index];
   };

   this.getValueCount = function getValueCount() {
      return Math.max(directionValues.length, speedValues.length);
   };
};

var givenMappedValues = function givenMappedValues() {
   mappedValues = new MappedValues();
   return mappedValues;
};

var RecordBuilder = function RecordBuilder() {
   var pulses = [];
   var vaneValues = [];
   var timestamp = 0;

   var insertMissingData = function insertMissingData() {
      while (pulses.length < vaneValues.length) {
         pulses.push(undefined);
      }
      while (vaneValues.length < pulses.length) {
         vaneValues.push(undefined);
      }
   };

   this.withAnemometerPulses = function withAnemometerPulses(pulsesToUse) {
      pulses = pulsesToUse;
      return this;
   };

   this.withDirectionVaneValues = function withDirectionVaneValues(vaneValuesToUse) {
      vaneValues = vaneValuesToUse;
      return this;
   };

   this.withTimestamp = function withTimestamp(timestampInSecondsToUse) {
      timestamp = timestampInSecondsToUse * MILLIS_PER_SECOND;
      return this;
   };

   this.build = function build() {
      insertMissingData();
      return {timestamp: timestamp, document:{version: '1.0.0' , sequenceId: messageSequenceId++, anemometerPulses: pulses, directionVaneValues: vaneValues}};
   };
};

var record = function record() {
   return new RecordBuilder();
};

var whenAverageCalculationGetsTriggeredWithTimeOffset = function whenAverageCalculationGetsTriggeredWithTimeOffset(timeOffsetInMs) {
   if (mappedValues !== undefined) {
      var indices = [];
      for (var i = 0; i < mappedValues.getValueCount(); i++) {
         indices.push(i);
      }
      if (recordsToReturn.length === 0) {
         var dbRecord = record().withAnemometerPulses(indices).withDirectionVaneValues(indices).build();
         givenDatabaseProvidesRecords([dbRecord]);
      } 
   }
   calculationResult = averager.calculateAverage(timeOffsetInMs);
};

var whenAverageCalculationGetsTriggered = function whenAverageCalculationGetsTriggered() {
   whenAverageCalculationGetsTriggeredWithTimeOffset();
};

var thenDatabaseShouldHaveBeenAskedToProvideRecordsNotOlderThan = function whenAverageCalculationGetsTriggered(expectedMaxAgeInMillis) {
   expect(testingDatabase.getAllDocumentsNotOlderThanInvocations.length).to.be.eql(1);
   expect(testingDatabase.getAllDocumentsNotOlderThanInvocations[0]).to.be.eql(expectedMaxAgeInMillis);
};

var thenTheSpeedValuesShouldHaveBeenMapped = function thenTheSpeedValuesShouldHaveBeenMapped(expectedMapperInput) {
   expect(testingMappers.speed.capturedInput.length).to.be.eql(expectedMapperInput.length);
   expect(testingMappers.speed.capturedInput).to.be.eql(expectedMapperInput);
};

var thenTheDirectionValuesShouldHaveBeenMapped = function thenTheDirectionValuesShouldHaveBeenMapped(expectedMapperInput) {
   expect(testingMappers.direction.capturedInput.length).to.be.eql(expectedMapperInput.length);
   expect(testingMappers.direction.capturedInput).to.be.eql(expectedMapperInput);
};

var thenTheAverageDirectionShouldBe = function thenTheAverageDirectionShouldBe(expectedDirectionInDegrees) {
   if (expectedDirectionInDegrees !== undefined) {
      var shortestDistanceInDegrees = utils.calculateShortestDistanceDegrees(calculationResult.direction.average, expectedDirectionInDegrees);
      expect(shortestDistanceInDegrees).to.be.lessThan(degrees(0.01));
   } else {
      expect(calculationResult.direction.average).to.be.eql(undefined);
   }
};

var thenTheAverageSpeedShouldBe = function thenTheAverageSpeedShouldBe(expectedSpeed) {
   expect(calculationResult.speed.average).to.be.eql(expectedSpeed);
};

var thenTheMinimumSpeedShouldBe = function thenTheMinimumSpeedShouldBe(expectedMinimumSpeed) {
   expect(calculationResult.speed.minimum).to.be.eql(expectedMinimumSpeed);
};

var thenTheMaximumSpeedShouldBe = function thenTheMaximumSpeedShouldBe(expectedMaximumSpeed) {
   expect(calculationResult.speed.maximum).to.be.eql(expectedMaximumSpeed);
};

var round = function round(value) {
   var factor = 1000000;
   return Math.round(value * factor) / factor;
};

var thenTheSpeedTrendShouldBe = function thenTheSpeedTrendShouldBe(expectedOffset, expectedgradient) {
   var actual = {offset: round(calculationResult.speed.trend.offset), gradient: round(calculationResult.speed.trend.gradient)};
   var expected = {offset: round(expectedOffset), gradient: round(expectedgradient)};
   expect(actual).to.be.eql(expected);
};

var setup = function setup() {
   recordsToReturn = [];
   mappedValues = undefined;
   calculationResult = undefined;

   testingDatabase = {
      getAllDocumentsNotOlderThanInvocations: [],

      getAllDocumentsNotOlderThan: function getAllDocumentsNotOlderThan(maxAgeInMillis) {
         this.getAllDocumentsNotOlderThanInvocations.push(maxAgeInMillis);
         return recordsToReturn;
      }
   };

   testingMappers = {
      speed: {
         capturedInput: [],
         map: function map(input) {
            this.capturedInput.push(input);
            return (mappedValues === undefined) ? undefined : mappedValues.getSpeed(input);
         }
      },
      direction: {
         capturedInput: [],
         map: function map(input) {
            this.capturedInput.push(input);
            return (mappedValues === undefined) ? undefined : mappedValues.getDirection(input);
         }
      }
   };
};

describe('Averager', function() {
	
   beforeEach(setup);
   
   it('the records (not older than the averaging duration) get pulled from database when calculation requested - 1min', function() {
      givenAOneMinuteAverager();
      whenAverageCalculationGetsTriggered();
      thenDatabaseShouldHaveBeenAskedToProvideRecordsNotOlderThan(ONE_MINUTE);
   });
   
   it('the records (not older than the averaging duration) get pulled from database when calculation requested - 10min', function() {
      givenATenMinuteAverager();
      whenAverageCalculationGetsTriggered();
      thenDatabaseShouldHaveBeenAskedToProvideRecordsNotOlderThan(TEN_MINUTES);
   });
   

   it('each anemometer value gets mapped to its speed value - A', function() {
      var record1 = record().withAnemometerPulses([0,1,2]).build();
      var record2 = record().withAnemometerPulses([6,7,8]).build();
      var record3 = record().withAnemometerPulses([3,4,5]).build();
      givenAnAverager();
      givenDatabaseProvidesRecords([record1, record2, record3]);
      whenAverageCalculationGetsTriggered();
      thenTheSpeedValuesShouldHaveBeenMapped([0,1,2,6,7,8,3,4,5]);
   });
   

   it('each anemometer value gets mapped to its speed value - B', function() {
     givenAnAverager();
      givenDatabaseProvidesRecords([]);
      whenAverageCalculationGetsTriggered();
      thenTheSpeedValuesShouldHaveBeenMapped([]);
   });
   

   it('each direction vane value gets mapped to its direction value - A', function() {
      var record1 = record().withDirectionVaneValues([100, 2003, 1001]).build();
      var record2 = record().withDirectionVaneValues([4000, 0, 25]).build();
      givenAnAverager();
      givenDatabaseProvidesRecords([record1, record2]);
      whenAverageCalculationGetsTriggered();
      thenTheDirectionValuesShouldHaveBeenMapped([100, 2003, 1001, 4000, 0, 25]);
   });
   

   it('each direction vane value gets mapped to its direction value - B', function() {
      givenAnAverager();
      givenDatabaseProvidesRecords([]);
      whenAverageCalculationGetsTriggered();
      thenTheDirectionValuesShouldHaveBeenMapped([]);
   });
   

   it('average direction calculation - single value - A', function() {
      givenAnAverager();
      givenMappedValues().directions([degrees(90)]).speeds([kmh(10)]);
      whenAverageCalculationGetsTriggered();
      thenTheAverageDirectionShouldBe(degrees(90));
   });
   

   it('average direction calculation - single value - B', function() {
      givenAnAverager();
      givenMappedValues().directions([degrees(275)]).speeds([kmh(3.4)]);
      whenAverageCalculationGetsTriggered();
      thenTheAverageDirectionShouldBe(degrees(275));
   });
   

   it('average direction calculation - two values with same speed', function() {
      givenAnAverager();
      givenMappedValues().directions([degrees(90), degrees(180)]).speeds([kmh(7), kmh(7)]);
      whenAverageCalculationGetsTriggered();
      thenTheAverageDirectionShouldBe(degrees(135));
   });
   

   it('average direction calculation - two values with different speed', function() {
      givenAnAverager();
      givenMappedValues().directions([degrees(90), degrees(180)]).speeds([kmh(7), kmh(14)]);
      whenAverageCalculationGetsTriggered();
      thenTheAverageDirectionShouldBe(degrees(153.4349));
   });

   it('average direction calculation - two values with oposite direction and different speed', function() {
      givenAnAverager();
      givenMappedValues().directions([degrees(160), degrees(340)]).speeds([kmh(10), kmh(15)]);
      whenAverageCalculationGetsTriggered();
      thenTheAverageDirectionShouldBe(degrees(340));
   });

   it('average direction calculation - result is undefined if sum vector length is less than 0.5 kmh', function() {
      givenAnAverager();
      givenMappedValues().directions([degrees(160), degrees(340)]).speeds([kmh(27), kmh(26.5001)]);
      whenAverageCalculationGetsTriggered();
      thenTheAverageDirectionShouldBe(undefined);
   });

   it('average direction calculation - result is not undefined if sum vector length is at least 0.5 kmh', function() {
      givenAnAverager();
      givenMappedValues().directions([degrees(160), degrees(340)]).speeds([kmh(27), kmh(26.5)]);
      whenAverageCalculationGetsTriggered();
      thenTheAverageDirectionShouldBe(degrees(160));
   });

   it('average speed calculation - single value - A', function() {
      givenAnAverager();
      givenMappedValues().speeds([kmh(7.25)]);
      whenAverageCalculationGetsTriggered();
      thenTheAverageSpeedShouldBe(kmh(7.25));
   });

   it('average speed calculation - single value - B', function() {
      givenAnAverager();
      givenMappedValues().speeds([kmh(100)]);
      whenAverageCalculationGetsTriggered();
      thenTheAverageSpeedShouldBe(kmh(100));
   });

   it('average speed calculation - more than one value', function() {
      givenAnAverager();
      givenMappedValues().speeds([kmh(100), kmh(80)]);
      whenAverageCalculationGetsTriggered();
      thenTheAverageSpeedShouldBe(kmh(90));
   });

   it('average speed calculation - return undefined when no speed values available', function() {
      givenAnAverager();
      givenMappedValues().speeds([]);
      whenAverageCalculationGetsTriggered();
      thenTheAverageSpeedShouldBe(undefined);
   });

   it('minimum speed calculation - single value', function() {
      givenAnAverager();
      givenMappedValues().speeds([kmh(37)]);
      whenAverageCalculationGetsTriggered();
      thenTheMinimumSpeedShouldBe(kmh(37));
   });

   it('minimum speed calculation - more than one value', function() {
      givenAnAverager();
      givenMappedValues().speeds([kmh(37), kmh(12.4), kmh(22.1), kmh(17.9)]);
      whenAverageCalculationGetsTriggered();
      thenTheMinimumSpeedShouldBe(kmh(12.4));
   });

   it('minimum speed calculation - return undefined when no speed values available', function() {
      givenAnAverager();
      givenMappedValues().speeds([]);
      whenAverageCalculationGetsTriggered();
      thenTheMinimumSpeedShouldBe(undefined);
   });

   it('maximum speed calculation - single value', function() {
      givenAnAverager();
      givenMappedValues().speeds([kmh(37)]);
      whenAverageCalculationGetsTriggered();
      thenTheMaximumSpeedShouldBe(kmh(37));
   });

   it('maximum speed calculation - more than one value', function() {
      givenAnAverager();
      givenMappedValues().speeds([kmh(37), kmh(12.4), kmh(55.3), kmh(17.9)]);
      whenAverageCalculationGetsTriggered();
      thenTheMaximumSpeedShouldBe(kmh(55.3));
   });

   it('maximum speed calculation - return undefined when no speed values available', function() {
      givenAnAverager();
      givenMappedValues().speeds([]);
      whenAverageCalculationGetsTriggered();
      thenTheMaximumSpeedShouldBe(undefined);
   });

   it('speed trend calculation - A', function() {
      givenAOneMinuteAverager();
      givenMappedValues().speeds([kmh(10), kmh(15)]);
      var record1 = record().withTimestamp(second(0)).withAnemometerPulses([0]).build();
      var record2 = record().withTimestamp(second(60)).withAnemometerPulses([1]).build();
      givenDatabaseProvidesRecords([record1, record2]);
      whenAverageCalculationGetsTriggered();
      thenTheSpeedTrendShouldBe(offset(kmh(10)), gradient(kmh(5)));
   });
   
   it('speed trend calculation - B', function() {
      givenATenMinuteAverager();
      givenMappedValues().speeds([kmh(7), kmh(5), kmh(3)]);
      var record1 = record().withTimestamp(second(0)).withAnemometerPulses([0]).build();
      var record2 = record().withTimestamp(second(5 * 60)).withAnemometerPulses([1]).build();
      var record3 = record().withTimestamp(second(10 * 60)).withAnemometerPulses([2]).build();
      givenDatabaseProvidesRecords([record1, record2, record3]);
      whenAverageCalculationGetsTriggered();
      thenTheSpeedTrendShouldBe(offset(kmh(7)), gradient(kmh(-4)));
   });

   it('speed trend calculation - C', function() {
      givenAOneMinuteAverager();
      givenMappedValues().speeds([kmh(2), kmh(3), kmh(4)]);
      var record1 = record().withTimestamp(second(0)).withAnemometerPulses([0,1]).build();
      var record2 = record().withTimestamp(second(60)).withAnemometerPulses([2]).build();
      givenDatabaseProvidesRecords([record1, record2]);
      whenAverageCalculationGetsTriggered();
      thenTheSpeedTrendShouldBe(offset(kmh(2.4834744605)), gradient(kmh(1.4995902759)));
   });

   it('combined test', function() {
      givenAnAverager();
      givenMappedValues()
         .directions([degrees(355), degrees(0), degrees(90), degrees(180), degrees(270)])
         .speeds([       kmh(12.7),   kmh(8.5),    kmh(8.5),     kmh(8.5),     kmh(8.5)]);
      whenAverageCalculationGetsTriggered();
      thenTheAverageDirectionShouldBe(degrees(355));
      thenTheAverageSpeedShouldBe(kmh(9.34));
      thenTheMinimumSpeedShouldBe(kmh(8.5));
      thenTheMaximumSpeedShouldBe(kmh(12.7));
   });

   it('0 gets used as time offset if value is undefined', function() {
      givenAOneMinuteAverager();
      whenAverageCalculationGetsTriggered();
      thenDatabaseShouldHaveBeenAskedToProvideRecordsNotOlderThan(60000);
   });

   it('the time offset gets added to the duration', function() {
      givenAOneMinuteAverager();
      whenAverageCalculationGetsTriggeredWithTimeOffset(72000);
      thenDatabaseShouldHaveBeenAskedToProvideRecordsNotOlderThan(60000 + 72000);
   });
});  