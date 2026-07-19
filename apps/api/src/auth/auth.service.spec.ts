import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('test-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
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
});
