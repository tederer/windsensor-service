/* global global, windsensor, testing */

require(global.PROJECT_SOURCE_ROOT_PATH + '/mapping/SpeedMapper.js');
require('../Utils.js');

var utils = new testing.Utils();

var TOLERANCE = 0.001;
var KILOMETERS_PER_MILE = 1.609344;

var setup = function setup() {
};

describe('SpeedMapper', function() {
	
   beforeEach(setup);
   
   var testcases = [
      {input: 0,     expected:  0},
      {input: 1,     expected:  3.621024},
      {input: 23,    expected: 83.283552},
      {input: 60,    expected: 217.26144},
      // invalid values
      {input: - 1,   expected: 0},
      
   ];
   
   testcases.forEach(testcase => {
      it('mapping:  ' + utils.toFixedLength(testcase.input, 6) + ' -> ' + utils.toFixedLength(testcase.expected + ' km/h', 15), function() {
         var mapper = new windsensor.mapping.SpeedMapper();
         var speed = mapper.map(testcase.input);
         var diff = speed - testcase.expected;
         var matches = diff <= TOLERANCE;
         if (!matches) {
            console.log('speed difference ' + diff + ' km/h is greater than max allowed difference (' + TOLERANCE + ' km/h)');
         }
         expect(matches).to.be.eql(true);
      });
   });
});  