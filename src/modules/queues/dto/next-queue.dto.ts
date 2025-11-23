import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsMongoId, IsDateString } from 'class-validator';

export class NextQueueDto {
  @ApiProperty({ description: 'Doctor ID' })
  @IsNotEmpty()
  @IsMongoId()
  doctorId: string;

  @ApiProperty({ description: 'Queue date' })
  @IsNotEmpty()
  @IsDateString()
  queueDate: string;
}
