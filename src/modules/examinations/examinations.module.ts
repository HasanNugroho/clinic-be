import { Module } from '@nestjs/common';
import { ExaminationsService } from './examinations.service';
import { ExaminationsController } from './examinations.controller';
import { UsersModule } from '../users/users.module';
import { RegistrationsModule } from '../registrations/registrations.module';
import { DatabaseModule } from 'src/common/services/database.module';
import { QdrantModule } from '../qdrant/qdrant.module';

@Module({
  imports: [DatabaseModule, UsersModule, RegistrationsModule, QdrantModule,],
  controllers: [ExaminationsController],
  providers: [ExaminationsService],
  exports: [ExaminationsService],
})
export class ExaminationsModule { }
