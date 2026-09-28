import { Module } from '@nestjs/common';

import { CashRegisterController } from './cash-register.controller';
import { CashSessionsController } from './cash-sessions.controller';
import { ExpensesController } from './expenses.controller';
import { InvoicesController } from './invoices.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsCashService } from './payments-cash.service';

/**
 * Cash & payments module — payments, invoices, expenses and cash sessions
 * (SPEC §7 `payments-cash`). Registered centrally in `app.module.ts` during
 * the integration phase.
 */
@Module({
  controllers: [
    PaymentsController,
    InvoicesController,
    ExpensesController,
    CashSessionsController,
    CashRegisterController,
  ],
  providers: [PaymentsCashService],
  exports: [PaymentsCashService],
})
export class PaymentsCashModule {}
