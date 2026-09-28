'use client';

/**
 * Envoltorio de FullCalendar (v6) para la agenda del salón. Componente cliente
 * puro (APIs de navegador) — se carga con `next/dynamic({ ssr: false })` desde
 * `AgendaView` para evitar errores de SSR.
 *
 * Responsabilidades:
 *   - Pintar las citas coloreadas por profesional (contenido personalizado).
 *   - Drag&drop para reprogramar (→ `onReschedule`).
 *   - Click en hueco vacío → crear cita (`onCreateSlot`).
 *   - Click en cita → abrir detalle (`onSelectBooking`).
 *   - Reportar el rango visible al padre (`onRangeChange`) para cargar datos.
 *
 * La vista y la fecha se controlan por props vía la API imperativa (ref).
 */
import * as React from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import type {
  DatesSetArg,
  DateSelectArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
} from '@fullcalendar/core';

import type { AgendaBooking } from '@/lib/hooks/bookings';
import {
  FC_VIEW,
  UNASSIGNED_COLOR,
  isMutedStatus,
  readableTextColor,
  STATUS_LABEL,
  type AgendaViewId,
} from './agenda-utils';

import './agenda-calendar.css';

export interface AgendaCalendarProps {
  bookings: AgendaBooking[];
  view: AgendaViewId;
  /** Fecha ancla de la vista (día/semana/mes que la contiene). */
  date: Date;
  onRangeChange: (start: Date, end: Date) => void;
  onSelectBooking: (booking: AgendaBooking) => void;
  onCreateSlot: (start: Date, end: Date) => void;
  onReschedule: (bookingId: string, newStart: Date) => void;
}

/** Convierte una cita del dominio en un evento de FullCalendar. */
function toEvent(booking: AgendaBooking): EventInput {
  const color = booking.employee?.color ?? UNASSIGNED_COLOR;
  return {
    id: booking.id,
    start: booking.startAt,
    end: booking.endAt,
    backgroundColor: color,
    borderColor: color,
    textColor: readableTextColor(color),
    editable: !isMutedStatus(booking.status),
    classNames: isMutedStatus(booking.status) ? ['fgd-event-muted'] : [],
    extendedProps: { booking },
  };
}

/** Contenido enriquecido del evento: hora + clienta + servicio. */
function renderEventContent(arg: EventContentArg): React.ReactNode {
  const booking = arg.event.extendedProps.booking as AgendaBooking | undefined;
  if (!booking) return null;
  return (
    <div className="flex flex-col overflow-hidden leading-tight">
      <span className="fgd-event-time">{arg.timeText}</span>
      <span className="fgd-event-title">{booking.client.name}</span>
      <span className="fgd-event-sub">{booking.service.name}</span>
    </div>
  );
}

export default function AgendaCalendar({
  bookings,
  view,
  date,
  onRangeChange,
  onSelectBooking,
  onCreateSlot,
  onReschedule,
}: AgendaCalendarProps): React.JSX.Element {
  const ref = React.useRef<FullCalendar | null>(null);

  const events = React.useMemo(() => bookings.map(toEvent), [bookings]);

  // Sincroniza la vista controlada por props con la API imperativa.
  React.useEffect(() => {
    ref.current?.getApi().changeView(FC_VIEW[view]);
  }, [view]);

  // Sincroniza la fecha ancla.
  React.useEffect(() => {
    ref.current?.getApi().gotoDate(date);
  }, [date]);

  const handleDatesSet = React.useCallback(
    (arg: DatesSetArg) => onRangeChange(arg.start, arg.end),
    [onRangeChange],
  );

  const handleEventClick = React.useCallback(
    (arg: EventClickArg) => {
      const booking = arg.event.extendedProps.booking as AgendaBooking | undefined;
      if (booking) onSelectBooking(booking);
    },
    [onSelectBooking],
  );

  const handleSelect = React.useCallback(
    (arg: DateSelectArg) => {
      onCreateSlot(arg.start, arg.end);
      ref.current?.getApi().unselect();
    },
    [onCreateSlot],
  );

  const handleEventDrop = React.useCallback(
    (arg: EventDropArg) => {
      if (!arg.event.start) {
        arg.revert();
        return;
      }
      onReschedule(arg.event.id, arg.event.start);
    },
    [onReschedule],
  );

  return (
    <div className="fgd-agenda">
      <FullCalendar
        ref={ref}
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView={FC_VIEW[view]}
        initialDate={date}
        locale={esLocale}
        headerToolbar={false}
        height="auto"
        expandRows
        nowIndicator
        firstDay={1}
        allDaySlot={false}
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        slotDuration="00:30:00"
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        dayMaxEvents={3}
        selectable
        selectMirror
        editable
        eventDurationEditable={false}
        droppable={false}
        events={events}
        eventContent={renderEventContent}
        datesSet={handleDatesSet}
        eventClick={handleEventClick}
        select={handleSelect}
        eventDrop={handleEventDrop}
        eventDidMount={(info) => {
          const booking = info.event.extendedProps.booking as AgendaBooking | undefined;
          if (booking) {
            info.el.setAttribute(
              'title',
              `${booking.client.name} · ${booking.service.name} · ${STATUS_LABEL[booking.status]}`,
            );
          }
        }}
      />
    </div>
  );
}
