import * as React from 'react';
import { BrandLoader } from '@/components/ui/brand-loader';

/** Loader de marca para la web pública (App Router, grupo marketing). */
export default function MarketingLoading(): React.JSX.Element {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream px-6">
      <BrandLoader fullScreen />
    </div>
  );
}
