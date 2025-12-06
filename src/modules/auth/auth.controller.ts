import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginResponse, RefreshResponse, LogoutResponse } from './dto/auth-response.dto';
import { User } from '../users/schemas/user.schema';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ApiHttpResponse,
  ApiHttpErrorResponse,
} from '../../common/decorators/api-response.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';

/**
 * REST Controller for Authentication operations
 * Provides endpoints for user registration and login
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  /**
   * Register a new user
   */
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiHttpResponse(201, 'User registered successfully', User)
  @ApiHttpErrorResponse(409, 'Email already exists')
  @ApiHttpErrorResponse(400, 'Invalid input data')
  async register(@Body() registerDto: CreateUserDto) {
    return await this.authService.register(registerDto);
  }

  /**
   * Login a user
   */
  @Post('login')
  @ApiOperation({ summary: 'Login user and get access token and refresh token' })
  @ApiHttpResponse(200, 'Login successful', LoginResponse)
  @ApiHttpErrorResponse(401, 'Invalid credentials')
  @ApiHttpErrorResponse(400, 'Invalid input data')
  async login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return await this.authService.login(loginDto);
  }

  /**
   * Refresh access token using refresh token
   */
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiHttpResponse(200, 'Token refreshed successfully', RefreshResponse)
  @ApiHttpErrorResponse(401, 'Invalid or expired refresh token')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<RefreshResponse> {
    return await this.authService.refresh(refreshTokenDto.refreshToken);
  }

  /**
   * Logout user by revoking refresh token and blacklisting access token
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout user, revoke refresh token and blacklist access token' })
  @ApiHttpResponse(200, 'Logout successful', LogoutResponse)
  @ApiHttpErrorResponse(401, 'Unauthorized')
  async logout(@Body() logoutDto: LogoutDto, @CurrentUser() user: any): Promise<LogoutResponse> {
    // Extract access token from user object (set by JWT strategy)
    const accessToken = user.accessToken;
    await this.authService.logout(logoutDto);
    return { message: 'Logout successful' };
  }

  /**
   * Get current authenticated user
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiHttpResponse(200, 'Current authenticated user', User)
  @ApiHttpErrorResponse(401, 'Unauthorized')
  async getCurrentUser(@CurrentUser() user: any) {
    return user;
  }
}
