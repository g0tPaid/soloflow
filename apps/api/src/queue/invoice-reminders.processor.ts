import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

export const INVOICE_REMINDERS_QUEUE = 'invoice-reminders';

export interface InvoiceReminderJob {
  invoiceId: string;
  organizationId: string;
  type: 'due_soon' | 'overdue';
}

@Processor(INVOICE_REMINDERS_QUEUE)
export class InvoiceRemindersProcessor extends WorkerHost {
  private readonly logger = new Logger(InvoiceRemindersProcessor.name);

  async process(job: Job<InvoiceReminderJob>) {
    this.logger.log(`Processing invoice reminder: ${job.data.invoiceId} (${job.data.type})`);
    // Placeholder: send email notification in Phase 2
    return { processed: true, invoiceId: job.data.invoiceId };
  }
}
