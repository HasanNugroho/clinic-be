import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginResponse } from './dto/auth-response.dto';
import { User } from '../users/schemas/user.schema';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * GraphQL Resolver for Authentication operations
 * Provides mutations for user registration and login
 */
@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) { }

  /**
   * Mutation to register a new user
   */
  @Mutation(() => User, { name: 'register', description: 'Register a new user' })
  async register(@Args('input') registerDto: CreateUserDto) {
    return await this.authService.register(registerDto);
  }

  /**
   * Mutation to login a user
   */
  @Mutation(() => LoginResponse, { name: 'login', description: 'Login user and get access token' })
  async login(@Args('input') loginDto: LoginDto): Promise<LoginResponse> {
    return await this.authService.login(loginDto);
  }

  /**
   * Query to get current authenticated user
   */
  @Query(() => User, { name: 'currentUser', description: 'Get current authenticated user', nullable: true })
  @UseGuards(GqlAuthGuard)
  async getCurrentUser(@CurrentUser() user: any) {
    return user;
  }
}
