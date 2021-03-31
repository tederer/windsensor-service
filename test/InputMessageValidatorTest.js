/* global global, windsensor, testing */

require(global.PROJECT_SOURCE_ROOT_PATH + '/InputMessageValidator.js');

var validator;

// {version:"1.0.0", sequenceId:102, anemometerPulses:[0,1,4,2,1], directionVaneValues:[32,38,35,38,39]}
var testcases = [
    {expectedResult: false, input: undefined},
    {expectedResult: false, input: {}},
    
    // missing fields
    {expectedResult: false, input: {sequenceId:102,  anemometerPulses:[0,1,4,2,1], directionVaneValues:[32,38,35,38,39]}},
    {expectedResult: false, input: {version:'1.0.0', anemometerPulses:[0,1,4,2,1], directionVaneValues:[32,38,35,38,39]}},
    {expectedResult: false, input: {version:'1.0.0', sequenceId:102, directionVaneValues:[32,38,35,38,39]}},
    {expectedResult: false, input: {version:'1.0.0', sequenceId:102, anemometerPulses:[0,1,4,2,1]}},

    // invalid version
    {expectedResult: false, input: {version:'0.1.0', sequenceId:102,   anemometerPulses:[0,1,4,2,1], directionVaneValues:[32,38,35,38,39]}},
    {expectedResult: false, input: {version:123,     sequenceId:102,   anemometerPulses:[0,1,4,2,1], directionVaneValues:[32,38,35,38,39]}},

    // invalid sequence ID
    {expectedResult: false, input: {version:'1.0.0', sequenceId:-1,    anemometerPulses:[0,1,4,2,1], directionVaneValues:[32,38,35,38,39]}},
    {expectedResult: false, input: {version:'1.0.0', sequenceId:1000,  anemometerPulses:[0,1,4,2,1], directionVaneValues:[32,38,35,38,39]}},
    {expectedResult: false, input: {version:'1.0.0', sequenceId:'foo', anemometerPulses:[0,1,4,2,1], directionVaneValues:[32,38,35,38,39]}},

    // different number of array elements
    {expectedResult: false, input: {version:'1.0.0', sequenceId:232,    anemometerPulses:[0,1,4,2,1], directionVaneValues:[32,38,35,38]}},
    {expectedResult: false, input: {version:'1.0.0', sequenceId:232,    anemometerPulses:[0,1,4,1],   directionVaneValues:[32,38,35,38,39]}},

    // invalid anemometerPulse values
    {expectedResult: false, input: {version:'1.0.0', sequenceId:232,    anemometerPulses:[-1,1,4,1,1],  directionVaneValues:[32,38,35,38,39]}},
    {expectedResult: false, input: {version:'1.0.0', sequenceId:232,    anemometerPulses:[256,1,4,1,1], directionVaneValues:[32,38,35,38,39]}},
    {expectedResult: false, input: {version:'1.0.0', sequenceId:232,    anemometerPulses:[2,'b',4,1,1], directionVaneValues:[32,38,35,38,39]}},

    // invalid directionVaneValues values
    {expectedResult: false, input: {version:'1.0.0', sequenceId:102,    anemometerPulses:[0,1,4,12,1], directionVaneValues:[32,38,-1,38,39]}},
    {expectedResult: false, input: {version:'1.0.0', sequenceId:102,    anemometerPulses:[0,1,4,12,1], directionVaneValues:[32,38,4096,38,39]}},
    {expectedResult: false, input: {version:'1.0.0', sequenceId:102,    anemometerPulses:[0,1,4,12,1], directionVaneValues:[32,38,'abc',38,39]}},

    {expectedResult: true,  input: {version:'1.0.0', sequenceId:0,      anemometerPulses:[0],          directionVaneValues:[0]}},
    {expectedResult: true,  input: {version:'1.0.0', sequenceId:999,    anemometerPulses:[255],        directionVaneValues:[4095]}},
];

var setup = function setup() {
    validator = new windsensor.InputMessageValidator();
};

describe('InputMessageValidator', function() {
	
    beforeEach(setup);
 
    testcases.forEach(testcase => {
        it((testcase.expectedResult ? 'valid' : 'invalid') + ' message: ' + JSON.stringify(testcase.input), function() {
            expect(validator.validate(testcase.input)).to.be.eql(testcase.expectedResult);
         });
    });
    
}); 