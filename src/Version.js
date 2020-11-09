/* global assertNamespace, windsensor */

assertNamespace('windsensor');

var fs = require('fs');
   
windsensor.getVersion = function getVersion() {
    var result;
    try {
        var fileContent = fs.readFileSync('./package.json', 'utf8');
        var packageJson = JSON.parse(fileContent);
        result = packageJson.version;
    } catch(e) {
        result = e;
    }
    return result;
};