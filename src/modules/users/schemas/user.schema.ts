import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum Gender {
  MALE = 'M',
  FEMALE = 'F',
}

export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  EMPLOYEE = 'employee',
  SUPERADMIN = 'superadmin',
}

@Schema({ timestamps: true })
export class User {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'User ID (MongoDB ObjectId)',
  })
  _id: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
  })
  @Prop({ required: true })
  fullName: string;

  @ApiProperty({
    example: '1234567890123456',
    description: 'National ID number',
    required: false,
  })
  @Prop({ required: false })
  nik?: string;

  @ApiProperty({
    example: '1990-01-15',
    description: 'Birth date',
    required: false,
  })
  @Prop({ type: Date, required: false })
  birthDate?: Date;

  @ApiProperty({
    enum: Gender,
    example: Gender.MALE,
    description: 'User gender (M or F)',
  })
  @Prop({ type: String, enum: Gender, required: true })
  gender: Gender;

  @ApiProperty({
    example: '123 Main St, City, Country',
    description: 'User address',
  })
  @Prop({ required: true })
  address: string;

  @ApiProperty({
    example: '+62812345678',
    description: 'User phone number',
  })
  @Prop({ required: true })
  phoneNumber: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'User email address (unique)',
  })
  @Prop({ required: true, unique: true })
  email: string;

  @Exclude()
  @Prop({ required: true })
  password: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.PATIENT,
    description: 'User role',
  })
  @Prop({ type: String, enum: UserRole, required: true })
  role: UserRole;

  @ApiProperty({
    example: 'Cardiology',
    description: 'Doctor specialization',
    required: false,
  })
  @Prop({ required: false })
  specialization?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add indexes for better query performance
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ nik: 1 }, { sparse: true });
UserSchema.index({ phoneNumber: 1 });

UserSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: function (doc, ret) {
    const { password, __v, ...rest } = ret;
    rest._id = rest._id.toString();
    return rest;
  },
});

UserSchema.set('toObject', {
  virtuals: false,
  versionKey: false,
  transform: function (doc, ret) {
    const { password, __v, ...rest } = ret;
    rest._id = rest._id.toString();
    return rest;
  },
});
