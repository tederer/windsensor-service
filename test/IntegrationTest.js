/* global global, windsensor, testing */

require(global.PROJECT_SOURCE_ROOT_PATH + '/Windsensor.js');
require(global.PROJECT_SOURCE_ROOT_PATH + '/database/Database.js');
require('./Utils.js');

var SENSOR_ID = 223344;
var SENSOR_DIRECTION = 10.2;

var sensor;
var utils = new testing.Utils();
var mockedDatabase;
var message;
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

var MockedDatabase = function MockedDatabase() {
   var documents = [];

   this.insert = function insert(documentToAdd) {
      documents.push({document:documentToAdd});
   };

   this.removeAllDocumentsOlderThan = function removeAllDocumentsOlderThan(maxAgeInMillis) {  
   };

   this.getAllDocumentsNotOlderThan = function getAllDocumentsNotOlderThan(maxAgeInMillis) {
      return documents;
   };
};

MockedDatabase.prototype = new windsensor.database.Database();

var givenAWindsensor = function givenAWindsensor() {
   sensor = new windsensor.Windsensor(SENSOR_ID, SENSOR_DIRECTION, mockedDatabase, mockedPersistedState);
};

var givenMessageGetsProcessed = function givenMessageGetsProcessed() {
   message = {
      version: '1.0.0',
      sequenceId:5,
      anemometerPulses:[0],
      directionVaneValues:[32]
   };
   sensor.processMessage(message);
};

var setup = function setup() {
   mockedDatabase = new MockedDatabase();
   message = undefined;
};

/**
 * The intension of this tests is to check if all components work together.
 * It is not intended to test every feature - this is the scope of the unit tests.
 */
describe('IntegrationTest', function() {
	
   beforeEach(setup);

   it('creating an instance of a windsensor', function() {
      givenAWindsensor();
      expect(sensor).to.not.be.eql(undefined);
   });

   it('getAverages() returns averages', function() {
      givenAWindsensor();
      givenMessageGetsProcessed();
      var averages = sensor.getAverages(SENSOR_ID);
      expect(averages.version).to.not.be.eql(undefined);
      expect(averages.timestamp).to.not.be.eql(undefined);
      expect(averages.oneMinute).to.not.be.eql(undefined);
      expect(averages.tenMinutes).to.not.be.eql(undefined);
   });
});  