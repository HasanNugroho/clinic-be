import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum RegistrationMethod {
  ONLINE = 'online',
  OFFLINE = 'offline',
}

export enum RegistrationStatus {
  WAITING = 'waiting',
  EXAMINING = 'examining',
  COMPLETED = 'completed',
}

@Schema({ timestamps: true })
export class Registration {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Registration ID (MongoDB ObjectId)',
  })
  _id: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Patient ID reference',
  })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patientId: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439013',
    description: 'Doctor ID reference',
  })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  doctorId: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439014',
    description: 'Doctor schedule ID reference',
  })
  @Prop({ type: Types.ObjectId, ref: 'DoctorSchedule', required: true })
  scheduleId: string;

  @ApiProperty({
    example: '2024-01-21',
    description: 'Registration date',
  })
  @Prop({ type: Date, required: true })
  registrationDate: Date;

  @ApiProperty({
    enum: RegistrationMethod,
    example: RegistrationMethod.ONLINE,
    description: 'Registration method (online or offline)',
  })
  @Prop({ type: String, enum: RegistrationMethod, required: true })
  registrationMethod: RegistrationMethod;

  @ApiProperty({
    enum: RegistrationStatus,
    example: RegistrationStatus.WAITING,
    description: 'Registration status',
  })
  @Prop({ type: String, enum: RegistrationStatus, default: RegistrationStatus.WAITING })
  status: RegistrationStatus;

  @ApiProperty({
    example: 3,
    description: 'Queue number',
  })
  @Prop({ required: true })
  queueNumber: number;

  @ApiProperty({
    example: '2024-01-21T09:00:00Z',
    description: 'Created timestamp',
  })
  createdAt?: Date;

  @ApiProperty({
    example: '2024-01-21T09:00:00Z',
    description: 'Updated timestamp',
  })
  updatedAt?: Date;

  @Prop({ type: [Number], required: false, select: false })
  embedding?: number[];

  @Prop({ required: false, select: false })
  embeddingText?: string;

  @Prop({ required: false })
  embeddingUpdatedAt?: Date;
}

export const RegistrationSchema = SchemaFactory.createForClass(Registration);

// Add indexes for better query performance
RegistrationSchema.index({ patientId: 1, registrationDate: 1 });
RegistrationSchema.index({ doctorId: 1, registrationDate: 1 });
RegistrationSchema.index({ scheduleId: 1, registrationDate: 1 });
RegistrationSchema.index({ status: 1 });

RegistrationSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: function (doc, ret) {
    const { __v, ...rest } = ret;
    rest._id = rest._id.toString();
    if (rest.patientId) rest.patientId = rest.patientId.toString();
    if (rest.doctorId) rest.doctorId = rest.doctorId.toString();
    if (rest.scheduleId) rest.scheduleId = rest.scheduleId.toString();
    return rest;
  },
});

RegistrationSchema.set('toObject', {
  virtuals: false,
  versionKey: false,
  transform: function (doc, ret) {
    const { __v, ...rest } = ret;
    rest._id = rest._id.toString();
    if (rest.patientId) rest.patientId = rest.patientId.toString();
    if (rest.doctorId) rest.doctorId = rest.doctorId.toString();
    if (rest.scheduleId) rest.scheduleId = rest.scheduleId.toString();
    return rest;
  },
});
