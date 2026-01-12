#!/bin/sh
# Start both API server and worker in background
npm run worker &
npm run server
