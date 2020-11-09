/* global assertNamespace, windsensor */

require('../NamespaceUtils.js');

assertNamespace('windsensor.math');

var Constants = function Constants() {
   this.FULL_CIRCLE_IN_DEGREES   = 360;
   this.FULL_CIRCLE_IN_RADIANS   = 2 * Math.PI;
   this.DEGREES_PER_RADIANS      = this.FULL_CIRCLE_IN_DEGREES / this.FULL_CIRCLE_IN_RADIANS;
   this.RADIANS_PER_DEGREE       = this.FULL_CIRCLE_IN_RADIANS / this.FULL_CIRCLE_IN_DEGREES;
};

windsensor.math.constants = new Constants();