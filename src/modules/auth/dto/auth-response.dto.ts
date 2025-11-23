import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/schemas/user.schema';

export class UserResponse {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'User full name' })
  fullName: string;

  @ApiProperty({ description: 'User role' })
  role: string;
}

export class LoginResponse {
  @ApiProperty({ description: 'JWT access token' })
  access_token: string;

  @ApiProperty({ type: UserResponse, description: 'User information' })
  user: UserResponse;
}

export class RegisterResponse {
  @ApiProperty({ type: User, description: 'Registered user information' })
  user: User;
}
