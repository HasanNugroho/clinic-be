import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/schemas/user.schema';
import { DoctorSchedule } from 'src/modules/doctorSchedules/schemas/doctor-schedule.schema';

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

  @ApiProperty({
    type: Object,
    description: 'Populated doctor data (from populate)',
    required: false,
    example: {
      _id: '507f1f77bcf86cd799439012',
      fullName: 'Dr. John Doe',
      email: 'john.doe@example.com',
      phoneNumber: '+62812345678',
      gender: 'M',
      address: '123 Main St, City, Country',
      role: 'doctor',
      specialization: 'Cardiology',
    },
  })
  doctor?: User;

  @ApiProperty({
    type: Object,
    description: 'Populated patient data (from populate)',
    required: false,
    example: {
      _id: '507f1f77bcf86cd799439013',
      fullName: 'Jane Smith',
      email: 'jane.smith@example.com',
      phoneNumber: '+62812345679',
      gender: 'F',
      address: '456 Oak Ave, City, Country',
      role: 'patient',
    },
  })
  patient?: User;

  @ApiProperty({
    type: Object,
    description: 'Populated schedule data (from populate)',
    required: false,
    example: {
      _id: '692467ddd19fd753436ff7cc',
      doctorId: '692462f69f4bc68441482cd3',
      dayOfWeek: 'hari kerja',
      startTime: '08:00',
      endTime: '17:00',
      quota: '30',
      createdAt: '2025-11-24T14:12:45.537Z',
      updatedAt: '2025-11-24T15:50:02.522Z',
    },
  })
  schedule?: DoctorSchedule;
}

export const RegistrationSchema = SchemaFactory.createForClass(Registration);

RegistrationSchema.virtual('doctor', {
  ref: 'User',
  localField: 'doctorId',
  foreignField: '_id',
  justOne: true,
});

RegistrationSchema.virtual('patient', {
  ref: 'User',
  localField: 'patientId',
  foreignField: '_id',
  justOne: true,
});

RegistrationSchema.virtual('schedule', {
  ref: 'DoctorSchedule',
  localField: 'scheduleId',
  foreignField: '_id',
  justOne: true,
});

// Add indexes for better query performance
RegistrationSchema.index({ patientId: 1, registrationDate: 1 });
RegistrationSchema.index({ doctorId: 1, registrationDate: 1 });
RegistrationSchema.index({ scheduleId: 1, registrationDate: 1 });
RegistrationSchema.index({ status: 1 });

function transform(doc, ret: any) {
  delete ret.__v;

  // REMOVE SCHEDULE-LEVEL EMBEDDING FIELDS (if exist)
  delete ret.embedding;
  delete ret.embeddingText;
  delete ret.embeddingUpdatedAt;

  // Convert IDs
  if (ret._id) ret._id = ret._id.toString();

  if (ret.doctorId && typeof ret.doctorId === 'object') {
    ret.doctorId = ret.doctorId.toString();
  }

  if (ret.patientId && typeof ret.patientId === 'object') {
    ret.patientId = ret.patientId.toString();
  }

  if (ret.scheduleId && typeof ret.scheduleId === 'object') {
    ret.scheduleId = ret.scheduleId.toString();
  }

  // If doctor populated → remove sensitive fields
  if (ret.doctor) {
    const {
      password,
      nik,
      birthDate,
      embedding,
      embeddingText,
      embeddingUpdatedAt,
      __v,
      ...safeDoctor
    } = ret.doctor;

    safeDoctor._id = safeDoctor._id.toString();
    ret.doctor = safeDoctor;
  }

  if (ret.patient) {
    const {
      password,
      nik,
      birthDate,
      embedding,
      embeddingText,
      embeddingUpdatedAt,
      __v,
      ...safePatient
    } = ret.patient;

    safePatient._id = safePatient._id.toString();
    ret.patient = safePatient;
  }

  return ret;
}

RegistrationSchema.set('toJSON', { virtuals: true, versionKey: false, transform });
RegistrationSchema.set('toObject', { virtuals: true, versionKey: false, transform });
