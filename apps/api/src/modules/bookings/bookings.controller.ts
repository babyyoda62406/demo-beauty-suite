import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Booking, type WaitlistEntry } from '@prisma/client';

import { type PaginatedResult } from '../../common/pagination.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

import { BookingsService } from './bookings.service';
import {
  AvailabilityQueryDto,
  AvailabilityResponseDto,
} from './dto/availability-query.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateManualBookingDto } from './dto/create-manual-booking.dto';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';
import { CreateWaitlistDto } from './dto/create-waitlist.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { QueryWaitlistDto } from './dto/query-waitlist.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';

/**
 * Agenda / bookings endpoints (SPEC §7). Public entry points (availability,
 * self-booking, waitlist) are `@Public()`; the admin agenda and state
 * transitions require salon staff roles. All handlers are tenant-scoped.
 */
@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Public()
  @Get('availability')
  @ApiOperation({ summary: 'Slots libres para un servicio en un día (reserva sin registro).' })
  @ApiOkResponse({ type: AvailabilityResponseDto })
  availability(@Query() query: AvailabilityQueryDto): Promise<AvailabilityResponseDto> {
    return this.bookingsService.getAvailability(query);
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reserva pública: crea/asocia la clienta y una cita PENDING (source PUBLIC).' })
  createPublic(@Body() dto: CreatePublicBookingDto): Promise<Booking> {
    return this.bookingsService.createPublicBooking(dto);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Post('manual')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Alta manual de cita para una clienta existente (source ADMIN, CONFIRMED).' })
  createManual(@Body() dto: CreateManualBookingDto): Promise<Booking> {
    return this.bookingsService.createManualBooking(dto);
  }

  // Ruta literal antes de las de `:id`: si no, `me` se tomaría por un
  // identificador de cita y la clienta recibiría un 403 en su propio portal.
  @Roles('CLIENT')
  @Get('me')
  @ApiOperation({ summary: 'Citas de la clienta autenticada (su portal).' })
  listMine(
    @CurrentUser('userId') userId: string,
    @Query() query: QueryBookingsDto,
  ): Promise<PaginatedResult<Booking>> {
    return this.bookingsService.listMine(userId, query);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get()
  @ApiOperation({ summary: 'Agenda del salón filtrada por rango, profesional y estado.' })
  list(@Query() query: QueryBookingsDto): Promise<PaginatedResult<Booking>> {
    return this.bookingsService.list(query);
  }

  // --- Waitlist (declared before :id routes to avoid path capture) -----------

  @Public()
  @Post('waitlist')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Añade una clienta a la lista de espera de un servicio.' })
  addToWaitlist(@Body() dto: CreateWaitlistDto): Promise<WaitlistEntry> {
    return this.bookingsService.addToWaitlist(dto);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get('waitlist')
  @ApiOperation({ summary: 'Lista la lista de espera del salón.' })
  listWaitlist(@Query() query: QueryWaitlistDto): Promise<PaginatedResult<WaitlistEntry>> {
    return this.bookingsService.listWaitlist(query);
  }

  // --- Single booking + state transitions ------------------------------------

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una reserva.' })
  findOne(@Param('id') id: string): Promise<Booking> {
    return this.bookingsService.findOne(id);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirma una reserva pendiente.' })
  confirm(@Param('id') id: string): Promise<Booking> {
    return this.bookingsService.confirm(id);
  }

  // La clienta puede cancelar y reprogramar, pero SOLO sus propias citas: se
  // comprueba la propiedad antes de tocar nada (el staff no necesita ese paso).
  @Roles('OWNER', 'MANAGER', 'EMPLOYEE', 'CLIENT')
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancela una reserva pendiente o confirmada.' })
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() user: { userId: string; role: string },
  ): Promise<Booking> {
    if (user.role === 'CLIENT') await this.bookingsService.assertOwnedByUser(id, user.userId);
    return this.bookingsService.cancel(id, dto);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE', 'CLIENT')
  @Patch(':id/reschedule')
  @ApiOperation({ summary: 'Reprograma la fecha/profesional de una reserva.' })
  async reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleBookingDto,
    @CurrentUser() user: { userId: string; role: string },
  ): Promise<Booking> {
    if (user.role === 'CLIENT') await this.bookingsService.assertOwnedByUser(id, user.userId);
    return this.bookingsService.reschedule(id, dto);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Patch(':id/complete')
  @ApiOperation({ summary: 'Completa la cita y registra un sello de fidelización.' })
  complete(@Param('id') id: string): Promise<Booking> {
    return this.bookingsService.complete(id);
  }

  @Roles('OWNER', 'MANAGER', 'EMPLOYEE')
  @Patch(':id/no-show')
  @ApiOperation({ summary: 'Marca la cita como no asistida.' })
  noShow(@Param('id') id: string): Promise<Booking> {
    return this.bookingsService.noShow(id);
  }
}
