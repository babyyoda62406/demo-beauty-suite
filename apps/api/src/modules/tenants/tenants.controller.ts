import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ModuleActivation, Role, Setting, Tenant } from '@prisma/client';

import { type PaginatedResult } from '../../common/pagination.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { type AuthenticatedUser } from '../../auth/auth.types';

import { BrandDto } from './dto/brand.dto';
import { type BrandingResponseDto } from './dto/branding-response.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ListTenantsDto } from './dto/list-tenants.dto';
import { ModuleActivationDto } from './dto/module-activation.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpsertSettingDto } from './dto/upsert-setting.dto';
import { TenantsService } from './tenants.service';

/**
 * Tenants/salons endpoints (SPEC §3, §7). Mounted under the global `/api/v1`
 * prefix. SUPERADMIN manages every salon; OWNER self-serves its own salon via
 * `/tenants/me*`; branding by slug is public for white-label storefronts.
 *
 * Static/self routes (`me`, `public`) are declared before the `:id` params so
 * they are matched literally rather than captured as an id.
 */
@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  // --- SUPERADMIN: collection ------------------------------------------------

  @Post()
  @Roles(Role.SUPERADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea un salón (tenant) con slug y plan.' })
  create(@Body() dto: CreateTenantDto): Promise<Tenant> {
    return this.tenantsService.create(dto);
  }

  @Get()
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Lista paginada de salones (filtros por estado/plan).' })
  list(@Query() query: ListTenantsDto): Promise<PaginatedResult<Tenant>> {
    return this.tenantsService.list(query);
  }

  // --- OWNER: self-service ---------------------------------------------------

  @Get('me')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Devuelve el salón del usuario autenticado.' })
  findOwn(@CurrentUser() user: AuthenticatedUser): Promise<Tenant> {
    return this.tenantsService.findOwn(this.requireTenantId(user));
  }

  @Patch('me/brand')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Actualiza el branding (colores/logo/fuentes) del propio salón.' })
  updateOwnBrand(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BrandDto,
  ): Promise<Tenant> {
    return this.tenantsService.updateBrand(this.requireTenantId(user), dto);
  }

  @Get('me/settings')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Lista los ajustes del propio salón.' })
  listOwnSettings(@CurrentUser() user: AuthenticatedUser): Promise<Setting[]> {
    return this.tenantsService.listSettings(this.requireTenantId(user));
  }

  @Patch('me/settings')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Crea o actualiza un ajuste del propio salón.' })
  upsertOwnSetting(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertSettingDto,
  ): Promise<Setting> {
    return this.tenantsService.upsertSetting(this.requireTenantId(user), dto);
  }

  // --- Public ----------------------------------------------------------------

  @Public()
  @Get('public/:slug/branding')
  @ApiOperation({ summary: 'Branding público mínimo por slug (marca blanca).' })
  publicBranding(@Param('slug') slug: string): Promise<BrandingResponseDto> {
    return this.tenantsService.getPublicBranding(slug);
  }

  // --- SUPERADMIN: single resource -------------------------------------------

  @Get(':id')
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Obtiene un salón por id.' })
  findById(@Param('id') id: string): Promise<Tenant> {
    return this.tenantsService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Actualiza los datos de un salón.' })
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto): Promise<Tenant> {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina un salón y sus datos asociados.' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.tenantsService.remove(id);
  }

  @Patch(':id/brand')
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Actualiza el branding de un salón.' })
  updateBrand(@Param('id') id: string, @Body() dto: BrandDto): Promise<Tenant> {
    return this.tenantsService.updateBrand(id, dto);
  }

  @Get(':id/modules')
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Lista los módulos activados de un salón.' })
  listModules(@Param('id') id: string): Promise<ModuleActivation[]> {
    return this.tenantsService.listModules(id);
  }

  @Put(':id/modules')
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Activa o desactiva un módulo de un salón.' })
  setModule(
    @Param('id') id: string,
    @Body() dto: ModuleActivationDto,
  ): Promise<ModuleActivation> {
    return this.tenantsService.setModuleActivation(id, dto);
  }

  // --- helpers ---------------------------------------------------------------

  /** Resolves the caller's own tenant id or rejects platform-scoped users. */
  private requireTenantId(user: AuthenticatedUser): string {
    if (!user.tenantId) {
      throw new ForbiddenException('El usuario no está asociado a ningún salón');
    }
    return user.tenantId;
  }
}
