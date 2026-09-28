import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Response } from 'express';
import { diskStorage } from 'multer';

import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

import { ImportImageDto } from './dto/import-image.dto';
import { UploadsService } from './uploads.service';
import { resolveUploadDir } from './uploads.util';

/** Tipos de imagen aceptados (SPEC §9 — CMS de la clienta). */
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
/** Tamaño máximo por fichero (~8 MB). */
const MAX_FILE_SIZE = 8 * 1024 * 1024;
/** Nombres de fichero seguros: sin `/`, sin `..`, solo caracteres inocuos. */
const SAFE_FILENAME = /^[A-Za-z0-9._-]+$/;

/**
 * Subida y servido de imágenes para el CMS. La subida está restringida a
 * OWNER/MANAGER; el servido es público (la web pública muestra las fotos). Los
 * ficheros se guardan en disco (volumen `UPLOAD_DIR`) con nombre único, y la
 * respuesta devuelve una URL relativa (`/uploads/<fichero>`), sin dominio.
 */
@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Roles('OWNER', 'MANAGER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Sube una imagen (campo "file"). Devuelve la URL relativa.' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, resolveUploadDir());
        },
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME.has(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Formato no permitido: usa JPEG, PNG o WebP.'), false);
        }
      },
    }),
  )
  upload(@UploadedFile() file?: Express.Multer.File): { url: string } {
    if (!file) {
      throw new BadRequestException('Falta el fichero en el campo "file".');
    }
    return { url: `/uploads/${file.filename}` };
  }

  @Roles('OWNER', 'MANAGER')
  @Post('from-url')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Importa una imagen desde una dirección de Internet y la guarda aquí.',
  })
  importFromUrl(@Body() dto: ImportImageDto): Promise<{ url: string; mime: string; bytes: number }> {
    return this.uploads.importFromUrl(dto.url);
  }

  @Public()
  @Get(':filename')
  @ApiOperation({ summary: 'Sirve una imagen subida (web pública).' })
  serve(@Param('filename') filename: string, @Res() res: Response): void {
    // Rechaza cualquier nombre que pueda escapar del directorio de subidas.
    if (!SAFE_FILENAME.test(filename) || filename.includes('..')) {
      throw new NotFoundException('Imagen no encontrada');
    }
    const dir = resolveUploadDir();
    const fullPath = normalize(join(dir, filename));
    if (fullPath !== join(dir, filename) || !fullPath.startsWith(dir + sep)) {
      throw new NotFoundException('Imagen no encontrada');
    }
    if (!existsSync(fullPath)) {
      throw new NotFoundException('Imagen no encontrada');
    }
    // `sendFile` fija el Content-Type según la extensión del fichero.
    res.sendFile(fullPath);
  }
}
