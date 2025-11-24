import { Module } from '@nestjs/common';
import { ExaminationsService } from './examinations.service';
import { ExaminationsController } from './examinations.controller';
import { UsersModule } from '../users/users.module';
import { RegistrationsModule } from '../registrations/registrations.module';
import { DatabaseModule } from 'src/common/services/database.module';
import { EmbeddingModule } from 'src/common/services/embedding/embedding.modul';

@Module({
  imports: [DatabaseModule, UsersModule, RegistrationsModule, EmbeddingModule,],
  controllers: [ExaminationsController],
  providers: [ExaminationsService],
  exports: [ExaminationsService],
})
export class ExaminationsModule { }
