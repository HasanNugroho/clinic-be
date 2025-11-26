import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { User, UserRole } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ApiHttpResponse,
  ApiHttpArrayResponse,
  ApiHttpPaginatedResponse,
  ApiHttpErrorResponse,
} from '../../common/decorators/api-response.decorator';
import { generatePaginationMeta } from 'src/common/utils/pagination.util';
import { PaginationQueryDto } from 'src/common/dtos/pagination.dto';

/**
 * REST Controller for User operations
 * Provides endpoints for user management
 */
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  /**
   * Get all users with pagination (Admin & Employee only)
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.EMPLOYEE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiHttpPaginatedResponse(200, 'Users retrieved successfully', User)
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async getUsers(@Query() queryDto: QueryUserDto) {
    const { data, total } = await this.usersService.findAll(queryDto);

    // Generate pagination meta
    const meta = generatePaginationMeta(total, queryDto);
    return { data: data, meta };
  }

  /**
   * Get a single user by ID (Admin, Employee, Doctor)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.EMPLOYEE, UserRole.DOCTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiHttpResponse(200, 'User retrieved successfully', User)
  @ApiHttpErrorResponse(404, 'User not found')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  async getUser(@Param('id') id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  /**
   * Get current user profile (All authenticated users)
   */
  @Get('profile/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiHttpResponse(200, 'Current user profile retrieved', User)
  @ApiHttpErrorResponse(401, 'Unauthorized')
  async getCurrentUser(@CurrentUser() user: any): Promise<User> {
    return this.usersService.findOne(user.userId);
  }

  /**
   * Get all doctors (All authenticated users)
   */
  @Get('role/doctors')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all doctors' })
  @ApiHttpPaginatedResponse(200, 'Doctors retrieved successfully', User)
  @ApiHttpErrorResponse(401, 'Unauthorized')
  async getDoctors(@Query() queryDto: PaginationQueryDto) {
    const { data, total } = await this.usersService.findAll({ ...queryDto, role: UserRole.DOCTOR });

    // Generate pagination meta
    const meta = generatePaginationMeta(total, queryDto);
    return { data: data, meta };
  }

  /**
   * Get all patients (Admin & Employee only)
   */
  @Get('role/patients')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.EMPLOYEE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all patients' })
  @ApiHttpPaginatedResponse(200, 'Patients retrieved successfully', User)
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async getPatients(@Query() queryDto: PaginationQueryDto) {
    const { data, total } = await this.usersService.findAll({
      ...queryDto,
      role: UserRole.PATIENT,
    });

    // Generate pagination meta
    const meta = generatePaginationMeta(total, queryDto);
    return { data: data, meta };
  }

  /**
   * Create a new user
   */
  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiHttpResponse(201, 'User created successfully', User)
  @ApiHttpErrorResponse(409, 'Email already exists')
  @ApiHttpErrorResponse(400, 'Invalid input data')
  async createUser(@Body() createUserDto: CreateUserDto): Promise<User> {
    return await this.usersService.create(createUserDto);
  }

  /**
   * Update a user (Admin & Employee only)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.EMPLOYEE)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update an existing user' })
  @ApiParam({ name: 'id', type: String })
  @ApiHttpResponse(200, 'User updated successfully', User)
  @ApiHttpErrorResponse(404, 'User not found')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<User> {
    return await this.usersService.update(id, updateUserDto);
  }

  /**
   * Delete a user (Superadmin only)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', type: String })
  @ApiHttpResponse(200, 'User deleted successfully')
  @ApiHttpErrorResponse(404, 'User not found')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async deleteUser(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { message: 'User deleted successfully' };
  }
}
