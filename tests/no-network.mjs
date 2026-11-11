// Preloaded in test processes AND their Node workers. No real HTTP/WS traffic.
// Tests may replace fetch/WebSocket with explicit doubles, never the real client.
import http from 'node:http';
import https from 'node:https';
import { syncBuiltinESMExports } from 'node:module';

function blocked() {
  throw new Error('Real network disabled in isolated tests. Provide an explicit mock.');
}
globalThis.fetch = blocked;
globalThis.WebSocket = class { constructor() { blocked(); } };
http.request = blocked;
http.get = blocked;
https.request = blocked;
https.get = blocked;
syncBuiltinESMExports();
