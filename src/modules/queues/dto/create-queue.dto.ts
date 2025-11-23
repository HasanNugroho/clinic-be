import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsMongoId, IsDateString } from 'class-validator';

export class CreateQueueDto {
  @ApiProperty({ description: 'Registration ID' })
  @IsNotEmpty()
  @IsMongoId()
  registrationId: string;

  @ApiProperty({ description: 'Patient ID' })
  @IsNotEmpty()
  @IsMongoId()
  patientId: string;

  @ApiProperty({ description: 'Doctor ID' })
  @IsNotEmpty()
  @IsMongoId()
  doctorId: string;

  @ApiProperty({ description: 'Queue date' })
  @IsNotEmpty()
  @IsDateString()
  queueDate: string;
}
