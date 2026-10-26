import {
  BadRequestException, Controller, Get, Param, Post, Request, Res,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PlantsService } from './plants.service';

const uploadDir = process.env.CANOPYOS_UPLOAD_DIR || join(process.cwd(), 'private-uploads');
const MAX_BYTES = 5 * 1024 * 1024;

function detectImage(buffer: Buffer): { mime: string; ext: string } | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return { mime: 'image/png', ext: '.png' };
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255])))
    return { mime: 'image/jpeg', ext: '.jpg' };
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP')
    return { mime: 'image/webp', ext: '.webp' };
  return null;
}

@UseGuards(JwtAuthGuard)
@Controller('plants')
export class PlantPhotosController {
  constructor(private readonly prisma: PrismaService, private readonly plants: PlantsService) {}

  @Post(':id/photos')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: MAX_BYTES, files: 1 } }))
  async upload(@Param('id') id: string, @Request() req: { user: { id: string } },
    @UploadedFile() file?: Express.Multer.File) {
    await this.plants.get(id, req.user.id);
    if (!file?.buffer || file.size > MAX_BYTES) throw new BadRequestException('Image missing or too large');
    const type = detectImage(file.buffer);
    if (!type) throw new BadRequestException('Only JPEG, PNG and WebP images are supported');
    const fileName = randomUUID() + type.ext;
    await mkdir(uploadDir, { recursive: true, mode: 0o700 });
    await writeFile(join(uploadDir, fileName), file.buffer, { flag: 'wx', mode: 0o600 });
    const photo = await this.prisma.plantPhoto.create({ data: { plantId: id, fileName, mimeType: type.mime } });
    return { id: photo.id, url: '/plants/' + id + '/photos/' + photo.id };
  }

  @Get(':id/photos/:photoId')
  async read(@Param('id') id: string, @Param('photoId') photoId: string,
    @Request() req: { user: { id: string } }, @Res() res: Response) {
    await this.plants.get(id, req.user.id);
    const photo = await this.prisma.plantPhoto.findFirst({ where: { id: photoId, plantId: id } });
    if (!photo) throw new BadRequestException('Photo not found');
    const buffer = await readFile(join(uploadDir, photo.fileName));
    res.setHeader('Content-Type', photo.mimeType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(buffer);
  }
}
