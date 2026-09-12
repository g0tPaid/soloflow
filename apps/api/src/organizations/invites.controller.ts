import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MembersService } from './members.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('Invites')
@Controller('invites')
export class InvitesController {
  constructor(private members: MembersService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Preview a pending team invite (public)' })
  preview(@Param('token') token: string) {
    return this.members.preview(token);
  }

  @Post(':token/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept a team invite for the signed-in user' })
  accept(@CurrentUser() userId: string, @Param('token') token: string) {
    return this.members.accept(userId, token);
  }
}
