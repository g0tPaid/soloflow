import { Body, Controller, Header, HttpCode, Post, Query } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { DropshipPortalService } from './dropship-portal.service';

@ApiExcludeController()
@Controller('dropship-portal')
export class DropshipPortalController {
  constructor(private readonly portals: DropshipPortalService) {}

  @Post('shipments')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  shipments(@Body('token') token: unknown, @Query('page') page?: string, @Query('status') status?: string) {
    const number = typeof page === 'string' && /^\d{1,4}$/.test(page) ? Math.max(1, Number(page)) : 1;
    return this.portals.shipments(token, (number - 1) * 20, status === 'all' ? 'all' : 'shipped');
  }
}
