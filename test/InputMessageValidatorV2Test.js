/* global global, windsensor, testing */

require(global.PROJECT_SOURCE_ROOT_PATH + '/InputMessageValidator.js');

var validator;

// {version:'2.0.0', sequenceId:102, messages:[{anemometerPulses:[0,1,4,2,1], directionVaneValues:[32,38,35,38,39], secondsSincePreviousMessage:0}], errors: []}
var testcases = [
   {expectedResult: false, input: undefined},
   {expectedResult: false, input: {}},
   
   // missing fields
   {expectedResult: false, input: {sequenceId:102, messages:[], errors: []}},
   {expectedResult: false, input: {version:'2.0.0', messages:[], errors: []}},
   {expectedResult: false, input: {version:'2.0.0', sequenceId:102, errors: []}},
   {expectedResult: false, input: {version:'2.0.0', sequenceId:102, messages:[]}},

   // invalid version
   {expectedResult: false, input: {version:'1.0.0', sequenceId:102, messages:[], errors: []}},
   {expectedResult: false, input: {version:2, sequenceId:102, messages:[], errors: []}},

   // invalid sequence ID
   {expectedResult: false, input: {version:'2.0.0', sequenceId:-1, messages:[{anemometerPulses:[0,1,4,2,1], directionVaneValues:[32,38,35,38,39], secondsSincePreviousMessage:0}], errors: []}},
   {expectedResult: false, input: {version:'2.0.0', sequenceId:1000, messages:[{anemometerPulses:[0,1,4,2,1], directionVaneValues:[32,38,35,38,39], secondsSincePreviousMessage:0}], errors: []}},
   {expectedResult: false, input: {version:'2.0.0', sequenceId:'foo', messages:[{anemometerPulses:[0,1,4,2,1], directionVaneValues:[32,38,35,38,39], secondsSincePreviousMessage:0}], errors: []}},

   // messages is not an array
   {expectedResult: false, input: {version:'2.0.0', sequenceId:999, messages:12, errors: []}},
   {expectedResult: false, input: {version:'2.0.0', sequenceId:999, messages:'a message', errors: []}},
   
   // different number of array elements
   {expectedResult: false, input: {version:'2.0.0', sequenceId:102, messages:[{anemometerPulses:[0,1,4,2,1], directionVaneValues:[32,38,35,38],   secondsSincePreviousMessage:0}], errors: []}},
   {expectedResult: false, input: {version:'2.0.0', sequenceId:102, messages:[{anemometerPulses:[0,1,4,2],  directionVaneValues:[32,38,35,38,39], secondsSincePreviousMessage:0}], errors: []}},

   // invalid anemometerPulse values
   {expectedResult: false, input: {version:'2.0.0', sequenceId:102, messages:[{anemometerPulses:[0,-1,4,2,1], directionVaneValues:[32,38,35,38,39], secondsSincePreviousMessage:0}], errors: []}},
   {expectedResult: false, input: {version:'2.0.0', sequenceId:102, messages:[{anemometerPulses:[256,1,4,2,1], directionVaneValues:[32,38,35,38,39], secondsSincePreviousMessage:0}], errors: []}},
   {expectedResult: false, input: {version:'2.0.0', sequenceId:102, messages:[{anemometerPulses:[0,1,4,2,'b'], directionVaneValues:[32,38,35,38,39], secondsSincePreviousMessage:0}], errors: []}},
   
   // invalid directionVaneValues values
   {expectedResult: false, input: {version:'2.0.0', sequenceId:102, messages:[{anemometerPulses:[0,1,4,2,1], directionVaneValues:[32,38,35,-1,39], secondsSincePreviousMessage:0}], errors: []}},
   {expectedResult: false, input: {version:'2.0.0', sequenceId:102, messages:[{anemometerPulses:[0,1,4,2,1], directionVaneValues:[32,4096,35,38,39], secondsSincePreviousMessage:0}], errors: []}},
   {expectedResult: false, input: {version:'2.0.0', sequenceId:102, messages:[{anemometerPulses:[0,1,4,2,1], directionVaneValues:[32,38,35,'foo',39], secondsSincePreviousMessage:0}], errors: []}},
   
   // invalid errors
   {expectedResult: false, input: {version:'2.0.0', sequenceId:987, messages:[{anemometerPulses:[0,1,4,2,1], directionVaneValues:[32,38,35,38,39], secondsSincePreviousMessage:0}], errors: 302}},
   {expectedResult: false, input: {version:'2.0.0', sequenceId:987, messages:[{anemometerPulses:[0,1,4,2,1], directionVaneValues:[32,38,35,38,39], secondsSincePreviousMessage:0}], errors: 'anError'}},
   
   // valid messages
   {expectedResult: true,  input: {version:'2.0.0', sequenceId:987, messages:[{anemometerPulses:[0,1,4,2,1], directionVaneValues:[32,38,35,38,39], secondsSincePreviousMessage:0}], errors: []}},
   {expectedResult: true,  input: {version:'2.0.0', sequenceId:987, messages:[{anemometerPulses:[0,1], directionVaneValues:[32,38], secondsSincePreviousMessage:0}, {anemometerPulses:[2,1], directionVaneValues:[22,20], secondsSincePreviousMessage:62}], errors: ['HTTP_RESPONSE_CODE_302']}},
];

var setup = function setup() {
    validator = new windsensor.InputMessageValidator();
};

describe('InputMessageValidatorV2', function() {
   
   beforeEach(setup);

   testcases.forEach(testcase => {
      it((testcase.expectedResult ? 'valid' : 'invalid') + ' message: ' + JSON.stringify(testcase.input), function() {
         expect(validator.isValidV2Message(testcase.input)).to.be.eql(testcase.expectedResult);
      });
   });
    
}); 