import type * as React from 'react';
import type * as ToastPrimitive from '@radix-ui/react-toast';

/** Props accepted by a toast, mirroring the Radix Toast root plus our variant. */
export type ToastProps = React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & {
  variant?: 'default' | 'success' | 'danger';
};

export type ToastActionElement = React.ReactElement<
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>;
