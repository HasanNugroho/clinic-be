import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto, UserPaginatedResponse } from './dto/query-user.dto';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { GqlRolesGuard } from '../auth/guards/gql-roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * GraphQL Resolver for User operations
 * Provides queries and mutations for user management
 */
@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) { }

  /**
   * Query to get all users with pagination (Admin & Employee only)
   */
  @Query(() => UserPaginatedResponse)
  @UseGuards(GqlAuthGuard, GqlRolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.EMPLOYEE)
  async getUsers(@Args('filter', { nullable: true }) queryDto?: QueryUserDto) {
    return this.usersService.findAll(queryDto);
  }

  /**
   * Query to get a single user by ID (Admin, Employee, Doctor)
   */
  @Query(() => User)
  @UseGuards(GqlAuthGuard, GqlRolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.EMPLOYEE, UserRole.DOCTOR)
  async getUser(@Args('id', { type: () => ID }) id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * Query to get current user profile (All authenticated users)
   */
  @Query(() => User, { name: 'me', description: 'Get current user profile', nullable: true })
  @UseGuards(GqlAuthGuard)
  async getCurrentUser(@CurrentUser() user: any) {
    return this.usersService.findOne(user.userId);
  }

  /**
   * Query to get user by email (Admin & Employee only)
   */
  @Query(() => User, { name: 'userByEmail', description: 'Get user by email', nullable: true })
  @UseGuards(GqlAuthGuard, GqlRolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.EMPLOYEE)
  async getUserByEmail(@Args('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  /**
   * Query to get all doctors (All authenticated users)
   */
  @Query(() => [User], { name: 'doctors', description: 'Get all doctors' })
  @UseGuards(GqlAuthGuard)
  async getDoctors() {
    const result = await this.usersService.findAll({ role: UserRole.DOCTOR });
    return result.data;
  }

  /**
   * Query to get all patients (Admin & Employee only)
   */
  @Query(() => [User], { name: 'patients', description: 'Get all patients' })
  @UseGuards(GqlAuthGuard, GqlRolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.EMPLOYEE)
  async getPatients() {
    const result = await this.usersService.findAll({ role: UserRole.PATIENT });
    return result.data;
  }

  /**
   * Mutation to create a new user
   */
  @Mutation(() => User, { name: 'createUser', description: 'Create a new user' })
  async createUser(@Args('createUserInput') createUserDto: CreateUserDto) {
    return await this.usersService.create(createUserDto);
  }

  /**
   * Mutation to update a user (Admin & Employee only)
   */
  @Mutation(() => User, { name: 'updateUser', description: 'Update an existing user' })
  @UseGuards(GqlAuthGuard, GqlRolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.EMPLOYEE)
  async updateUser(
    @Args('id', { type: () => ID }) id: string,
    @Args('updateUserInput') updateUserDto: UpdateUserDto,
  ) {
    return await this.usersService.update(id, updateUserDto);
  }

  /**
   * Mutation to delete a user (Superadmin only)
   */
  @Mutation(() => Boolean, { name: 'deleteUser', description: 'Delete a user' })
  @UseGuards(GqlAuthGuard, GqlRolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async deleteUser(@Args('id', { type: () => ID }) id: string) {
    await this.usersService.remove(id);
    return true;
  }
}
