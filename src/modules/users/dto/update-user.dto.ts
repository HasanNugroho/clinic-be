import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString } from 'class-validator';
import { InputType, PartialType as GraphQLPartialType } from '@nestjs/graphql';

@InputType()
export class UpdateUserDto extends GraphQLPartialType(CreateUserDto) {
    @IsString()
    @IsOptional()
    password?: string;
}
