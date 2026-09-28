import { SetMetadata } from '@nestjs/common';

/** Metadata key flagging a route as public (skips the global JWT guard). */
export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route or controller as publicly accessible without authentication. */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
