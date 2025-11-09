import { ObjectType, Field } from '@nestjs/graphql';
import { User } from '../../users/schemas/user.schema';

@ObjectType()
export class UserResponse {
  @Field({ description: 'User ID' })
  userId: string;

  @Field({ description: 'User email' })
  email: string;

  @Field({ description: 'User full name' })
  fullName: string;

  @Field({ description: 'User role' })
  role: string;
}

@ObjectType()
export class LoginResponse {
  @Field({ description: 'JWT access token' })
  access_token: string;

  @Field(() => UserResponse, { description: 'User information' })
  user: UserResponse;
}

@ObjectType()
export class RegisterResponse {
  @Field(() => User, { description: 'Registered user information' })
  user: User;
}
