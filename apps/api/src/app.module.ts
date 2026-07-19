import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { CustomersModule } from './customers/customers.module';
import { VendorsModule } from './vendors/vendors.module';
import { ProductsModule } from './products/products.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ExpensesModule } from './expenses/expenses.module';
import { QuotesModule } from './quotes/quotes.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { AdminModule } from './admin/admin.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { QueueModule } from './queue/queue.module';

const queuesEnabled = process.env.ENABLE_QUEUES === 'true';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ...(queuesEnabled
      ? [
          BullModule.forRoot({
            connection: {
              url: process.env.REDIS_URL || 'redis://localhost:6379',
            },
          }),
          QueueModule,
        ]
      : []),
    PrismaModule,
    RedisModule,
    StorageModule,
    HealthModule,
    AuthModule,
    OrganizationsModule,
    CustomersModule,
    VendorsModule,
    ProductsModule,
    InvoicesModule,
    QuotesModule,
    ExpensesModule,
    DashboardModule,
    ReportsModule,
    AdminModule,
    MaintenanceModule,
  ],
})
export class AppModule {}
