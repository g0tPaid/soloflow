import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {}

  async send(input: SendMailInput): Promise<{ delivered: boolean; mode: string }> {
    const from =
      this.config.get<string>('EMAIL_FROM')?.trim() ||
      this.config.get<string>('RESEND_FROM')?.trim() ||
      'SoloFlow <onboarding@resend.dev>';

    const resendKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    if (resendKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.subject,
          text: input.text,
          html: input.html,
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        this.logger.error(`Resend failed (${response.status}): ${detail}`);
        throw new Error('Failed to send email');
      }

      return { delivered: true, mode: 'resend' };
    }

    // Dev / misconfigured production: log the message so reset still works locally
    this.logger.warn(
      `No RESEND_API_KEY set — password reset email logged for ${input.to}\n${input.text}`,
    );
    return { delivered: false, mode: 'log' };
  }
}
