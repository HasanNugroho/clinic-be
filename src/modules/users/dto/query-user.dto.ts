import { IsOptional, IsEnum } from 'class-validator';
import { PaginatedResponse, PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { User, UserRole } from '../schemas/user.schema';
import { Field, InputType, ObjectType } from '@nestjs/graphql';

@InputType()
export class QueryUserDto extends PaginationQueryDto {
  @Field(() => UserRole, { nullable: true })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

@ObjectType()
export class UserPaginatedResponse extends PaginatedResponse(User) {}
