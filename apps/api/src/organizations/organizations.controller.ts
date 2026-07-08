import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private orgsService: OrganizationsService) {}

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

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiHeader({ name: 'x-organization-id', required: false })
  findOne(@Param('id') id: string) {
    return this.orgsService.findOne(id);
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
