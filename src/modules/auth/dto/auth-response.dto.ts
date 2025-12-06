import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/schemas/user.schema';

export class UserResponse {
  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011'
  })
  userId: string;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com'
  })
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe'
  })
  fullName: string;

  @ApiProperty({
    description: 'User role',
    example: 'patient',
    enum: ['patient', 'doctor', 'admin']
  })
  role: string;
}

export class LoginResponse {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwic3ViIjoiNTA3ZjFmNzdiY2Y4NmNkNzk5NDM5MDExIiwicm9sZSI6InBhdGllbnQiLCJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJpYXQiOjE3MDE4NjQwMDAsImV4cCI6MTcwMTg2NzYwMH0.abc123def456ghi789'
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  refreshToken: string;

  @ApiProperty({
    type: UserResponse,
    description: 'User information'
  })
  user: UserResponse;
}

export class RefreshResponse {
  @ApiProperty({
    description: 'New JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwic3ViIjoiNTA3ZjFmNzdiY2Y4NmNkNzk5NDM5MDExIiwicm9sZSI6InBhdGllbnQiLCJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJpYXQiOjE3MDE4Njc2MDAsImV4cCI6MTcwMTg3MTIwMH0.xyz789abc123def456'
  })
  accessToken: string;

  @ApiProperty({
    description: 'New JWT refresh token',
    example: '660f9500-f39c-52e5-b827-557766551111'
  })
  refreshToken: string;
}

export class LogoutResponse {
  @ApiProperty({
    description: 'Logout success message',
    example: 'Logout successful'
  })
  message: string;
}

export class RegisterResponse {
  @ApiProperty({ type: User, description: 'Registered user information' })
  user: User;
}
