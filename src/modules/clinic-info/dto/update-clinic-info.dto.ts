import { PartialType } from '@nestjs/swagger';
import { CreateClinicInfoDto } from './create-clinic-info.dto';

export class UpdateClinicInfoDto extends PartialType(CreateClinicInfoDto) {}
