import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClinicInfoController } from './clinic-info.controller';
import { ClinicInfoService } from './clinic-info.service';
import { ClinicInfoSeeder } from './clinic-info.seeder';
import { ClinicInfo, ClinicInfoSchema } from './schemas/clinic-info.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: ClinicInfo.name, schema: ClinicInfoSchema }])],
  controllers: [ClinicInfoController],
  providers: [ClinicInfoService, ClinicInfoSeeder],
  exports: [ClinicInfoService, ClinicInfoSeeder, MongooseModule],
})
export class ClinicInfoModule {}
