/* global global */
'use strict';

var path = require('path');
var fileSystem = require('fs');

global.PROJECT_ROOT_PATH = path.resolve('.');
global.PROJECT_SOURCE_ROOT_PATH = global.PROJECT_ROOT_PATH + '/src';

module.exports = function(grunt) {

   var jsFiles = ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'];
   
   grunt.initConfig({
      pkg: grunt.file.readJSON('package.json'),

      jshint: {
         allButNotSettings : {
            options: {
               jshintrc: '.jshintrc'
            },
            src: jsFiles,
            filter: function filter(path) { var index = path.indexOf('settings.js'); return index === -1; }
         }
      },

      mochaTest: {
			libRaw: {
			  options: {
				 require: ['./test/testGlobals.js'],
				 reporter: 'spec'
			  },
			  src: ['test/**/*Test.js']
			}
      },
      
            
      clean: [],
   });

   grunt.loadNpmTasks('grunt-contrib-jshint');
   grunt.loadNpmTasks('grunt-mocha-test');
   grunt.loadNpmTasks('grunt-contrib-clean');
	
   grunt.registerTask('lint', ['jshint']);
   grunt.registerTask('test', ['mochaTest:libRaw']);
   
   grunt.registerTask('default', ['lint', 'test']);
 };
