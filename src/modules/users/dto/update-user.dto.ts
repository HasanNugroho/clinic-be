import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @ApiProperty({ required: false, description: 'User password' })
    @IsString()
    @IsOptional()
    password?: string;
}
