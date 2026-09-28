import * as React from 'react';
import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata: Metadata = {
  title: 'Recuperar contraseña · Estudio Aurora',
};

/** Password-recovery request page. */
export default function RecuperarPage(): React.JSX.Element {
  return <ForgotPasswordForm />;
}
