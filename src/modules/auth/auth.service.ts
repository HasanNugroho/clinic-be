import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginResponse } from './dto/auth-response.dto';
import { Model } from 'mongoose';
import { User } from '../users/schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { RedisService } from '../../common/services/redis/redis.service';
import { randomUUID } from 'crypto';
import { LogoutDto } from './dto/logout.dto';

@Injectable()
export class AuthService {
  private readonly REFRESH_TOKEN_TTL = 604800; // 7 days in seconds
  private readonly REFRESH_TOKEN_PREFIX = 'refreshToken:';
  private readonly BLACKLIST_PREFIX = 'blacklist:token:';
  private readonly ACCESS_TOKEN_TTL = 3600; // 1 hour in seconds (should match JWT expiration)

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private usersService: UsersService,
    private jwtService: JwtService,
    private redisService: RedisService,
  ) { }

  async register(registerDto: RegisterDto) {
    return await this.usersService.create(registerDto);
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.userModel.findOne({ email: loginDto.email }).exec();

    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      email: user.email,
      sub: user._id,
      role: user.role,
      userId: user._id.toString(),
    };

    // Generate access token
    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshToken = await this.generateRefreshToken(user._id.toString());

    return {
      accessToken,
      refreshToken,
      user: {
        userId: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string, refreshToken: string }> {
    // Validate refresh token
    const userId = await this.validateRefreshToken(refreshToken);

    if (!userId) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Get user from database
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate new access token
    const payload = {
      email: user.email,
      sub: user._id,
      role: user.role,
      userId: user._id.toString(),
    };

    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const newRefreshToken = await this.generateRefreshToken(user._id.toString());

    // Revoke refresh token
    await this.revokeRefreshToken(refreshToken);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(logoutDto: LogoutDto): Promise<void> {
    // Revoke refresh token
    await this.revokeRefreshToken(logoutDto.refreshToken);

    // Blacklist access token
    await this.blacklistAccessToken(logoutDto.accessToken);
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * Generate a refresh token and store it in Redis
   */
  private async generateRefreshToken(userId: string): Promise<string> {
    const refreshToken = randomUUID();
    const key = `${this.REFRESH_TOKEN_PREFIX}${refreshToken}`;

    // Store refresh token in Redis with user ID as value
    await this.redisService.set(key, userId, this.REFRESH_TOKEN_TTL);

    return refreshToken;
  }

  /**
   * Validate refresh token and return user ID
   */
  private async validateRefreshToken(refreshToken: string): Promise<string | null> {
    const key = `${this.REFRESH_TOKEN_PREFIX}${refreshToken}`;
    const userId = await this.redisService.get(key);

    return userId;
  }

  /**
   * Revoke a refresh token by deleting it from Redis
   */
  private async revokeRefreshToken(refreshToken: string): Promise<void> {
    const key = `${this.REFRESH_TOKEN_PREFIX}${refreshToken}`;
    await this.redisService.del(key);
  }

  /**
   * Blacklist an access token by storing it in Redis
   */
  private async blacklistAccessToken(accessToken: string): Promise<void> {
    const key = `${this.BLACKLIST_PREFIX}${accessToken}`;
    // Store with TTL equal to token expiration time
    await this.redisService.set(key, 'blacklisted', this.ACCESS_TOKEN_TTL);
  }

  /**
   * Check if an access token is blacklisted
   */
  async isTokenBlacklisted(accessToken: string): Promise<boolean> {
    const key = `${this.BLACKLIST_PREFIX}${accessToken}`;
    return await this.redisService.exists(key);
  }
}
