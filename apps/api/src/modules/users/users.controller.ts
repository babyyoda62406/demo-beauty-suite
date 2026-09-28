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
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../auth/decorators/roles.decorator';
import { TenantId } from '../../tenancy/decorators';
import { type PaginatedResult } from '../../common/pagination.dto';

import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { type PublicUser, UsersService } from './users.service';

/**
 * Staff account management (SPEC §7 — `users`). Restricted to tenant admins
 * (`OWNER`/`MANAGER`); `SUPERADMIN` is additionally allowed by `RolesGuard`.
 * Every action is scoped to the caller's tenant. Mounted under `/api/v1/users`.
 */
@ApiTags('users')
@Roles('OWNER', 'MANAGER')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea una cuenta de staff en el salón.' })
  @ApiOkResponse({ type: UserResponseDto })
  create(
    @TenantId() tenantId: string | null,
    @Body() dto: CreateUserDto,
  ): Promise<PublicUser> {
    return this.usersService.create(this.requireTenant(tenantId), dto);
  }

  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invita a un miembro del staff (estado INVITED).' })
  @ApiOkResponse({ type: UserResponseDto })
  invite(
    @TenantId() tenantId: string | null,
    @Body() dto: InviteUserDto,
  ): Promise<PublicUser> {
    return this.usersService.invite(this.requireTenant(tenantId), dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista paginada de usuarios del salón (búsqueda + filtros).' })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  findAll(
    @TenantId() tenantId: string | null,
    @Query() query: ListUsersQueryDto,
  ): Promise<PaginatedResult<PublicUser>> {
    return this.usersService.findAll(this.requireTenant(tenantId), query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un usuario del salón por id.' })
  @ApiOkResponse({ type: UserResponseDto })
  findOne(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
  ): Promise<PublicUser> {
    return this.usersService.findOne(this.requireTenant(tenantId), id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza los datos de un usuario del salón.' })
  @ApiOkResponse({ type: UserResponseDto })
  update(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<PublicUser> {
    return this.usersService.update(this.requireTenant(tenantId), id, dto);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Asigna un rol al usuario (no admite SUPERADMIN).' })
  @ApiOkResponse({ type: UserResponseDto })
  assignRole(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
  ): Promise<PublicUser> {
    return this.usersService.assignRole(this.requireTenant(tenantId), id, dto.role);
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activa (habilita) la cuenta del usuario.' })
  @ApiOkResponse({ type: UserResponseDto })
  activate(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
  ): Promise<PublicUser> {
    return this.usersService.activate(this.requireTenant(tenantId), id);
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactiva (suspende) la cuenta y revoca sus sesiones.' })
  @ApiOkResponse({ type: UserResponseDto })
  deactivate(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
  ): Promise<PublicUser> {
    return this.usersService.deactivate(this.requireTenant(tenantId), id);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restablece la contraseña del usuario y revoca sus sesiones.' })
  @ApiOkResponse({ type: UserResponseDto })
  resetPassword(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<PublicUser> {
    return this.usersService.resetPassword(this.requireTenant(tenantId), id, dto.password);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina una cuenta de staff del salón.' })
  async remove(
    @TenantId() tenantId: string | null,
    @Param('id') id: string,
  ): Promise<void> {
    await this.usersService.remove(this.requireTenant(tenantId), id);
  }

  /**
   * Guards against a tenant-less context reaching a tenant-scoped operation
   * (e.g. a platform SUPERADMIN without an impersonated tenant selected).
   */
  private requireTenant(tenantId: string | null): string {
    if (!tenantId) {
      throw new BadRequestException('No se ha resuelto un salón (tenant) para la petición');
    }
    return tenantId;
  }
}
