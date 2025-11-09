import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExaminationsService } from './examinations.service';
import { ExaminationsResolver } from './examinations.resolver';
import { Examination, ExaminationSchema } from './schemas/examination.schema';
import { UsersModule } from '../users/users.module';
import { RegistrationsModule } from '../registrations/registrations.module';
import { DatabaseModule } from 'src/common/service/database.module';

@Module({
  imports: [DatabaseModule, UsersModule, RegistrationsModule],
  providers: [ExaminationsService, ExaminationsResolver],
  exports: [ExaminationsService],
})
export class ExaminationsModule {}
