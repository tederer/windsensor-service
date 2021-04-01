/* global assertNamespace, windsensor */

require('../NamespaceUtils.js');
require('../logging/LoggingSystem.js');
require('../math/Vector.js');
require('../math/Constants.js');
require('../mapping/SpeedMapper.js');
require('../mapping/DirectionMapper.js');

assertNamespace('windsensor.averaging');

/**
 * database             windsensor.database.Database     the database that contains the sensor data
 * durationInMillis     Number                           the duration in milliseconds for which the average shall get calculated
 * optionalMappers      Object                           an object containing a mapper for speed and another mapper for direction values - required for testing)
 */
windsensor.averaging.Averager = function Averager(database, durationInMillis, optionalMappers) {
    
    var LOGGER = windsensor.logging.LoggingSystem.createLogger('Averager[' + durationInMillis + 'ms]');
    var MILLIS_PER_SECOND = 1000;

    var speedMapper = (optionalMappers === undefined) ? new windsensor.mapping.SpeedMapper() : optionalMappers.speed;
    var directionMapper = (optionalMappers === undefined) ? new windsensor.mapping.DirectionMapper() : optionalMappers.direction;

    var toDegrees = function toDegrees(radians) {
        return radians * windsensor.math.constants.DEGREES_PER_RADIANS;
    };

    var DirectionAverage = function DirectionAverage() {
        var directions = [];
        
        this.add = function add(directionInRadians, speedInKmh) {
            directions.push({x: Math.cos(directionInRadians) * speedInKmh, y: Math.sin(directionInRadians) * speedInKmh});
        };

        this.get = function get() {
            var sum = new windsensor.math.Vector(0, 0);
            directions.forEach(direction => sum = sum.add(new windsensor.math.Vector(direction.x, direction.y)));
            return (sum.getLength() >= 0.5) ? toDegrees(sum.getDirection()) : undefined;
        };
    };

    var SpeedAverage = function SpeedAverage() {
        var speedValues = [];
        
        this.add = function add(speed) {
            speedValues.push(speed);
        };

        this.get = function get() {
            var sum = 0;
            speedValues.forEach(speed => sum += speed);
            return (speedValues.length > 0) ? sum / speedValues.length : undefined;
        };
    };

    var SpeedTrend = function SpeedTrend() {
        var speedValues = [];
        var startTimestamp;

        this.add = function add(speed, timestamp) {
            if (startTimestamp === undefined) {
                startTimestamp = timestamp;
            }
            speedValues.push({speed: speed, duration: timestamp - startTimestamp});
        };

        this.get = function get() {
            var averageSpeed = 0;
            var averageDuration = 0;
            var gradientDividend = 0;
            var gradientDivisor = 0;
            
            speedValues.forEach(value => {
                averageSpeed += value.speed;
                averageDuration += value.duration;
            });
            averageSpeed = averageSpeed / speedValues.length;
            averageDuration = averageDuration / speedValues.length;

            speedValues.forEach(value => {
                var speedDiff     = value.speed - averageSpeed;
                var durationDiff  = value.duration - averageDuration;
                gradientDividend += speedDiff * durationDiff;
                gradientDivisor  += Math.pow(durationDiff, 2);
            });
            
            var gradient = gradientDividend / gradientDivisor;
            var offset = averageSpeed - (gradient * averageDuration);

            return {offset: offset, gradient: gradient * durationInMillis};
        };
    };
    
    /**
     * calculateAverage calculates the current Average and returns an object like ...
     * 
     * 	{
     * 		direction:{
     * 			average:235.2
     * 		},
     * 		speed:{
                    average:10.7,
                    minimum:3.4,
                    max:12.9,
                    linearTrend:{
                        gradient: 2.4,		
                        offset: 13.2
                    }
                }
            }
     * 
     * Units: 
     * 	direction values        degrees
     * 	speed values            km/h
     * 	linear trend gradient   km/h per averaging duration
     * 	linear trend offset     km/h
     * 
     * The direction average will be undefined if the length of the vector sum is below 0.5 km/h.
     * The speed values will be undefined if the database does not contain any processable sensor data. 
     * 
     * The linear speed trend is the best possible straight line that can be laid through this data. 
     * Such a line is described by two values, the gradient and the vertical offset. Mathematically 
     * speaking it would be "f(t) = offset + t * gradient" - t stands for the time passed since the 
     * first sample in the averaging period was received.
     * 
     * For details please have a look at linear_trend.jpg or https://www.crashkurs-statistik.de/einfache-lineare-regression/.
     */
    this.calculateAverage = function calculateAverage() {
        var directionAverage = new DirectionAverage();
        var speedAverage = new SpeedAverage();
        var speedTrend = new SpeedTrend();
        var minimumSpeed;
        var maximumSpeed;
        
        var records = database.getAllDocumentsNotOlderThan(durationInMillis);

        records.forEach(record => {
            var timestampInMillis = record.timestamp;
            var document = record.document;
            if (document.anemometerPulses.length !== document.directionVaneValues.length) {
                LOGGER.logError(() => 'ignoring record because number of anemometerPulses and directionVaneValues differ! record = ' + JSON.stringify(record));
            } else {
                var sampleTimestampInMillis = timestampInMillis - ((document.anemometerPulses.length - 1) * MILLIS_PER_SECOND);
                for (var index = 0; index < document.anemometerPulses.length; index++) {
                    const direction = directionMapper.map(document.directionVaneValues[index]);
                    const speed = speedMapper.map(document.anemometerPulses[index]);
                    LOGGER.logDebug(() => 'adding [direction = ' + direction + 'rad, speed = ' + speed + 'km/h]');
                    directionAverage.add(direction, speed);
                    speedAverage.add(speed);
                    speedTrend.add(speed, sampleTimestampInMillis);
                    minimumSpeed = (minimumSpeed === undefined) ? speed : Math.min(minimumSpeed, speed);
                    maximumSpeed = (maximumSpeed === undefined) ? speed : Math.max(maximumSpeed, speed);
                    sampleTimestampInMillis += MILLIS_PER_SECOND;
                }
            }
        });
        var average = {direction: {average: directionAverage.get()}, speed: {average: speedAverage.get(), minimum: minimumSpeed, maximum: maximumSpeed, trend: speedTrend.get()}};
        LOGGER.logDebug(() => 'calculate average returns ' + JSON.stringify(average));
        return average;
    };
}; 