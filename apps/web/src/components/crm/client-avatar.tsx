import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/utils';
import { mediaUrl } from '@/lib/media';

export interface ClientAvatarProps {
  name: string;
  photoUrl?: string | null | undefined;
  className?: string;
}

/**
 * Avatar de clienta: foto si existe, iniciales de marca como respaldo.
 * Reutiliza el primitivo `Avatar` de @fgd/ui.
 */
export function ClientAvatar({ name, photoUrl, className }: ClientAvatarProps): React.JSX.Element {
  return (
    <Avatar className={cn('size-10', className)}>
      {photoUrl ? <AvatarImage src={mediaUrl(photoUrl)} alt={name} /> : null}
      <AvatarFallback>{initials(name) || '¿?'}</AvatarFallback>
    </Avatar>
  );
}
