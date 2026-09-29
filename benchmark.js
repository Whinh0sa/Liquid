const autocannon = require('autocannon');
const { spawn } = require('child_process');

async function runBenchmark() {
  const server = spawn('node', ['artifacts/liquid-mobile/server/serve.js']);

  // wait for server to start
  await new Promise(r => setTimeout(r, 1000));

  const instance = autocannon({
    url: 'http://localhost:3000/manifest',
    headers: { 'expo-platform': 'ios' },
    connections: 100,
    duration: 10
  });

  autocannon.track(instance);

  instance.on('done', (result) => {
    server.kill();
    console.log(`Requests per second: ${result.requests.average}`);
    console.log(`Latency average: ${result.latency.average} ms`);
  });
}

runBenchmark();
