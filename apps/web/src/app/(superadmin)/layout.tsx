import * as React from 'react';
import { SuperadminShell } from '@/components/dashboard/superadmin-shell';

/** Route-group layout for the platform super-admin (SPEC §9). */
export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <SuperadminShell>{children}</SuperadminShell>;
}
