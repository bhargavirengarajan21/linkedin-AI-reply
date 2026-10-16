// Simulates Chrome: spawns host.js, sends ONE length-prefixed JSON message on
// stdin, decodes the length-prefixed reply on stdout. Usage: node test-host.js [health|generate]
const { spawn } = require('child_process');
const path = require('path');

const mode = process.argv[2] || 'health';
const message = mode === 'generate'
  ? { type: 'generate', model: 'sonnet',
      system: 'You draft short, professional LinkedIn replies. Output only the reply text.',
      user: 'Conversation with Priya (Recruiter):\nPriya: Hi! Are you open to a Senior Java/React role in Chicago, hybrid?\n\nWrite my next message.' }
  : { type: 'health' };

const child = spawn(process.execPath, [path.join(__dirname, 'host.js')], { stdio: ['pipe', 'pipe', 'inherit'] });

const json = Buffer.from(JSON.stringify(message), 'utf8');
const header = Buffer.alloc(4);
header.writeUInt32LE(json.length, 0);
child.stdin.end(Buffer.concat([header, json]));

const chunks = [];
child.stdout.on('data', (d) => chunks.push(d));
child.on('close', () => {
  const buf = Buffer.concat(chunks);
  if (buf.length < 4) { console.error('No framed reply. Raw:', buf.toString()); process.exit(1); }
  const len = buf.readUInt32LE(0);
  console.log('Reply:', buf.slice(4, 4 + len).toString('utf8'));
});
