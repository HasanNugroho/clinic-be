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
import { QueryUserDto } from './dto/query-user.dto';
import * as bcrypt from 'bcrypt';
import { transformObjectId } from '../../common/utils/transform-objectid.util';

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
    return savedUser.toJSON();
  }

  async findAll(queryDto: QueryUserDto = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      role,
    } = queryDto;

    const pipeline: any[] = [];

    // MATCH
    const match: any = {};
    if (role) match.role = role;
    if (search) {
      match.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (Object.keys(match).length > 0) pipeline.push({ $match: match });

    // Convert _id & date formats
    pipeline.push({
      $addFields: {
        _id: { $toString: "$_id" },
        createdAt: { $ifNull: ["$createdAt", null] },
        updatedAt: { $ifNull: ["$updatedAt", null] },
        birthDate: { $ifNull: ["$birthDate", null] }
      }
    });

    pipeline.push({
      $project: {
        password: 0
      }
    });

    // SORT
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const skip = (page - 1) * limit;

    // FACET
    pipeline.push({
      $facet: {
        data: [{ $sort: sortOptions }, { $skip: skip }, { $limit: limit }],
        totalData: [{ $count: 'count' }],
      },
    });

    pipeline.push({
      $project: {
        data: 1,
        total: { $ifNull: [{ $arrayElemAt: ['$totalData.count', 0] }, 0] },
      },
    });

    const result = await this.userModel.aggregate(pipeline);

    return {
      data: result[0]?.data || [],
      total: result[0]?.total || 0,
    };
  }


  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user.toJSON();
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user.toJSON()
  }

  async findByUserId(userId: string): Promise<User> {
    const user = await this.userModel.findOne({ userId }).exec();
    if (!user) {
      throw new NotFoundException(`User with userId ${userId} not found`);
    }
    return user.toJSON();
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

    return updatedUser.toJSON();
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}
