import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { MembersService } from '../organizations/members.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    verificationToken: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('test-token'),
  };

  const mockMail = {
    send: jest.fn().mockResolvedValue({ delivered: true, mode: 'resend' }),
  };

  const mockConfig = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'APP_URL') return 'http://localhost:3000';
      return fallback;
    }),
  };

  const mockMembers = {
    accept: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: MailService, useValue: mockMail },
        { provide: ConfigService, useValue: mockConfig },
        { provide: MembersService, useValue: mockMembers },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw ConflictException when email exists', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: '1', email: 'test@example.com' });

    await expect(
      service.register({ name: 'Test', email: 'test@example.com', password: 'password123' }),
    ).rejects.toThrow('Email already registered');
  });

  it('should treat emails as case-insensitive on register conflict', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: '1', email: 'Test@Example.com' });

    await expect(
      service.register({ name: 'Test', email: 'test@example.com', password: 'password123' }),
    ).rejects.toThrow('Email already registered');
  });

  it('disables local bootstrap in production even if LOCAL_SINGLE_USER is true', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousLocal = process.env.LOCAL_SINGLE_USER;
    process.env.NODE_ENV = 'production';
    process.env.LOCAL_SINGLE_USER = 'true';

    await expect(service.bootstrapLocal()).rejects.toThrow('Local bootstrap is disabled');

    process.env.NODE_ENV = previousNodeEnv;
    process.env.LOCAL_SINGLE_USER = previousLocal;
  });
});
