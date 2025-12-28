import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClinicInfoService } from './clinic-info.service';
import { CreateClinicInfoDto } from './dto/create-clinic-info.dto';
import { UpdateClinicInfoDto } from './dto/update-clinic-info.dto';
import { QueryClinicInfoDto } from './dto/query-clinic-info.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import {
  ApiHttpResponse,
  ApiHttpErrorResponse,
  ApiHttpArrayResponse,
} from '../../common/decorators/api-response.decorator';
import { ClinicInfo } from './schemas/clinic-info.schema';

@ApiTags('Clinic Information')
@Controller('clinic-info')
export class ClinicInfoController {
  constructor(private readonly clinicInfoService: ClinicInfoService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new clinic information (Admin only)' })
  @ApiHttpResponse(201, 'Clinic information created successfully', ClinicInfo)
  @ApiHttpErrorResponse(400, 'Invalid input data')
  @ApiHttpErrorResponse(401, 'Unauthorized - JWT token required')
  @ApiHttpErrorResponse(403, 'Forbidden - Admin role required')
  async create(@Body() createDto: CreateClinicInfoDto): Promise<ClinicInfo> {
    return await this.clinicInfoService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all clinic information (Public access)' })
  @ApiHttpArrayResponse(200, 'Clinic information retrieved successfully', ClinicInfo)
  async findAll(@Query() query: QueryClinicInfoDto): Promise<ClinicInfo[]> {
    return await this.clinicInfoService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get clinic information by ID (Public access)' })
  @ApiHttpResponse(200, 'Clinic information retrieved successfully', ClinicInfo)
  @ApiHttpErrorResponse(404, 'Clinic information not found')
  async findOne(@Param('id') id: string): Promise<ClinicInfo> {
    return await this.clinicInfoService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update clinic information (Admin only)' })
  @ApiHttpResponse(200, 'Clinic information updated successfully', ClinicInfo)
  @ApiHttpErrorResponse(400, 'Invalid input data')
  @ApiHttpErrorResponse(401, 'Unauthorized - JWT token required')
  @ApiHttpErrorResponse(403, 'Forbidden - Admin role required')
  @ApiHttpErrorResponse(404, 'Clinic information not found')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateClinicInfoDto,
  ): Promise<ClinicInfo> {
    return await this.clinicInfoService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete clinic information (Admin only)' })
  @ApiHttpResponse(200, 'Clinic information deleted successfully')
  @ApiHttpErrorResponse(401, 'Unauthorized - JWT token required')
  @ApiHttpErrorResponse(403, 'Forbidden - Admin role required')
  @ApiHttpErrorResponse(404, 'Clinic information not found')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.clinicInfoService.remove(id);
    return { message: 'Clinic information deleted successfully' };
  }
}
