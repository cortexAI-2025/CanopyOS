/**
 * The backend must refuse to start when JWT_SECRET is missing or blank, instead of
 * silently signing tokens with a well-known default.
 */
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('JWT_SECRET is mandatory', () => {
  const original = process.env.JWT_SECRET;
  afterEach(() => {
    if (original === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original;
  });

  it('refuses to start when JWT_SECRET is not set', async () => {
    delete process.env.JWT_SECRET;
    await expect(Test.createTestingModule({ imports: [AppModule] }).compile()).rejects.toThrow(/JWT_SECRET/);
  });

  it('refuses to start when JWT_SECRET is blank', async () => {
    process.env.JWT_SECRET = '';
    await expect(Test.createTestingModule({ imports: [AppModule] }).compile()).rejects.toThrow();
  });
});
