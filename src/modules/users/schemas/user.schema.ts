import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Exclude } from 'class-transformer';
import { ObjectType, Field, registerEnumType, ID } from '@nestjs/graphql';

export type UserDocument = User & Document;

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

// Register enums for GraphQL
registerEnumType(Gender, {
  name: 'Gender',
  description: 'User gender',
});

registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'User role in the system',
});

@ObjectType()
@Schema({ timestamps: true })
export class User {
  @Field(() => ID)
  _id: string;

  @Field({ description: "User's full name" })
  @Prop({ required: true })
  fullName: string;

  @Field({ nullable: true, description: 'National ID number (optional for doctor/admin)' })
  @Prop({ required: false })
  nik?: string;

  @Field({ nullable: true, description: 'Birth date (for patients)' })
  @Prop({ type: Date, required: false })
  birthDate?: Date;

  @Field(() => Gender, { description: 'Gender' })
  @Prop({ type: String, enum: Gender, required: true })
  gender: Gender;

  @Field({ description: 'Address of user' })
  @Prop({ required: true })
  address: string;

  @Field({ description: 'Contact number' })
  @Prop({ required: true })
  phoneNumber: string;

  @Field({ description: 'Email for login' })
  @Prop({ required: true, unique: true })
  email: string;

  @Exclude()
  @Prop({ required: true })
  password: string;

  @Field(() => UserRole, { description: 'Role type' })
  @Prop({ type: String, enum: UserRole, required: true })
  role: UserRole;

  @Field({ nullable: true, description: "Doctor's specialization (nullable)" })
  @Prop({ required: false })
  specialization?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

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
