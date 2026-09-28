import * as React from 'react';
import { User } from 'lucide-react';
import { PageHeader } from '@/components/common';
import { ProfileFormView } from '@/components/portal-b';

/** Perfil editable de la clienta (SPEC §9 — portal clienta). */
export default function PortalPerfilPage(): React.JSX.Element {
  return (
    <div>
      <PageHeader
        title="Mi perfil"
        description="Tus datos, alergias, preferencias y colores favoritos."
        icon={<User className="size-7" aria-hidden="true" />}
      />
      <ProfileFormView />
    </div>
  );
}
