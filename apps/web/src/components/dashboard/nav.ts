import type { LucideIcon } from 'lucide-react';

/** A single sidebar navigation entry. */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /**
   * Optional group heading. When an item's `section` differs from the previous
   * item's, a small heading is rendered above it (e.g. "Mi web").
   */
  section?: string;
}

/** Grouping of the shell: brand area label + its nav entries. */
export interface ShellConfig {
  /** Human title shown in the sidebar header (e.g. "Panel del salón"). */
  title: string;
  /** Short badge for the current role/area. */
  badge: string;
  items: NavItem[];
}
