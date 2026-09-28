import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Client, type ClientPhoto } from '@prisma/client';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PaginationDto, type PaginatedResult } from '../../common/pagination.dto';
import { TenantId } from '../../tenancy/decorators';

import {
  ClientsService,
  type ClientWithHistory,
  type UpcomingBirthday,
} from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { CreateClientPhotoDto } from './dto/create-client-photo.dto';
import { UpcomingBirthdaysDto } from './dto/upcoming-birthdays.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateNotesDto } from './dto/update-notes.dto';

/**
 * CRM of clients (clientas). All routes are tenant-scoped (SPEC §3). Reads are
 * open to `EMPLOYEE` and above; writes require `MANAGER` or above (SPEC §4/§7).
 * `SUPERADMIN` is always allowed by the global `RolesGuard`.
 */
@ApiTags('clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  // --- Portal de la clienta (rutas literales antes de las que llevan `:id`,
  //     o `me` se interpretaría como un identificador y daría 403) -----------

  @Roles('CLIENT')
  @Get('me')
  @ApiOperation({ summary: 'Ficha de la clienta autenticada (su portal).' })
  findMine(
    @TenantId() tenantId: string | null,
    @CurrentUser('userId') userId: string,
  ): Promise<Client> {
    return this.clients.findMine(this.requireTenant(tenantId), userId);
  }

  @Roles('CLIENT')
  @Patch('me')
  @ApiOperation({ summary: 'La clienta actualiza sus propios datos de contacto.' })
  updateMine(
    @TenantId() tenantId: string | null,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateClientDto,
  ): Promise<Client> {
    return this.clients.updateMine(this.requireTenant(tenantId), userId, dto);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get()
  @ApiOperation({ summary: 'Lista paginada de clientas con búsqueda por nombre/teléfono/email.' })
  list(
    @TenantId() tenantId: string | null,
    @Query() query: PaginationDto,
  ): Promise<PaginatedResult<Client>> {
    return this.clients.list(this.requireTenant(tenantId), query);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get('upcoming-birthdays')
  @ApiOperation({ summary: 'Cumpleaños próximos de clientas dentro de la ventana indicada.' })
  upcomingBirthdays(
    @TenantId() tenantId: string | null,
    @Query() query: UpcomingBirthdaysDto,
  ): Promise<UpcomingBirthday[]> {
    return this.clients.upcomingBirthdays(this.requireTenant(tenantId), query.days);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get(':id')
  @ApiOperation({ summary: 'Ficha completa de la clienta con historial (fotos, citas, pagos).' })
  get(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
  ): Promise<ClientWithHistory> {
    return this.clients.findOne(this.requireTenant(tenantId), id);
  }

  @Roles('OWNER', 'MANAGER')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea una clienta.' })
  create(@TenantId() tenantId: string | null, @Body() dto: CreateClientDto): Promise<Client> {
    return this.clients.create(this.requireTenant(tenantId), dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza los datos de una clienta.' })
  update(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ): Promise<Client> {
    return this.clients.update(this.requireTenant(tenantId), id, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id/notes')
  @ApiOperation({ summary: 'Establece o limpia las notas privadas de la clienta.' })
  updateNotes(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateNotesDto,
  ): Promise<Client> {
    return this.clients.updateNotes(this.requireTenant(tenantId), id, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Post(':id/photos')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Añade una foto (antes/después/diseño) a la ficha de la clienta.' })
  addPhoto(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: CreateClientPhotoDto,
  ): Promise<ClientPhoto> {
    return this.clients.addPhoto(this.requireTenant(tenantId), id, dto);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina una clienta.' })
  async remove(@TenantId() tenantId: string | null, @Param('id') id: string): Promise<void> {
    await this.clients.remove(this.requireTenant(tenantId), id);
  }

  /** Ensures a tenant was resolved for the request. */
  private requireTenant(tenantId: string | null): string {
    if (!tenantId) {
      throw new BadRequestException('No se ha podido resolver el salón (tenant)');
    }
    return tenantId;
  }
}
