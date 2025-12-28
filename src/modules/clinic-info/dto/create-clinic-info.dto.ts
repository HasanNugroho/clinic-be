import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ClinicInfoCategory } from '../schemas/clinic-info.schema';

export class CreateClinicInfoDto {
  @ApiProperty({
    description: 'Title of the clinic information',
    example: 'Jam Operasional Klinik',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Category of the information',
    enum: ClinicInfoCategory,
    example: ClinicInfoCategory.OPEN_HOURS,
  })
  @IsNotEmpty()
  @IsEnum(ClinicInfoCategory)
  category: ClinicInfoCategory;

  @ApiProperty({
    description: 'Detailed content of the clinic information',
    example: 'Klinik buka setiap hari Senin - Jumat pukul 08:00 - 16:00 WIB',
  })
  @IsNotEmpty()
  @IsString()
  content: string;
}
