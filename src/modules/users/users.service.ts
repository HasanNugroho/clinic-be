import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserRole } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto, UserPaginatedResponse } from './dto/query-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if email already exists
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Check if trying to create SUPERADMIN when one already exists
    if (createUserDto.role === UserRole.SUPERADMIN) {
      const existingSuperadmin = await this.userModel.findOne({
        role: UserRole.SUPERADMIN,
      });
      if (existingSuperadmin) {
        throw new BadRequestException('A superadmin user already exists');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const createdUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await createdUser.save();
    const userObject = savedUser.toObject();
    return userObject;
  }

  async findAll(queryDto?: QueryUserDto): Promise<UserPaginatedResponse> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      role,
    } = queryDto || {};

    // Build aggregation pipeline
    const pipeline: any[] = [];

    // Match stage - filter by role
    const matchStage: any = {};
    if (role) {
      matchStage.role = role;
    }

    // Search in fullName, email, and phoneNumber
    if (search) {
      matchStage.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
      ];
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Add facet for pagination and total count
    const skip = (page - 1) * limit;
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $sort: sortOptions }, { $skip: skip }, { $limit: limit }],
      },
    });

    // Execute aggregation
    const result = await this.userModel.aggregate(pipeline).exec();

    const data = result[0]?.data || [];
    const total = result[0]?.metadata[0]?.total || 0;

    return new UserPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).lean().exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userModel.findOne({ email }).exec();
  }

  async findByUserId(userId: string): Promise<User> {
    const user = await this.userModel.findOne({ userId }).exec();
    if (!user) {
      throw new NotFoundException(`User with userId ${userId} not found`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // Check if trying to change role to SUPERADMIN when one already exists
    if (updateUserDto.role === UserRole.SUPERADMIN) {
      const existingSuperadmin = await this.userModel.findOne({
        role: UserRole.SUPERADMIN,
      });
      // Allow update only if the existing superadmin is the same user being updated
      if (existingSuperadmin && existingSuperadmin._id.toString() !== id) {
        throw new BadRequestException('A superadmin user already exists');
      }
    }

    // If password is being updated, hash it
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}
