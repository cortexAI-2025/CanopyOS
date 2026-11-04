// Integration tests write uploaded photos to a throwaway directory, never to a real one.
const { mkdtempSync } = require('fs');
const { tmpdir } = require('os');
const { join } = require('path');

process.env.CANOPYOS_UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'canopyos-int-uploads-'));
