import * as React from 'react';
import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = {
  title: 'Crear cuenta · Estudio Aurora',
};

/** Sign-up page: creates a CLIENT-role account scoped to the resolved tenant. */
export default function RegistroPage(): React.JSX.Element {
  return <RegisterForm />;
}
