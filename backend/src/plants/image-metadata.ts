/**
 * Removes privacy-sensitive metadata (GPS position, device identifiers, timestamps, thumbnails,
 * free-text comments) from uploaded images before they are stored.
 *
 * - JPEG: whitelist of segments (JFIF, ICC profile, Adobe, image data); every other APPn segment and
 *   comment is dropped. The EXIF orientation is preserved in a minimal EXIF segment so that portrait
 *   photos taken on a phone are still displayed upright.
 * - PNG: textual, EXIF and time chunks are dropped; bytes after IEND are discarded.
 * - WebP: EXIF and XMP chunks are dropped and the VP8X flags are cleared accordingly.
 *
 * The functions only rewrite the container; pixels are never re-encoded.
 */

export class InvalidImageError extends Error {}

export function stripImageMetadata(buffer: Buffer, mime: string): Buffer {
  switch (mime) {
    case 'image/jpeg':
      return stripJpeg(buffer);
    case 'image/png':
      return stripPng(buffer);
    case 'image/webp':
      return stripWebp(buffer);
    default:
      throw new InvalidImageError(`Unsupported image type: ${mime}`);
  }
}

// ---------------------------------------------------------------------------------------- JPEG

const JFIF = Buffer.from('JFIF\0', 'latin1');
const ICC = Buffer.from('ICC_PROFILE\0', 'latin1');
const ADOBE = Buffer.from('Adobe', 'latin1');
const EXIF = Buffer.from('Exif\0\0', 'latin1');

function startsWith(buffer: Buffer, offset: number, prefix: Buffer): boolean {
  return buffer.length >= offset + prefix.length && buffer.subarray(offset, offset + prefix.length).equals(prefix);
}

/** Reads the EXIF Orientation tag (1-8) from the payload of an APP1 "Exif" segment, if present. */
function readExifOrientation(segmentPayload: Buffer): number | null {
  if (!startsWith(segmentPayload, 0, EXIF)) return null;
  const tiff = segmentPayload.subarray(EXIF.length);
  if (tiff.length < 8) return null;
  const order = tiff.toString('latin1', 0, 2);
  if (order !== 'II' && order !== 'MM') return null;
  const little = order === 'II';
  const u16 = (o: number) => (little ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o));
  const u32 = (o: number) => (little ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o));
  if (u16(2) !== 42) return null;
  const ifd = u32(4);
  if (ifd < 8 || ifd + 2 > tiff.length) return null;
  const entries = u16(ifd);
  for (let i = 0; i < entries; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > tiff.length) return null;
    if (u16(entry) === 0x0112 && u16(entry + 2) === 3 && u32(entry + 4) === 1) {
      const value = u16(entry + 8);
      return value >= 1 && value <= 8 ? value : null;
    }
  }
  return null;
}

/** Smallest valid EXIF segment: a single IFD0 entry holding the orientation. */
function buildOrientationSegment(orientation: number): Buffer {
  const tiff = Buffer.alloc(26);
  tiff.write('II', 0, 'latin1');
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4); // offset of IFD0
  tiff.writeUInt16LE(1, 8); // one entry
  tiff.writeUInt16LE(0x0112, 10); // Orientation
  tiff.writeUInt16LE(3, 12); // SHORT
  tiff.writeUInt32LE(1, 14); // count
  tiff.writeUInt16LE(orientation, 18);
  tiff.writeUInt32LE(0, 22); // no next IFD
  const header = Buffer.alloc(4);
  header.writeUInt16BE(0xffe1, 0);
  header.writeUInt16BE(2 + EXIF.length + tiff.length, 2);
  return Buffer.concat([header, EXIF, tiff]);
}

function keepJpegSegment(marker: number, payload: Buffer): boolean {
  if (marker === 0xfe) return false; // comment
  if (marker >= 0xe0 && marker <= 0xef) {
    if (marker === 0xe0) return startsWith(payload, 0, JFIF);
    if (marker === 0xe2) return startsWith(payload, 0, ICC);
    if (marker === 0xee) return startsWith(payload, 0, ADOBE);
    return false; // APP1 (EXIF/XMP), APP13 (IPTC), maker notes, ...
  }
  return true; // quantisation/Huffman tables, frame header, restart interval, ...
}

