/* global assertNamespace, testing, windsensor, global */

require(global.PROJECT_SOURCE_ROOT_PATH + '/NamespaceUtils.js');
require(global.PROJECT_SOURCE_ROOT_PATH + '/math/Constants.js');

assertNamespace('testing');

testing.Utils = function Utils() {
   var FULL_CIRCLE_IN_RADIANS = windsensor.math.constants.FULL_CIRCLE_IN_RADIANS;
   var DEGREES_PER_RADIANS = windsensor.math.constants.DEGREES_PER_RADIANS;
   var RADIANS_PER_DEGREE = windsensor.math.constants.RADIANS_PER_DEGREE;

   /**
    * normalize takes an angle in radians and maps it to { result | 0 <= result < (2 * PI)}
    */
   this.normalize = function normalize(value) {
		while (value > FULL_CIRCLE_IN_RADIANS) {
			value = value - FULL_CIRCLE_IN_RADIANS;
		}
		return value;
	};

   /**
    * calculateShortestDistance takes two angles/directions in radians and returns the shortest 
    * distance between them in radians { result | 0 <= result < (2 * PI)}
    */
   this.calculateShortestDistance = function calculateShortestDistance(direction1, direction2) {
      var diff = Math.abs(this.normalize(direction1) - this.normalize(direction2));
      return (diff <= Math.PI) ? diff : FULL_CIRCLE_IN_RADIANS - diff;
   };

   /**
    * calculateShortestDistanceDegrees takes two angles/directions in degrees and returns the shortest 
    * distance between them in degrees { result | 0 <= result < 360}
    */
   this.calculateShortestDistanceDegrees = function calculateShortestDistanceDegrees(direction1, direction2) {
      var diffInRadians = this.calculateShortestDistance(this.toRadians(direction1), this.toRadians(direction2));
      return this.toDegrees(diffInRadians);
   };

   this.toDegrees = function toDegrees(radians) {
      return radians * DEGREES_PER_RADIANS;
   };

   this.toRadians = function toRadians(degrees) {
      return degrees * RADIANS_PER_DEGREE;
   };

   this.toFixedLength = function toFixedLength(value, expectedLength) {
      var result = value.toString();
      while(result.length < expectedLength) {
         result = ' ' + result;
      }
      return result;
   };   
};