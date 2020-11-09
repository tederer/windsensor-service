#!/bin/bash

scriptDir=$(cd $(dirname $0) && pwd)
cd $scriptDir

./node_modules/grunt/node_modules/.bin/grunt
