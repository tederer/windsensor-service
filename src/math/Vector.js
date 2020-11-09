/* global assertNamespace, windsensor */

require('../NamespaceUtils.js');
require('../math/Constants.js');

assertNamespace('windsensor.math');

windsensor.math.Vector = function Vector(x, y) {

   var FULL_CIRCLE_IN_RADIANS = windsensor.math.constants.FULL_CIRCLE_IN_RADIANS;

   this.add = function add(otherVector) {
      return new Vector(x + otherVector.getX(), y + otherVector.getY());
   };

   /**
    * normalize returns a scaled version of this vector whose length is 1.
    */
   this.normalize = function normalize() {
      return new Vector(x / this.getLength(), y / this.getLength());
   };

   this.getLength = function getLength() {
      return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
   };

   /**
    * getDirection returns the direction (in radians) this vector points to.
    * 
    * range:   {x | 0 <= x < (2 * Math.PI)}
    */
   this.getDirection = function getDirection() {
      var normalized = this.normalize();
      var direction = Math.atan2(normalized.getY(), normalized.getX());
      if (direction < 0) {
         direction = FULL_CIRCLE_IN_RADIANS + direction;
      }
      return direction;
   };

   this.getX = function getX() {
      return x;
   };

   this.getY = function getY() {
      return y;
   };
};