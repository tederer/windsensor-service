/* global assertNamespace, windsensor */

require('../NamespaceUtils.js');
require('../math/Constants.js');

assertNamespace('windsensor.mapping');

/**
 * DirectionMapper maps raw sensor values (integers) to the corresponding direction in radians.
 */
windsensor.mapping.DirectionMapper = function DirectionMapper() {
	
	var MIN_VALUE = 0;
	var MAX_VALUE = 4095; // 12 bits
	var FULL_CIRCLE_IN_RADIANS = windsensor.math.constants.FULL_CIRCLE_IN_RADIANS;

	var normalize = function normalize(value) {
		while (value > FULL_CIRCLE_IN_RADIANS) {
			value = value - FULL_CIRCLE_IN_RADIANS;
		}
		return value;
	};

	/**
	 * map takes a raw sensor value (unsigned 12 bit integer) and maps it to radians { result | 0 <= result < (2 * PI) }
	 */
	this.map = function map(rawValue) {
		rawValue = Math.min(MAX_VALUE, Math.max(MIN_VALUE, rawValue));
		return (rawValue / MAX_VALUE * FULL_CIRCLE_IN_RADIANS) % FULL_CIRCLE_IN_RADIANS;
	};
};
 