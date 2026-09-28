import * as React from 'react';
import { AdminShell } from '@/components/dashboard/admin-shell';

/** Route-group layout for the salon admin panel (SPEC §9). */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <AdminShell>{children}</AdminShell>;
}
