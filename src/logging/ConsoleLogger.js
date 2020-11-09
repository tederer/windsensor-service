/* global assertNamespace, windsensor */

require('../NamespaceUtils.js');
require('./Logger.js');

assertNamespace('windsensor.logging');

/**
 * ConsoleLogger writes the log output to the console.
 */
windsensor.logging.ConsoleLogger = function ConsoleLogger(name, minLogLevel) {
   
   var MESSAGE_SEPARATOR = ';';
   var logLevel = minLogLevel;

   var formatNumber = function formatNumber(expectedLength, number) {
      var result = number.toString();
      while(result.length < expectedLength) {
         result = '0' + result;
      }
      return result;
   };

   var log = function log(level, messageOrSupplier) {
      if (level.value >= logLevel.value) {
         var timestamp = (new Date()).toISOString();
         var message = typeof messageOrSupplier === 'function' ? messageOrSupplier() : messageOrSupplier;
         console.log([timestamp, name, level.description, message].join(MESSAGE_SEPARATOR));
      }
   };

   this.setMinLogLevel = function setMinLogLevel(minLogLevel) {
      logLevel = minLogLevel;
   };

   this.logDebug = function logDebug(messageOrSupplier) {
      log(windsensor.logging.Level.DEBUG, messageOrSupplier);
   };
	
	this.logInfo = function logInfo(messageOrSupplier) {
      log(windsensor.logging.Level.INFO, messageOrSupplier);
   };
	
	this.logWarning = function logWarning(messageOrSupplier) {
      log(windsensor.logging.Level.WARNING, messageOrSupplier);
   };
	
	this.logError = function logError(messageOrSupplier) {
      log(windsensor.logging.Level.ERROR, messageOrSupplier);
   };
};

windsensor.logging.ConsoleLogger.prototype = new windsensor.logging.Logger();