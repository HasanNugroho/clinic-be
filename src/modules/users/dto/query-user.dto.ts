import { IsOptional, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dtos/pagination.dto';
import { User, UserRole } from '../schemas/user.schema';
import { ApiProperty } from '@nestjs/swagger';

export class QueryUserDto extends PaginationQueryDto {
  @ApiProperty({ enum: UserRole, required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
