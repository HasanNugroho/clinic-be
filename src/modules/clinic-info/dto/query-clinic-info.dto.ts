import { IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ClinicInfoCategory } from '../schemas/clinic-info.schema';

export class QueryClinicInfoDto {
  @ApiProperty({
    description: 'Filter by category',
    enum: ClinicInfoCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(ClinicInfoCategory)
  category?: ClinicInfoCategory;
}
