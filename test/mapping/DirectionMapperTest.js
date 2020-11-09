/* global global, windsensor, testing */

require(global.PROJECT_SOURCE_ROOT_PATH + '/mapping/DirectionMapper.js');
require('../Utils.js');

var utils = new testing.Utils();

var degrees = function degrees(value) {
   return value;
};

var MIN_VALUE = 0;
var MAX_VALUE = 4095; // 12 bits

var setup = function setup() {
};

describe('DirectionMapper', function() {
	
   beforeEach(setup);
   
   var testcases = [
      {input: MIN_VALUE,                      expected: degrees(  0)},
      {input: Math.floor(0.25 * MAX_VALUE),   expected: degrees( 90)},
      {input: Math.floor(0.5  * MAX_VALUE),   expected: degrees(180)},
      {input: Math.floor(0.75 * MAX_VALUE),   expected: degrees(270)},
      {input: MAX_VALUE,                      expected: degrees(  0)},
      // invalid values
      {input: MIN_VALUE - 1,                  expected: degrees(  0)},
      {input: MAX_VALUE + 1,                  expected: degrees(  0)}
      
   ];
   
   testcases.forEach(testcase => {
      it('mapping:  ' + utils.toFixedLength(testcase.input, 6) + ' -> ' + utils.toFixedLength(testcase.expected + '°', 6), function() {
         var mapper = new windsensor.mapping.DirectionMapper();
         var direction = mapper.map(testcase.input);
         var diffInDegrees = utils.calculateShortestDistanceDegrees(utils.toDegrees(direction), testcase.expected);
         expect(diffInDegrees).to.be.lessThan(degrees(0.1));
      });
   });
});  