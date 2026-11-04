import { InvalidImageError, stripImageMetadata } from './image-metadata';

const GPS = Buffer.from('GPSLATITUDE-48.8566N');
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function segment(marker: number, payload: Buffer): Buffer {
  const head = Buffer.alloc(4);
  head.writeUInt16BE(0xff00 | marker, 0);
  head.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([head, payload]);
}

function exifPayload(orientation: number): Buffer {
  const tiff = Buffer.alloc(26);
  tiff.write('MM', 0);
  tiff.writeUInt16BE(42, 2);
  tiff.writeUInt32BE(8, 4);
  tiff.writeUInt16BE(1, 8);
  tiff.writeUInt16BE(0x0112, 10);
  tiff.writeUInt16BE(3, 12);
  tiff.writeUInt32BE(1, 14);
  tiff.writeUInt16BE(orientation, 18);
  return Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff, GPS]);
}

function jpeg(...extra: Buffer[]): Buffer {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    ...extra,
    segment(0xdb, Buffer.alloc(65, 1)),
    segment(0xda, Buffer.from([1, 1, 0, 0, 63, 0])),
    Buffer.from([9, 8, 7, 6, 0xff, 0xd9]),
  ]);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)]); // CRC is not checked
}

describe('stripImageMetadata', () => {
  describe('JPEG', () => {
    it('drops EXIF/GPS, comments, XMP and IPTC but keeps image data', () => {
      const dirty = jpeg(
        segment(0xe1, exifPayload(1)),
        segment(0xfe, Buffer.from('secret')),
        segment(0xe1, Buffer.from('http://ns.adobe.com/xap/1.0/\0XMPSECRET')),
        segment(0xed, Buffer.from('Photoshop 3.0\0IPTCSECRET')),
      );
      const clean = stripImageMetadata(dirty, 'image/jpeg');
      for (const needle of [GPS, 'secret', 'XMPSECRET', 'IPTCSECRET']) expect(clean.includes(needle)).toBe(false);
      expect(clean.includes(Buffer.from([9, 8, 7, 6]))).toBe(true);
      expect(clean.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
      expect(clean.length).toBeLessThan(dirty.length);
    });

    it('keeps JFIF, ICC profile and tables', () => {
      const jfif = segment(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1'));
      const icc = segment(0xe2, Buffer.from('ICC_PROFILE\0\x01\x01profile-bytes', 'latin1'));
      const clean = stripImageMetadata(jpeg(jfif, icc), 'image/jpeg');
      expect(clean.includes(Buffer.from('JFIF\0', 'latin1'))).toBe(true);
      expect(clean.includes(Buffer.from('profile-bytes'))).toBe(true);
    });

    it('preserves a non-default orientation in a minimal EXIF segment without GPS', () => {
      const clean = stripImageMetadata(jpeg(segment(0xe1, exifPayload(6))), 'image/jpeg');
      expect(clean.includes(GPS)).toBe(false);
      expect(clean.includes(Buffer.from('Exif\0\0', 'latin1'))).toBe(true);
      expect(clean.readUInt16BE(2)).toBe(0xffe1);
      const tiffAt = clean.indexOf(Buffer.from('Exif\0\0', 'latin1')) + 6;
      expect(clean.toString('latin1', tiffAt, tiffAt + 2)).toBe('II');
      expect(clean.readUInt16LE(tiffAt + 18)).toBe(6);
    });

    it('adds no EXIF at all for the default orientation, and is idempotent', () => {
      const clean = stripImageMetadata(jpeg(segment(0xe1, exifPayload(1))), 'image/jpeg');
      expect(clean.includes(Buffer.from('Exif\0\0', 'latin1'))).toBe(false);
      expect(stripImageMetadata(clean, 'image/jpeg')).toEqual(clean);
      const rotated = stripImageMetadata(jpeg(segment(0xe1, exifPayload(8))), 'image/jpeg');
      expect(stripImageMetadata(rotated, 'image/jpeg')).toEqual(rotated);
    });

    it.each([
      ['not an image', Buffer.from('hello world, definitely not a jpeg')],
      ['signature only', Buffer.from([0xff, 0xd8, 0xff, 0xe1])],
      ['truncated segment', Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.from([0xff, 0xe1, 0x10, 0x00, 1, 2])])],
      ['no image data', Buffer.concat([Buffer.from([0xff, 0xd8]), segment(0xdb, Buffer.alloc(65, 1))])],
    ])('rejects %s', (_name, buffer) => {
      expect(() => stripImageMetadata(buffer, 'image/jpeg')).toThrow(InvalidImageError);
    });
  });

  describe('PNG', () => {
    const insertAfterIhdr = (...chunks: Buffer[]) => Buffer.concat([PNG_1X1.subarray(0, 33), ...chunks, PNG_1X1.subarray(33)]);

    it('leaves a clean PNG byte-for-byte unchanged', () => {
      expect(stripImageMetadata(PNG_1X1, 'image/png')).toEqual(PNG_1X1);
    });

    it('drops text, EXIF and time chunks and anything after IEND', () => {
      const dirty = Buffer.concat([
        insertAfterIhdr(pngChunk('tEXt', Buffer.concat([Buffer.from('Comment\0'), GPS])), pngChunk('eXIf', exifPayload(3)),
          pngChunk('iTXt', Buffer.from('XMP:secret')), pngChunk('tIME', Buffer.alloc(7))),
        Buffer.from('TRAILER'),
      ]);
      const clean = stripImageMetadata(dirty, 'image/png');
      expect(clean).toEqual(PNG_1X1);
    });

    it.each([
      ['wrong signature', Buffer.from('not a png file, long enough to pass the length check')],
      ['truncated', PNG_1X1.subarray(0, 40)],
      ['missing IEND', PNG_1X1.subarray(0, PNG_1X1.length - 12)],
    ])('rejects %s', (_name, buffer) => {
      expect(() => stripImageMetadata(buffer, 'image/png')).toThrow(InvalidImageError);
    });
  });

  describe('WebP', () => {
    const chunk = (id: string, data: Buffer) => {
      const head = Buffer.alloc(8);
      head.write(id, 0, 'latin1');
      head.writeUInt32LE(data.length, 4);
      return Buffer.concat([head, data, data.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)]);
    };
    const riff = (...chunks: Buffer[]) => {
      const body = Buffer.concat([Buffer.from('WEBP'), ...chunks]);
      const head = Buffer.alloc(8);
      head.write('RIFF', 0, 'latin1');
      head.writeUInt32LE(body.length, 4);
      return Buffer.concat([head, body]);
    };
    const vp8x = (flags: number) => { const d = Buffer.alloc(10); d[0] = flags; return chunk('VP8X', d); };
    const image = chunk('VP8 ', Buffer.from([1, 2, 3, 4, 5]));

    it('drops EXIF and XMP chunks, clears their flags and fixes the RIFF size', () => {
      const dirty = riff(vp8x(0x08 | 0x04 | 0x20), image, chunk('EXIF', Buffer.concat([Buffer.from('Exif\0\0'), GPS])), chunk('XMP ', Buffer.from('XMPSECRET')));
      const clean = stripImageMetadata(dirty, 'image/webp');
      expect(clean.includes(GPS)).toBe(false);
      expect(clean.includes(Buffer.from('XMPSECRET'))).toBe(false);
      expect(clean[20] & 0x0c).toBe(0);
      expect(clean[20] & 0x20).toBe(0x20); // unrelated flags survive (ICC)
      expect(clean.readUInt32LE(4) + 8).toBe(clean.length);
      expect(clean.includes(Buffer.from([1, 2, 3, 4, 5]))).toBe(true);
    });

    it('leaves a plain WebP unchanged', () => {
      const plain = riff(image);
      expect(stripImageMetadata(plain, 'image/webp')).toEqual(plain);
    });

    it.each([
      ['wrong signature', Buffer.from('RIFF....WAVEfmt  and some more bytes here')],
      ['truncated chunk', riff(image).subarray(0, 22)],
    ])('rejects %s', (_name, buffer) => {
      expect(() => stripImageMetadata(buffer, 'image/webp')).toThrow(InvalidImageError);
    });
  });

  it('rejects unsupported types such as SVG', () => {
    expect(() => stripImageMetadata(Buffer.from('<svg/>'), 'image/svg+xml')).toThrow(InvalidImageError);
  });
});
