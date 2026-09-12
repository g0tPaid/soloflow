import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { MembersService } from './members.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { InviteMemberDto, UpdateMemberRoleDto } from './dto/member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(
    private orgsService: OrganizationsService,
    private members: MembersService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  create(@CurrentUser() userId: string, @Body() dto: CreateOrganizationDto) {
    return this.orgsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List organizations for current user' })
  findAll(@CurrentUser() userId: string) {
    return this.orgsService.findByUser(userId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List organization members and pending invites' })
  listMembers(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.members.list(userId, id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Invite or add a team member (owner/admin)' })
  inviteMember(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.members.invite(userId, id, dto);
  }

  @Patch(':id/members/:memberId')
  @ApiOperation({ summary: 'Change a member role (owner/admin)' })
  updateMemberRole(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.members.updateRole(userId, id, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove a member (owner/admin)' })
  removeMember(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.members.remove(userId, id, memberId);
  }

  @Delete(':id/invites/:inviteId')
  @ApiOperation({ summary: 'Cancel a pending invite (owner/admin)' })
  cancelInvite(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.members.cancelInvite(userId, id, inviteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiHeader({ name: 'x-organization-id', required: false })
  findOne(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.orgsService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization branding and details' })
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.orgsService.update(userId, id, dto);
  }
}
