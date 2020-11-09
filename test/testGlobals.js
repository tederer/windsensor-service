/* global global, windsensor */
'use strict';

global.expect = require('expect.js');
require(global.PROJECT_SOURCE_ROOT_PATH + '/logging/LoggingSystem.js');

windsensor.logging.LoggingSystem.setMinLogLevel(windsensor.logging.Level.ERROR);
