import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
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
   * Get all users with pagination (Admin only)
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
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
   * Get a single user by ID (Admin, Doctor)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
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
   * Get all patients (Admin only)
   */
  @Get('role/patients')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
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
   * Update a user (Admin only)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
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
   * Delete a user (Admin only)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
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

  /**
   * Bulk import users from JSON file
   */
  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Bulk import users from JSON file',
    description: 'Import multiple users at once from a JSON file. File should contain: { "users": [{ "fullName": "John Doe", "email": "john@example.com", "password": "password123", "role": "patient", "gender": "M", "address": "123 Main St", "phoneNumber": "+628123456789" }] }',
  })
  @ApiBody({
    description: 'JSON file containing users array',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'JSON file with users data',
        },
      },
      required: ['file'],
    },
  })
  @ApiHttpResponse(200, 'Users imported successfully')
  @ApiHttpErrorResponse(400, 'Invalid file format')
  @ApiHttpErrorResponse(401, 'Unauthorized')
  @ApiHttpErrorResponse(403, 'Forbidden')
  async importUsers(@UploadedFile() file: any) {
    if (!file) {
      throw new Error('No file provided');
    }

    try {
      const importData = JSON.parse(file.buffer.toString('utf-8'));
      const users = importData.users || [];
      const result = await this.usersService.bulkImport(users);
      return {
        message: 'Import completed',
        ...result,
      };
    } catch (error) {
      throw new Error(`Failed to parse JSON file: ${error.message}`);
    }
  }
}
