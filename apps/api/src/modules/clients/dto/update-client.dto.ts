import { PartialType } from '@nestjs/swagger';

import { CreateClientDto } from './create-client.dto';

/** Partial payload to update a client (all fields optional). */
export class UpdateClientDto extends PartialType(CreateClientDto) {}
