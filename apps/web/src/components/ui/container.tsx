import * as React from 'react';
import { cn } from '@/lib/utils';

type ContainerProps<T extends React.ElementType> = {
  as?: T;
  className?: string;
  children?: React.ReactNode;
};

/** Centered, max-width content wrapper with responsive gutters. */
export function Container<T extends React.ElementType = 'div'>({
  as,
  className,
  children,
}: ContainerProps<T>): React.JSX.Element {
  const Component = (as ?? 'div') as React.ElementType;
  return (
    <Component className={cn('mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8', className)}>
      {children}
    </Component>
  );
}
