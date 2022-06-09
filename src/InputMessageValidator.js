/* global assertNamespace, windsensor */

require('./NamespaceUtils.js');

assertNamespace('windsensor');

windsensor.InputMessageValidator = function InputMessageValidator() {

   var validateAnemometerPulses = function validateAnemometerPulses(pulses) {
      var allValid = true;
      if (Array.isArray(pulses)) {
         pulses.forEach(p => allValid = allValid && (p >= 0 && p <= 255));
      }
      return allValid;
   };

   var validateDirectionVaneValues = function validateDirectionVaneValues(values) {
      var allValid = true;
      if (Array.isArray(values)) {
         values.forEach(v => allValid = allValid && (v >= 0 && v <= 4095));
      }
      return allValid;
   };

/**
 * return true if the provided message is a valid version 1 message, otherwise false
 */
 this.isValidV1Message = function isValidV1Message(message) {
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

/**
* return true if the provided message is a valid version 1 message, otherwise false
*/
this.isValidV2Message = function isValidV2Message(message) {
     return message !== undefined &&
     message.version === '2.0.0' &&
     message.sequenceId !== undefined &&
     message.sequenceId >= 0 &&
     message.sequenceId < 1000 &&
     Array.isArray(message.messages) &&
     message.messages.filter(msg => msg.anemometerPulses.length !== msg.directionVaneValues.length).length === 0 &&
     message.messages.filter(msg => !validateAnemometerPulses(msg.anemometerPulses)).length === 0 &&
     message.messages.filter(msg => !validateDirectionVaneValues(msg.directionVaneValues)).length === 0 &&
     Array.isArray(message.errors);
  };
};