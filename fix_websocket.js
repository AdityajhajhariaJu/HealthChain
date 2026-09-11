const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const client = createClient('http://localhost', 'abc', {
  global: { fetch: fetch },
  realtime: {
    transport: WebSocket
  }
});
console.log('client created successfully');
