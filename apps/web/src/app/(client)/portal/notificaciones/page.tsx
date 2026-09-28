import * as React from 'react';
import { Bell } from 'lucide-react';
import { PageHeader } from '@/components/common';
import { NotificationsView } from '@/components/portal-b';

/** Feed de notificaciones de la clienta (SPEC §9 — portal clienta). */
export default function PortalNotificacionesPage(): React.JSX.Element {
  return (
    <div>
      <PageHeader
        title="Notificaciones"
        description="Avisos de tus citas, fidelización y novedades del salón."
        icon={<Bell className="size-7" aria-hidden="true" />}
      />
      <NotificationsView />
    </div>
  );
}
