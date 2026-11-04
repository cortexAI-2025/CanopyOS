// Integration tests write uploaded photos to a throwaway directory, never to a real one.
const { mkdtempSync } = require('fs');
const { tmpdir } = require('os');
const { join } = require('path');

process.env.CANOPYOS_UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'canopyos-int-uploads-'));
// Suites other than security.int-spec.ts make many auth calls from one address.
process.env.AUTH_RATE_LIMIT = process.env.AUTH_RATE_LIMIT || '1000';
