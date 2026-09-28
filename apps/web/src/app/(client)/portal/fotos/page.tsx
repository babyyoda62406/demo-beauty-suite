import * as React from 'react';
import { Images } from 'lucide-react';
import { PageHeader } from '@/components/common';
import { PhotoGalleryView } from '@/components/portal-b';

/** Galería de antes/después y diseños (SPEC §9 — portal clienta). */
export default function PortalFotosPage(): React.JSX.Element {
  return (
    <div>
      <PageHeader
        title="Mis fotos"
        description="Tus transformaciones de antes / después y diseños realizados en el salón."
        icon={<Images className="size-7" aria-hidden="true" />}
      />
      <PhotoGalleryView />
    </div>
  );
}
