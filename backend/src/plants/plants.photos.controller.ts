import {
  BadRequestException, Controller, Get, NotFoundException, Param, Post, Request, Res,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PlantsService } from './plants.service';
import { InvalidImageError, stripImageMetadata } from './image-metadata';
import { PhotoStorageService } from './photo-storage';

const MAX_BYTES = 5 * 1024 * 1024;

function maxPhotosPerPlant(): number {
  const value = Number(process.env.PHOTOS_MAX_PER_PLANT ?? '50');
  return Number.isInteger(value) && value > 0 ? value : 50;
}

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly plants: PlantsService,
    private readonly storage: PhotoStorageService,
  ) {}

  @Post(':id/photos')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: MAX_BYTES, files: 1 } }))
  async upload(@Param('id') id: string, @Request() req: { user: { id: string } },
    @UploadedFile() file?: Express.Multer.File) {
    await this.plants.get(id, req.user.id);
    if (!file?.buffer || file.size > MAX_BYTES) throw new BadRequestException('Image missing or too large');
    const type = detectImage(file.buffer);
    if (!type) throw new BadRequestException('Only JPEG, PNG and WebP images are supported');
    const count = await this.prisma.plantPhoto.count({ where: { plantId: id } });
    if (count >= maxPhotosPerPlant()) {
      throw new BadRequestException(`Photo limit reached for this plant (${maxPhotosPerPlant()}).`);
    }
    let clean: Buffer;
    try {
      clean = stripImageMetadata(file.buffer, type.mime); // removes GPS position and other metadata
    } catch (error) {
      if (error instanceof InvalidImageError) throw new BadRequestException('Image file is corrupt or unsupported');
      throw error;
    }
    const fileName = await this.storage.save(clean, type.ext);
    let photo;
    try {
      photo = await this.prisma.plantPhoto.create({ data: { plantId: id, fileName, mimeType: type.mime } });
    } catch (error) {
      await this.storage.remove(fileName); // no orphan file when the database write fails
      throw error;
    }
    return { id: photo.id, url: '/plants/' + id + '/photos/' + photo.id };
  }

  @Get(':id/photos')
  async list(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    await this.plants.get(id, req.user.id);
    return this.prisma.plantPhoto.findMany({
      where: { plantId: id }, select: { id: true, createdAt: true },
      orderBy: { createdAt: 'desc' }, take: 100,
    });
  }

  @Get(':id/photos/:photoId')
  async read(@Param('id') id: string, @Param('photoId') photoId: string,
    @Request() req: { user: { id: string } }, @Res() res: Response) {
    await this.plants.get(id, req.user.id);
    const photo = await this.prisma.plantPhoto.findFirst({ where: { id: photoId, plantId: id } });
    if (!photo) throw new NotFoundException('Photo not found');
    const buffer = await this.storage.read(photo.fileName);
    if (!buffer) throw new NotFoundException('Photo file is missing from storage');
    res.setHeader('Content-Type', photo.mimeType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(buffer);
  }
}
