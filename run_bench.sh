#!/bin/bash
node artifacts/liquid-mobile/server/serve.js > /dev/null &
SERVER_PID=$!
sleep 1
echo "Running baseline benchmark for manifest..."
autocannon -c 100 -d 10 http://localhost:3000/manifest -H "expo-platform: ios"
kill $SERVER_PID
