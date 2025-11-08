import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export type UserDocument = User & Document;

export enum Gender {
  MALE = 'M',
  FEMALE = 'F',
}

export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  ADMIN = 'admin',
}

@Schema({ timestamps: true })
export class User {
  _id: string;

  @ApiProperty({ description: "User's full name" })
  @Prop({ required: true })
  fullName: string;

  @ApiProperty({
    description: 'National ID number (optional for doctor/admin)',
    required: false,
  })
  @Prop({ required: false })
  nik?: string;

  @ApiProperty({ description: 'Birth date (for patients)', required: false })
  @Prop({ type: Date, required: false })
  birthDate?: Date;

  @ApiProperty({ description: 'Gender', enum: Gender })
  @Prop({ type: String, enum: Gender, required: true })
  gender: Gender;

  @ApiProperty({ description: 'Address of user' })
  @Prop({ required: true })
  address: string;

  @ApiProperty({ description: 'Contact number' })
  @Prop({ required: true })
  phoneNumber: string;

  @ApiProperty({ description: 'Email for login' })
  @Prop({ required: true, unique: true })
  email: string;

  @ApiProperty({ description: 'Encrypted password' })
  @Exclude()
  @Prop({ required: true })
  password: string;

  @ApiProperty({ description: 'Role type', enum: UserRole })
  @Prop({ type: String, enum: UserRole, required: true })
  role: UserRole;

  @ApiProperty({
    description: "Doctor's specialization (nullable)",
    required: false,
  })
  @Prop({ required: false })
  specialization?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
