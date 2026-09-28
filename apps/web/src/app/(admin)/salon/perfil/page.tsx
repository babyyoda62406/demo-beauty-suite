'use client';

import * as React from 'react';
import { KeyRound, Loader2, UserCircle } from 'lucide-react';
import { Button, Input, Label, toast } from '@/components/ui';
import { ErrorState, ImageUpload, PageHeader } from '@/components/common';
import {
  useChangePassword,
  useCurrentUser,
  useUpdateProfile,
  ApiClientError,
} from '@/lib/hooks/use-api';

/**
 * Mi perfil: la cuenta de quien ha iniciado sesión.
 *
 * Es de la persona, no del salón —los datos del negocio están en Ajustes—, así
 * que aquí solo hay nombre, teléfono, foto y contraseña.
 */
export default function PerfilPage(): React.JSX.Element {
  const { data: yo, isLoading, error, refetch } = useCurrentUser();
  const actualizar = useUpdateProfile();
  const cambiarPassword = useChangePassword();

  const [nombre, setNombre] = React.useState('');
  const [telefono, setTelefono] = React.useState('');
  const [foto, setFoto] = React.useState('');
  const [actual, setActual] = React.useState('');
  const [nueva, setNueva] = React.useState('');
  const [repetida, setRepetida] = React.useState('');

  // Al llegar los datos se rellenan los campos una vez; después manda lo que
  // esté escribiendo, para no pisarle el texto a media edición.
  React.useEffect(() => {
    if (!yo) return;
    setNombre(yo.name);
    setTelefono(yo.phone ?? '');
    setFoto(yo.photoUrl ?? '');
  }, [yo]);

  const guardarDatos = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    try {
      await actualizar.mutateAsync({ name: nombre, phone: telefono, photoUrl: foto });
      toast({ title: 'Perfil actualizado', variant: 'success' });
    } catch (err) {
      toast({
        title: 'No se ha podido guardar',
        description: err instanceof ApiClientError ? err.message : undefined,
        variant: 'danger',
      });
    }
  };

  const guardarPassword = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (nueva !== repetida) {
      toast({ title: 'Las contraseñas nuevas no coinciden', variant: 'danger' });
      return;
    }
    try {
      await cambiarPassword.mutateAsync({ currentPassword: actual, newPassword: nueva });
      setActual('');
      setNueva('');
      setRepetida('');
      toast({
        title: 'Contraseña cambiada',
        description: 'Se han cerrado las sesiones abiertas en otros dispositivos.',
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'No se ha podido cambiar',
        description: err instanceof ApiClientError ? err.message : undefined,
        variant: 'danger',
      });
    }
  };

  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi perfil"
        description="Tus datos de acceso y tu foto. Los datos del salón están en Ajustes."
        icon={<UserCircle className="size-6" aria-hidden="true" />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={guardarDatos}
          className="space-y-5 rounded-2xl border border-brand-100/70 bg-white p-6 shadow-card"
        >
          <ImageUpload label="Foto" aspect="square" value={foto} onChange={setFoto} />

          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              type="tel"
              autoComplete="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="correo">Correo</Label>
            <Input id="correo" value={yo?.email ?? ''} disabled readOnly />
            <p className="text-xs text-ink-soft/70">
              El correo es tu usuario para entrar; para cambiarlo, escríbenos.
            </p>
          </div>

          <Button type="submit" disabled={actualizar.isPending || isLoading}>
            {actualizar.isPending ? <Loader2 className="animate-spin" /> : null}
            Guardar cambios
          </Button>
        </form>

        <form
          onSubmit={guardarPassword}
          className="h-fit space-y-5 rounded-2xl border border-brand-100/70 bg-white p-6 shadow-card"
        >
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-brand-500" aria-hidden="true" />
            <h2 className="font-serif text-lg font-semibold text-ink">Cambiar contraseña</h2>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="actual">Contraseña actual</Label>
            <Input
              id="actual"
              type="password"
              autoComplete="current-password"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nueva">Contraseña nueva</Label>
            <Input
              id="nueva"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              required
            />
            <p className="text-xs text-ink-soft/70">Mínimo 8 caracteres.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="repetida">Repite la nueva</Label>
            <Input
              id="repetida"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
              required
            />
          </div>

          <p className="text-xs text-ink-soft/70">
            Al cambiarla se cerrarán las sesiones abiertas en otros dispositivos.
          </p>

          <Button type="submit" variant="outline" disabled={cambiarPassword.isPending}>
            {cambiarPassword.isPending ? <Loader2 className="animate-spin" /> : null}
            Cambiar contraseña
          </Button>
        </form>
      </div>
    </div>
  );
}
