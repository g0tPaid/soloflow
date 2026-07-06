import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { INVOICE_REMINDERS_QUEUE, InvoiceRemindersProcessor } from './invoice-reminders.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: INVOICE_REMINDERS_QUEUE,
    }),
  ],
  providers: [InvoiceRemindersProcessor],
  exports: [BullModule],
})
export class QueueModule {}
