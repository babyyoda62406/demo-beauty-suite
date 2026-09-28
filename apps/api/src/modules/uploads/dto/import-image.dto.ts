import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, MaxLength } from 'class-validator';

/** Importa a nuestro servidor una imagen alojada en otro sitio. */
export class ImportImageDto {
  @ApiProperty({
    example: 'https://ejemplo.com/foto.jpg',
    description: 'Dirección pública de la imagen. Se descarga y se guarda aquí.',
  })
  @IsString()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { message: 'La dirección no es válida.' })
  @MaxLength(2048)
  url!: string;
}
