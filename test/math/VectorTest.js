/* global global, windsensor, testing */

require(global.PROJECT_SOURCE_ROOT_PATH + '/math/Vector.js');
require('../Utils.js');

var utils = new testing.Utils();

var vector;

var degrees = function degrees(degreesValue) {
   return degreesValue;
};
   
var givenAVector = function givenAVector(x, y) {
   vector = new windsensor.math.Vector(x, y);
};

var whenTheVectorGetsAdded = function whenTheVectorGetsAdded(x, y) {
   vector = vector.add(new windsensor.math.Vector(x, y));
};

var whenTheVectorGetsNormalized = function whenTheVectorGetsNormalized() {
   vector = vector.normalize();
};

var formatVectorCoordinates = function formatVectorCoordinates(x, y) {
   return 'x = ' + x + ', y = ' + y;
};

var thenTheCoordinatesShouldbe = function thenTheCoordinatesShouldbe(expectedX, expectedY) {
   var actual = formatVectorCoordinates(vector.getX(), vector.getY());
   var expected = formatVectorCoordinates(expectedX, expectedY );
   expect(actual).to.be.eql(expected);
};

var thenTheLengthShouldbe = function thenTheLengthShouldbe(expectedLength) {
   expect(vector.getLength()).to.be.eql(expectedLength);
};

var thenTheDirectionShouldbe = function thenTheDirectionShouldbe(expectedDirection) {
   expect(utils.toDegrees(vector.getDirection())).to.be.eql(expectedDirection);
};

var setup = function setup() {
   vector = undefined;
};

describe('Vector', function() {
	
   beforeEach(setup);
   
   it('the getters return the coordinates - A', function() {
      givenAVector(1, 2);
      thenTheCoordinatesShouldbe(1,2);
   });
   
   it('the getters return the coordinates - B', function() {
      givenAVector(7.5, 0.25);
      thenTheCoordinatesShouldbe(7.5, 0.25);
   });
  
   it('add() adds the coordinates of the vectors - A', function() {
      givenAVector(1, 2);
      whenTheVectorGetsAdded(5, 2);
      thenTheCoordinatesShouldbe(6, 4);
   });
  
   it('add() adds the coordinates of the vectors - B', function() {
      givenAVector(0, 0);
      whenTheVectorGetsAdded(100, 222);
      thenTheCoordinatesShouldbe(100, 222);
   });
  
   it('getLength() returns the length of the vector - A', function() {
      givenAVector(3, 4);
      thenTheLengthShouldbe(5);
   });
  
   it('getLength() returns the length of the vector - B', function() {
      givenAVector(6, 8);
      thenTheLengthShouldbe(10);
   });
  
   it('normalize() returns the normalized vector - A', function() {
      var length = 5;
      givenAVector(3, 4);
      whenTheVectorGetsNormalized();
      thenTheCoordinatesShouldbe(3 / length, 4 / length);
   });
  
   it('normalize() returns the normalized vector - B', function() {
      var length = Math.sqrt(8);
      givenAVector(2, 2);
      whenTheVectorGetsNormalized();
      thenTheCoordinatesShouldbe(2 / length, 2 / length);
   });

   var testcases = [];
   testcases.push({x:  1, y:  0, expected: degrees(  0)});
   testcases.push({x:  0, y:  1, expected: degrees( 90)});
   testcases.push({x: -1, y:  0, expected: degrees(180)});
   testcases.push({x:  0, y: -1, expected: degrees(270)});

   testcases.forEach(testcase => {
      it('getDirection() returns the direction: [x = ' + utils.toFixedLength(testcase.x, 3) + ', y = ' + utils.toFixedLength(testcase.y, 3) + '] -> ' + utils.toFixedLength(testcase.expected, 4) + '°', function() {
         givenAVector(testcase.x, testcase.y);
         thenTheDirectionShouldbe(testcase.expected);
      });
   });
});  