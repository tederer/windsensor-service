/* global assertNamespace, windsensor */

require('./NamespaceUtils.js');

assertNamespace('windsensor');

windsensor.InputMessageValidator = function InputMessageValidator() {

    var validateAnemometerPulses = function validateAnemometerPulses(pulses) {
        var allValid = true;
        pulses.forEach(p => allValid = allValid && (p >= 0 && p <= 255));
        return allValid;
    };

    var validateDirectionVaneValues = function validateDirectionVaneValues(values) {
        var allValid = true;
        values.forEach(v => allValid = allValid && (v >= 0 && v <= 4095));
        return allValid;
    };

    /**
    * return true if the provided message is valid, otherwise false
    */
	this.validate = function validate(message) {
        return message !== undefined &&
        message.version === '1.0.0' &&
        message.sequenceId !== undefined &&
        message.sequenceId >= 0 &&
        message.sequenceId < 1000 &&
        message.anemometerPulses !== undefined &&
        message.directionVaneValues !== undefined &&
        message.anemometerPulses.length === message.directionVaneValues.length &&
        validateAnemometerPulses(message.anemometerPulses) &&
        validateDirectionVaneValues(message.directionVaneValues);
    };
};