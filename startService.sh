#!/bin/sh

scriptDir=$(cd $(dirname $0) && pwd)
cd $scriptDir
node src/Webserver.js
