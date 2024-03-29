/* global global, windsensor*/

require(global.PROJECT_SOURCE_ROOT_PATH + '/database/InMemoryDatabase.js');

var database;
var timestampsToReturn;
var timestampIndex;
var DEFAULT_TIMESTAMP = 0;
var wrappedDocuments;
var documents;
var timestamps;
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

var testingTimeSource = function testingTimeSource() {
   var timestamp = DEFAULT_TIMESTAMP;
   if (timestampsToReturn.length > 0) {
      if (timestampIndex < timestampsToReturn.length) {
         timestamp = timestampsToReturn[timestampIndex++];
      } else {
         timestamp = timestampsToReturn[timestampsToReturn.length - 1];
      }
   }
   return timestamp;
};

var whenGettingDocumentsNotOlderThanMs = function whenGettingDocumentsNotOlderThanMs(durationInMillis) {
   wrappedDocuments = database.getAllDocumentsNotOlderThan(durationInMillis);
   documents = wrappedDocuments.map(wrapper => wrapper.document);
   timestamps = wrappedDocuments.map(wrapper => wrapper.timestamp);
};

var setup = function setup() {
   timestampIndex = 0;
   timestampsToReturn = [];
   wrappedDocuments = undefined;
   documents = undefined;
   timestamps = undefined;
	database = new windsensor.database.InMemoryDatabase(mockedPersistedState, testingTimeSource);
};

describe('InMemoryDatabase', function() {
	
   beforeEach(setup);
   
   it('getAllDocumentsNotOlderThan() returns empty array if nothing was inserted', function() {
      var documents = database.getAllDocumentsNotOlderThan(DEFAULT_TIMESTAMP);
      expect(documents.length).to.be.eql(0);
   });

   it('getAllDocumentsNotOlderThan() returns inserted documents not older than provided duration - A', function() {
      timestampsToReturn = [0,100,500];
      database.insert({name: 'Thomas', age:13});
		database.insert({name: 'Daisy', age:42});
		database.insert({name: 'Mike', age:27});
      whenGettingDocumentsNotOlderThanMs(400);
      expect(documents.length).to.be.eql(2);
      expect(documents.map(d => d.name)).to.be.eql(['Daisy','Mike']);
      expect(documents.map(d => d.age)).to.be.eql([42,27]);
      expect(timestamps).to.be.eql([100,500]);
   });

   it('getAllDocumentsNotOlderThan() returns inserted documents not older than provided duration - B', function() {
      timestampsToReturn = [5,6,10];
      database.insert('foo');
		database.insert('bar');
		whenGettingDocumentsNotOlderThanMs(4);
      expect(documents).to.be.eql(['bar']);
      expect(timestamps).to.be.eql([6]);
   });

   it('getAllDocumentsNotOlderThan() returns inserted documents not older than provided duration - C', function() {
      timestampsToReturn = [5,6,10];
      database.insert('foo');
		database.insert('bar');
		whenGettingDocumentsNotOlderThanMs(3);
      expect(documents.length).to.be.eql(0);
      expect(timestamps.length).to.be.eql(0);
   });

   it('getAllDocumentsNotOlderThan() returns oldest document first', function() {
      database.insert('foo');
		database.insert('bar');
		whenGettingDocumentsNotOlderThanMs(DEFAULT_TIMESTAMP);
      expect(documents).to.be.eql(['foo','bar']);
   });

   it('removeAllDocumentsOlderThan() removes old documents - A', function() {
      timestampsToReturn = [1,2,3];
      database.insert('foo');
		database.insert('bar');
      database.insert('qwertz');
      database.removeAllDocumentsOlderThan(1);
		whenGettingDocumentsNotOlderThanMs(1);
      expect(documents).to.be.eql(['bar','qwertz']);
   });

   it('removeAllDocumentsOlderThan() removes old documents - B', function() {
      timestampsToReturn = [1,2,3];
      database.insert('foo');
		database.insert('bar');
      database.insert('qwertz');
      database.removeAllDocumentsOlderThan(1);
		whenGettingDocumentsNotOlderThanMs(0);
      expect(documents).to.be.eql(['qwertz']);
   });

   it('removeAllDocumentsOlderThan() removes old documents - C', function() {
      timestampsToReturn = [1,2,3,10];
      database.insert('foo');
		database.insert('bar');
      database.insert('qwertz');
      database.removeAllDocumentsOlderThan(7);
		whenGettingDocumentsNotOlderThanMs(10);
      expect(documents).to.be.eql(['qwertz']);
   });

   it('the timestamp provided to insert() gets used instead of the current time', function() {
      timestampsToReturn = [1000];
      database.insert('foo', 500);
		database.insert('bar');
      whenGettingDocumentsNotOlderThanMs(300);
      expect(documents).to.be.eql(['bar']);
   });
});  