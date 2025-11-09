/**
 * Common module that provides shared services across the application.
 * Includes DataLoaderFactory for efficient data loading.
 *
 * @module CommonModule
 */

import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DataLoaderFactory } from './service/data-loader-factory.service';
import { User, UserSchema } from '../modules/users/schemas/user.schema';
import {
  DoctorSchedule,
  DoctorScheduleSchema,
} from '../modules/doctorSchedules/schemas/doctor-schedule.schema';
import {
  Registration,
  RegistrationSchema,
} from '../modules/registrations/schemas/registration.schema';
import { Examination, ExaminationSchema } from '../modules/examinations/schemas/examination.schema';
import { DatabaseModule } from './service/database.module';

/**
 * Global module that provides DataLoaderFactory service.
 * Makes the factory available across all modules without explicit imports.
 *
 * @example
 * // Import in AppModule
 * @Module({
 *   imports: [CommonModule],
 * })
 * export class AppModule {}
 *
 * // Use in any service
 * constructor(private readonly dataLoaderFactory: DataLoaderFactory) {
 *   const loaders = this.dataLoaderFactory.createLoaders({
 *     User: { key: '_id', cache: true },
 *   });
 * }
 */
@Global()
@Module({
  imports: [DatabaseModule],
  providers: [DataLoaderFactory],
  exports: [DataLoaderFactory],
})
export class CommonModule {}
