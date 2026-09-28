import * as React from 'react';
import { ClientShell } from '@/components/dashboard/client-shell';

/** Route-group layout for the client portal (SPEC §9). */
export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <ClientShell>{children}</ClientShell>;
}
