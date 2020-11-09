/* global assertNamespace, windsensor */

require('../NamespaceUtils.js');
require('./Averager.js');

assertNamespace('windsensor.averaging');

windsensor.averaging.Factory = {
   MILLIS_PER_SECOND: 1000,

   create1minAverager: function create1minAverager(database) {
      return new windsensor.averaging.Averager(database, 60 * this.MILLIS_PER_SECOND);
   },

   create10minAverager: function create10minAverager(database) {
      return new windsensor.averaging.Averager(database, 600 * this.MILLIS_PER_SECOND);
   }
};
 