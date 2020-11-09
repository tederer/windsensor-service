/* global assertNamespace, windsensor */

require('../NamespaceUtils.js');

assertNamespace('windsensor.database');

windsensor.database.Database = function Database() {
   
	var createErrorFor = function createErrorFor(functionName) {
		return new Error('implementation of windsensor.database.Database did not implement the method \"' + functionName + '\"');
	};
	
	this.insert = function insert(document) {
		throw createErrorFor('insert');
	};
	
	/**
	 * getAllDocumentsNotOlderThan returns all documents in an array which are not older than maxAgeInMillis.
	 * Each document is wrapped by an object containing the timestamp (milliseconds since 1.1.1970) of 
	 * the document and the document itself. The timestamp can be accessed via the "timestamp" property, the
	 * document via the "document" property.
	 */
	this.getAllDocumentsNotOlderThan = function getAllDocumentsNotOlderThan(maxAgeInMillis) {
		throw createErrorFor('getAllDocumentsNotOlderThan');
	};
	
	this.removeAllDocumentsOlderThan = function removeAllDocumentsOlderThan(maxAgeInMillis) {
		throw createErrorFor('removeAllDocumentsOlderThan');
	};
};
 