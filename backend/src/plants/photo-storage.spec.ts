import { mkdtemp, readdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { ensureWritableDir, resolveUploadDir } from './photo-storage';

describe('photo storage location', () => {
  it('defaults to ./private-uploads outside production', () => {
    expect(resolveUploadDir({ NODE_ENV: 'development' }, '/srv/app')).toBe(join('/srv/app', 'private-uploads'));
  });

  it('is mandatory in production', () => {
    expect(() => resolveUploadDir({ NODE_ENV: 'production' }, '/srv/app')).toThrow(/CANOPYOS_UPLOAD_DIR/);
  });

  it('requires an absolute path', () => {
    expect(() => resolveUploadDir({ CANOPYOS_UPLOAD_DIR: 'relative/dir' })).toThrow(/absolute/);
    expect(resolveUploadDir({ NODE_ENV: 'production', CANOPYOS_UPLOAD_DIR: '/var/lib/canopyos/photos' })).toBe('/var/lib/canopyos/photos');
  });

  it('creates the directory, proves it is writable and leaves no probe file behind', async () => {
    const root = await mkdtemp(join(tmpdir(), 'canopyos-storage-spec-'));
    try {
      const dir = join(root, 'nested', 'photos');
      await ensureWritableDir(dir);
      expect(await readdir(dir)).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
