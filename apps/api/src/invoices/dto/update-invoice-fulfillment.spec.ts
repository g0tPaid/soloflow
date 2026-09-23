import 'reflect-metadata';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { UpdateInvoiceDto } from './invoice.dto';

describe('UpdateInvoiceDto fulfillmentStatus', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    exceptionFactory: (errors) =>
      new BadRequestException(errors.flatMap((error) => Object.values(error.constraints ?? {}))),
  });

  const metadata = { type: 'body' as const, metatype: UpdateInvoiceDto };

  it('keeps null so a second click can clear the stage', async () => {
    const result = await pipe.transform({ fulfillmentStatus: null }, metadata);
    expect(result.fulfillmentStatus).toBeNull();
  });

  it('still accepts a stage and rejects an unknown one', async () => {
    const selected = await pipe.transform({ fulfillmentStatus: 'QC_COMPLETED' }, metadata);
    expect(selected.fulfillmentStatus).toBe('QC_COMPLETED');
    await expect(pipe.transform({ fulfillmentStatus: 'SHIPPED' }, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
