import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/**
 * Brand button. Uses the magenta scale (SPEC §8). Focus ring is always visible
 * and AA-contrasting. Set `asChild` to render as a link or other element.
 */
export const buttonVariants = cva(
  // Compacto y proporcionado (RONDA 1, pto 5): `inline-flex` ya ajusta el ancho
  // al contenido (nunca estirado salvo que se pase `w-full`, p.ej. en móvil);
  // radio pill coherente y peso semibold (Poppins) para jerarquía clara.
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-sans font-semibold leading-none tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-gradient text-white shadow-soft hover:shadow-glow hover:brightness-105 active:brightness-95',
        secondary:
          'bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200',
        outline:
          'border border-brand-200 bg-transparent text-brand-700 hover:bg-brand-50 active:bg-brand-100',
        // Acento negro elegante que la clienta pidió (RONDA 1, pto 9).
        ink: 'bg-ink text-cream shadow-soft hover:bg-ink/90 active:bg-ink',
        ghost: 'bg-transparent text-ink hover:bg-brand-50 active:bg-brand-100',
        link: 'bg-transparent text-brand-600 underline-offset-4 hover:underline',
        danger: 'bg-danger text-white hover:brightness-105 active:brightness-95',
      },
      size: {
        sm: 'h-9 px-4 text-[0.8rem] [&_svg]:size-4',
        md: 'h-10 px-5 text-sm [&_svg]:size-4',
        lg: 'h-12 px-6 text-[0.95rem] [&_svg]:size-[1.15rem]',
        icon: 'size-10 [&_svg]:size-5',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as the single child element (e.g. an anchor) instead of a button. */
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        // Un <button> sin `type` dentro de un formulario es `submit`: pulsar
        // «Elegir foto» o cualquier acción secundaria de un diálogo enviaría el
        // formulario a medio rellenar. Se declara `button` salvo que se pida otro.
        {...(asChild ? {} : { type: type ?? 'button' })}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
