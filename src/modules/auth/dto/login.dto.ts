import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class LoginDto {
  @Field({ description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Field({ description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