function stripJpeg(src: Buffer): Buffer {
  if (src.length < 4 || src[0] !== 0xff || src[1] !== 0xd8) throw new InvalidImageError('Not a JPEG file');
  const kept: Buffer[] = [];
  let orientation: number | null = null;
  let pos = 2;
  let finished = false;

  while (pos < src.length && !finished) {
    if (src[pos] !== 0xff) throw new InvalidImageError('Corrupt JPEG: marker expected');
    while (pos < src.length && src[pos] === 0xff) pos++; // fill bytes
    if (pos >= src.length) throw new InvalidImageError('Corrupt JPEG: truncated marker');
    const marker = src[pos];
    pos++;

    if (marker === 0xd9) {
      kept.push(Buffer.from([0xff, 0xd9]));
      finished = true;
    } else if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      kept.push(Buffer.from([0xff, marker]));
    } else {
      if (pos + 2 > src.length) throw new InvalidImageError('Corrupt JPEG: truncated segment');
      const length = src.readUInt16BE(pos);
      if (length < 2 || pos + length > src.length) throw new InvalidImageError('Corrupt JPEG: bad segment length');
      const payload = src.subarray(pos + 2, pos + length);
      if (marker === 0xda) {
        // Start of scan: entropy-coded data follows until the end of the file; copy it untouched.
        kept.push(Buffer.from([0xff, marker]), src.subarray(pos));
        finished = true;
        pos = src.length;
        continue;
      }
      if (marker === 0xe1 && orientation === null) orientation = readExifOrientation(payload);
      if (keepJpegSegment(marker, payload)) kept.push(Buffer.from([0xff, marker]), src.subarray(pos, pos + length));
      pos += length;
    }
  }
  if (!finished) throw new InvalidImageError('Corrupt JPEG: no image data');

  const head: Buffer[] = [Buffer.from([0xff, 0xd8])];
  if (orientation !== null && orientation !== 1) head.push(buildOrientationSegment(orientation));
  return Buffer.concat([...head, ...kept]);
}

// ----------------------------------------------------------------------------------------- PNG

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_DROP = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);

function stripPng(src: Buffer): Buffer {
  if (src.length < 20 || !src.subarray(0, 8).equals(PNG_SIGNATURE)) throw new InvalidImageError('Not a PNG file');
  const kept: Buffer[] = [PNG_SIGNATURE];
  let pos = 8;
  let first = true;
  let sawEnd = false;

  while (pos + 12 <= src.length && !sawEnd) {
    const length = src.readUInt32BE(pos);
    const type = src.toString('latin1', pos + 4, pos + 8);
    const end = pos + 12 + length;
    if (end > src.length) throw new InvalidImageError('Corrupt PNG: truncated chunk');
    if (first && type !== 'IHDR') throw new InvalidImageError('Corrupt PNG: IHDR expected first');
    first = false;
    if (!PNG_DROP.has(type)) kept.push(src.subarray(pos, end));
    if (type === 'IEND') sawEnd = true;
    pos = end;
  }
  if (!sawEnd) throw new InvalidImageError('Corrupt PNG: IEND missing');
  return Buffer.concat(kept);
}

// ---------------------------------------------------------------------------------------- WebP

function stripWebp(src: Buffer): Buffer {
  if (src.length < 20 || src.toString('latin1', 0, 4) !== 'RIFF' || src.toString('latin1', 8, 12) !== 'WEBP') {
    throw new InvalidImageError('Not a WebP file');
  }
  const declared = src.readUInt32LE(4) + 8;
  const limit = Math.min(declared, src.length);
  const chunks: Buffer[] = [];
  let pos = 12;

  while (pos + 8 <= limit) {
    const fourcc = src.toString('latin1', pos, pos + 4);
    const size = src.readUInt32LE(pos + 4);
    const padded = size + (size & 1);
    const end = pos + 8 + padded;
    if (end > limit && pos + 8 + size > limit) throw new InvalidImageError('Corrupt WebP: truncated chunk');
    const chunkEnd = Math.min(end, limit);
    if (fourcc !== 'EXIF' && fourcc !== 'XMP ') {
      const chunk = Buffer.from(src.subarray(pos, chunkEnd));
      if (fourcc === 'VP8X' && size >= 1) chunk[8] = chunk[8] & ~0x0c; // clear EXIF (0x08) and XMP (0x04) flags
      chunks.push(chunk);
    }
    pos = chunkEnd;
  }
  if (chunks.length === 0) throw new InvalidImageError('Corrupt WebP: no chunks');

  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'latin1');
  header.writeUInt32LE(4 + body.length, 4);
  header.write('WEBP', 8, 'latin1');
  return Buffer.concat([header, body]);
}
