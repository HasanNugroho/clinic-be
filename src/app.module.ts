import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { DoctorSchedulesModule } from './modules/doctorSchedules/doctor-schedules.module';
import { RegistrationsModule } from './modules/registrations/registrations.module';
import { ExaminationsModule } from './modules/examinations/examinations.module';
import { QueuesModule } from './modules/queues/queues.module';
import { RagModule } from './modules/rag/rag.module';
import { BullModule } from '@nestjs/bullmq';
import mongoose from 'mongoose';
import { DashboardModule } from './modules/dashboard/dashboard.module';

const { ObjectId } = mongoose.Types;
ObjectId.prototype.valueOf = function () {
  return this.toString();
};

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/clinic',
      }),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig: any = {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT') || 6379,
        };

        // Add password if provided
        const password = configService.get<string>('REDIS_PASSWORD');
        if (password) {
          redisConfig.password = password;
        }

        return {
          connection: redisConfig,
        };
      },
    }),
    UsersModule,
    AuthModule,
    DoctorSchedulesModule,
    RegistrationsModule,
    ExaminationsModule,
    QueuesModule,
    RagModule,
    DashboardModule,
  ],
  providers: [],
})
export class AppModule { }
