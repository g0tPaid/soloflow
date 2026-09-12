import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { MemberRole } from '@flowbooks/database';
import { MembersService } from './members.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

describe('MembersService', () => {
  let service: MembersService;

  const mockPrisma = {
    organizationMember: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    organizationInvite: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockMail = {
    isConfigured: jest.fn().mockReturnValue(false),
    send: jest.fn().mockResolvedValue({ delivered: false, mode: 'log' }),
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'APP_URL') return 'http://localhost:3000';
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockMail.isConfigured.mockReturnValue(false);
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => unknown) =>
      fn(mockPrisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMail },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
  });

  function asOwner() {
    mockPrisma.organizationMember.findUnique.mockResolvedValue({
      id: 'mem-owner',
      userId: 'owner-1',
      organizationId: 'org-1',
      role: MemberRole.OWNER,
    });
  }

  it('rejects invite from a non-admin member', async () => {
    mockPrisma.organizationMember.findUnique.mockResolvedValue({
      id: 'mem-emp',
      userId: 'emp-1',
      role: MemberRole.EMPLOYEE,
    });

    await expect(
      service.invite('emp-1', 'org-1', { email: 'a@b.com', role: 'SALES' }),
    ).rejects.toThrow('Only owners and admins can manage team members');
  });

  it('adds an existing user as a member immediately', async () => {
    asOwner();
    mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', name: 'Acme' });
    mockPrisma.organizationMember.findFirst.mockResolvedValue(null);
    mockPrisma.organizationMember.count.mockResolvedValue(1);
    mockPrisma.organizationInvite.count.mockResolvedValue(0);
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'user-2',
      email: 'staff@acme.com',
      name: 'Staff',
    });
    mockPrisma.user.findUnique.mockResolvedValue({ name: 'Owner', email: 'owner@acme.com' });
    mockPrisma.organizationMember.create.mockResolvedValue({
      id: 'mem-2',
      role: MemberRole.SALES,
      user: { id: 'user-2', email: 'staff@acme.com', name: 'Staff' },
    });
    mockPrisma.organizationInvite.deleteMany.mockResolvedValue({ count: 0 });

    const result = await service.invite('owner-1', 'org-1', {
      email: 'staff@acme.com',
      name: 'Staff',
      role: 'SALES',
    });

    expect(result.status).toBe('added');
    expect(result.member?.user.email).toBe('staff@acme.com');
    expect(mockPrisma.organizationMember.create).toHaveBeenCalled();
  });

  it('creates a member with a temporary password when email is not configured', async () => {
    asOwner();
    mockMail.isConfigured.mockReturnValue(false);
    mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', name: 'Acme' });
    mockPrisma.organizationMember.findFirst.mockResolvedValue(null);
    mockPrisma.organizationMember.count.mockResolvedValue(1);
    mockPrisma.organizationInvite.count.mockResolvedValue(0);
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({ name: 'Owner', email: 'owner@acme.com' });
    mockPrisma.user.create.mockResolvedValue({ id: 'user-new', email: 'new@acme.com', name: 'New' });
    mockPrisma.organizationMember.create.mockResolvedValue({
      id: 'mem-new',
      role: MemberRole.EMPLOYEE,
      user: { id: 'user-new', email: 'new@acme.com', name: 'New' },
    });

    const result = await service.invite('owner-1', 'org-1', {
      email: 'new@acme.com',
      name: 'New',
      role: 'EMPLOYEE',
    });

    expect(result.status).toBe('created');
    expect(result.temporaryPassword).toMatch(/.{8,}/);
    expect(mockPrisma.user.create).toHaveBeenCalled();
  });

  it('creates a pending invite and sends email when Resend is configured', async () => {
    asOwner();
    mockMail.isConfigured.mockReturnValue(true);
    mockMail.send.mockResolvedValue({ delivered: true, mode: 'resend' });
    mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', name: 'Acme' });
    mockPrisma.organizationMember.findFirst.mockResolvedValue(null);
    mockPrisma.organizationMember.count.mockResolvedValue(1);
    mockPrisma.organizationInvite.count.mockResolvedValue(0);
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({ name: 'Owner', email: 'owner@acme.com' });
    mockPrisma.organizationInvite.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.organizationInvite.create.mockResolvedValue({
      id: 'inv-1',
      email: 'new@acme.com',
      name: 'New',
      role: MemberRole.EMPLOYEE,
      expiresAt: new Date(Date.now() + 1000),
      createdAt: new Date(),
    });

    const result = await service.invite('owner-1', 'org-1', {
      email: 'new@acme.com',
      name: 'New',
      role: 'EMPLOYEE',
    });

    expect(result.status).toBe('invited');
    expect(result.inviteUrl).toContain('/invite/');
    expect(result.emailDelivered).toBe(true);
    expect(mockMail.send).toHaveBeenCalled();
  });

  it('accepts an invite and creates membership for the same org', async () => {
    const raw = 'a'.repeat(40);
    mockPrisma.organizationInvite.findUnique.mockResolvedValue({
      id: 'inv-1',
      organizationId: 'org-1',
      email: 'staff@acme.com',
      name: 'Staff',
      role: MemberRole.MANAGER,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      organization: { id: 'org-1', name: 'Acme' },
      invitedBy: { name: 'Owner', email: 'owner@acme.com' },
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-2',
      email: 'staff@acme.com',
      name: null,
    });
    mockPrisma.organizationMember.findUnique.mockResolvedValue(null);
    mockPrisma.organizationMember.create.mockResolvedValue({ id: 'mem-2' });
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.organizationInvite.delete.mockResolvedValue({});

    const result = await service.accept('user-2', raw);

    expect(result.organizationId).toBe('org-1');
    expect(result.role).toBe(MemberRole.MANAGER);
    expect(mockPrisma.organizationMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-1',
          userId: 'user-2',
          role: MemberRole.MANAGER,
        }),
      }),
    );
    expect(hashToken(raw)).toHaveLength(64);
  });

  it('rejects accept when the signed-in email does not match the invite', async () => {
    mockPrisma.organizationInvite.findUnique.mockResolvedValue({
      id: 'inv-1',
      organizationId: 'org-1',
      email: 'staff@acme.com',
      name: 'Staff',
      role: MemberRole.EMPLOYEE,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      organization: { id: 'org-1', name: 'Acme' },
      invitedBy: { name: 'Owner', email: 'owner@acme.com' },
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-other',
      email: 'other@acme.com',
      name: 'Other',
    });

    await expect(service.accept('user-other', 'b'.repeat(40))).rejects.toThrow(
      'This invite was sent to staff@acme.com',
    );
  });

  it('does not remove the last owner', async () => {
    asOwner();
    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      id: 'mem-owner-2',
      userId: 'owner-2',
      role: MemberRole.OWNER,
    });
    mockPrisma.organizationMember.count.mockResolvedValue(1);

    await expect(service.remove('owner-1', 'org-1', 'mem-owner-2')).rejects.toThrow(
      'Cannot remove the last owner',
    );
  });
});
