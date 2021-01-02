#!/bin/sh

/home/ioq3srv/ioquake3/ioq3ded.x86_64 "$@" 2>&1 | node pipe.js
