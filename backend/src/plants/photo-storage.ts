import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { constants } from 'fs';
import { access, mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { isAbsolute, join, resolve } from 'path';

export interface UploadEnv {
  NODE_ENV?: string;
  CANOPYOS_UPLOAD_DIR?: string;
}

/**
 * Directory that holds uploaded photos.
 * - production: CANOPYOS_UPLOAD_DIR is mandatory and must be an absolute path, so that the files live on a
 *   volume the operator chose (and backs up) instead of the ephemeral working directory of the container.
 * - other environments: defaults to ./private-uploads (ignored by git).
 */
export function resolveUploadDir(env: UploadEnv = process.env, cwd: string = process.cwd()): string {
  const configured = env.CANOPYOS_UPLOAD_DIR?.trim();
  if (!configured) {
    if (env.NODE_ENV === 'production') {
      throw new Error('CANOPYOS_UPLOAD_DIR must be set in production (absolute path of a persistent, backed-up volume).');
    }
    return join(cwd, 'private-uploads');
  }
  if (!isAbsolute(configured)) {
    throw new Error(`CANOPYOS_UPLOAD_DIR must be an absolute path (got "${configured}").`);
  }
  return resolve(configured);
}

/** Creates the directory if needed and proves that the process can really write in it. */
export async function ensureWritableDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await access(dir, constants.R_OK | constants.W_OK);
  const probe = join(dir, `.probe-${randomUUID()}`);
  await writeFile(probe, 'ok', { flag: 'wx', mode: 0o600 });
  await unlink(probe);
}

@Injectable()
export class PhotoStorageService implements OnModuleInit {
  private readonly logger = new Logger(PhotoStorageService.name);
  readonly dir: string;

  constructor() {
    this.dir = resolveUploadDir();
  }

  /** Fail at startup, not at the first upload, when the storage is not usable. */
  async onModuleInit(): Promise<void> {
    await ensureWritableDir(this.dir);
    this.logger.log(`Photo storage ready: ${this.dir}`);
  }

  async save(buffer: Buffer, ext: string): Promise<string> {
    await mkdir(this.dir, { recursive: true, mode: 0o700 });
    const fileName = randomUUID() + ext;
    await writeFile(join(this.dir, fileName), buffer, { flag: 'wx', mode: 0o600 });
    return fileName;
  }

  /** Returns null when the file does not exist on disk. */
  async read(fileName: string): Promise<Buffer | null> {
    try {
      return await readFile(join(this.dir, fileName));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async remove(fileName: string): Promise<void> {
    try {
      await unlink(join(this.dir, fileName));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
