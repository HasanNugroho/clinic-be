import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/schemas/user.schema';

export enum QueueStatus {
  WAITING = 'waiting',
  CURRENT = 'current',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

@Schema({ timestamps: true })
export class Queue {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Queue ID (MongoDB ObjectId)',
  })
  _id: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Registration ID reference',
  })
  @Prop({ type: Types.ObjectId, ref: 'Registration', required: true })
  registrationId: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439013',
    description: 'Patient ID reference',
  })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patientId: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439014',
    description: 'Doctor ID reference',
  })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  doctorId: string;

  @ApiProperty({
    example: 5,
    description: 'Queue number for the day',
  })
  @Prop({ required: true })
  queueNumber: number;

  @ApiProperty({
    example: '2024-01-21',
    description: 'Queue date',
  })
  @Prop({ type: Date, required: true })
  queueDate: Date;

  @ApiProperty({
    enum: QueueStatus,
    example: QueueStatus.WAITING,
    description: 'Queue status',
  })
  @Prop({ type: String, enum: QueueStatus, default: QueueStatus.WAITING })
  status: QueueStatus;

  @ApiProperty({
    example: '2024-01-21T10:30:00Z',
    description: 'When queue was called',
    required: false,
  })
  @Prop({ type: Date, required: false })
  calledAt?: Date;

  @ApiProperty({
    example: '2024-01-21T10:45:00Z',
    description: 'When queue was completed',
    required: false,
  })
  @Prop({ type: Date, required: false })
  completedAt?: Date;

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
    example: '2024-01-21T09:00:00Z',
    description: 'Created timestamp',
  })
  createdAt?: Date;

  @ApiProperty({
    example: '2024-01-21T10:45:00Z',
    description: 'Updated timestamp',
  })
  updatedAt?: Date;
}

export const QueueSchema = SchemaFactory.createForClass(Queue);

// Add indexes for better query performance
QueueSchema.index({ registrationId: 1 }, { unique: true });
QueueSchema.index({ doctorId: 1, queueDate: 1, status: 1 });
QueueSchema.index({ patientId: 1, queueDate: 1 });
QueueSchema.index({ queueDate: 1, status: 1 });
QueueSchema.index({ doctorId: 1, queueDate: 1, queueNumber: 1 });

QueueSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: function (doc, ret: any) {
    const { __v, ...rest } = ret;
    rest._id = rest._id.toString();
    if (rest.registrationId) rest.registrationId = rest.registrationId.toString();
    if (rest.doctorId) rest.doctorId = rest.doctorId.toString();
    if (rest.patientId) rest.patientId = rest.patientId.toString();
    // Remove sensitive fields from populated doctor data
    if (rest.doctor) {
      const { password, nik, birthDate, embedding, embeddingText, embeddingUpdatedAt, ...doctorData } = rest.doctor;
      if (doctorData._id) doctorData._id = doctorData._id.toString();
      rest.doctor = doctorData as any;
    }
    // Remove sensitive fields from populated patient data
    if (rest.patient) {
      const { password, nik, birthDate, embedding, embeddingText, embeddingUpdatedAt, ...patientData } = rest.patient;
      if (patientData._id) patientData._id = patientData._id.toString();
      rest.patient = patientData as any;
    }
    return rest;
  },
});

QueueSchema.set('toObject', {
  virtuals: false,
  versionKey: false,
  transform: function (doc, ret: any) {
    const { __v, ...rest } = ret;
    rest._id = rest._id.toString();
    if (rest.registrationId) rest.registrationId = rest.registrationId.toString();
    if (rest.doctorId) rest.doctorId = rest.doctorId.toString();
    if (rest.patientId) rest.patientId = rest.patientId.toString();
    // Remove sensitive fields from populated doctor data
    if (rest.doctor) {
      const { password, nik, birthDate, embedding, embeddingText, embeddingUpdatedAt, ...doctorData } = rest.doctor;
      if (doctorData._id) doctorData._id = doctorData._id.toString();
      rest.doctor = doctorData as any;
    }
    // Remove sensitive fields from populated patient data
    if (rest.patient) {
      const { password, nik, birthDate, embedding, embeddingText, embeddingUpdatedAt, ...patientData } = rest.patient;
      if (patientData._id) patientData._id = patientData._id.toString();
      rest.patient = patientData as any;
    }
    return rest;
  },
});
