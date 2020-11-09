/* global assertNamespace, windsensor */

require('../NamespaceUtils.js');

assertNamespace('windsensor.mapping');

/**
 * SpeedMapper maps raw sensor values (integers) to the corresponding speed in km/h.
 */
windsensor.mapping.SpeedMapper = function SpeedMapper() {
   
   var KILOMETERS_PER_MILE = 1.609344;

      /**
       * map takes a raw sensor value (unsigned 16 bit integer) and maps it to km/h { result | 0 <= result }
       */
	this.map = function map(pulsesPerSecond) {
      return pulsesPerSecond * 2.25 * KILOMETERS_PER_MILE;
	};
};
 