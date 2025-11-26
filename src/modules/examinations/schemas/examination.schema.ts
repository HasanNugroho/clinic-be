import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/schemas/user.schema';
import { Registration } from 'src/modules/registrations/schemas/registration.schema';

export enum ExaminationStatus {
  COMPLETED = 'completed',
  PENDING = 'pending',
}

@Schema({ timestamps: true })
export class Examination {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Examination ID (MongoDB ObjectId)',
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
    description: 'Doctor ID reference',
  })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  doctorId: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439014',
    description: 'Patient ID reference',
  })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patientId: string;

  @ApiProperty({
    example: '2024-01-21',
    description: 'Examination date',
  })
  @Prop({ type: Date, required: true })
  examinationDate: Date;

  @ApiProperty({
    example: 'Patient has hypertension. Recommended medication and lifestyle changes.',
    description: 'Diagnosis summary',
  })
  @Prop({ type: String, required: true })
  diagnosisSummary: string;

  @ApiProperty({
    example: 'Blood pressure: 140/90. Heart rate: 78 bpm. No abnormalities detected.',
    description: 'Doctor notes',
  })
  @Prop({ type: String, required: true })
  doctorNotes: string;

  @ApiProperty({
    enum: ExaminationStatus,
    example: ExaminationStatus.PENDING,
    description: 'Examination status',
  })
  @Prop({ type: String, enum: ExaminationStatus, default: ExaminationStatus.PENDING })
  status: ExaminationStatus;

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
    description: 'Populated doctor data (from $lookup)',
    required: false,
    example: {
      _id: '507f1f77bcf86cd799439012',
      fullName: 'Dr. John Doe',
      email: 'john.doe@example.com',
      gender: 'M',
      specialization: 'Cardiology',
    },
  })
  doctor?: User;

  @ApiProperty({
    type: Object,
    description: 'Populated patient data (from $lookup)',
    required: false,
    example: {
      _id: '507f1f77bcf86cd799439013',
      fullName: 'Jane Smith',
      email: 'jane.smith@example.com',
      gender: 'F',
    },
  })
  patient?: User;

  registration?: Registration;
}

export const ExaminationSchema = SchemaFactory.createForClass(Examination);

ExaminationSchema.virtual('doctor', {
  ref: 'User',
  localField: 'doctorId',
  foreignField: '_id',
  justOne: true,
});

ExaminationSchema.virtual('patient', {
  ref: 'User',
  localField: 'patientId',
  foreignField: '_id',
  justOne: true,
});

ExaminationSchema.virtual('registration', {
  ref: 'Registration',
  localField: 'registrationId',
  foreignField: '_id',
  justOne: true,
});

// Add indexes for better query performance
ExaminationSchema.index({ registrationId: 1 });
ExaminationSchema.index({ doctorId: 1, examinationDate: 1 });
ExaminationSchema.index({ patientId: 1, examinationDate: 1 });
ExaminationSchema.index({ status: 1 });

/* ---------------------------------------------
   TRANSFORM TO JSON / TO OBJECT
---------------------------------------------- */
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

  if (ret.registrationId && typeof ret.registrationId === 'object') {
    ret.registrationId = ret.registrationId.toString();
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

  if (ret.registration) {
    const { patientId, doctorId, scheduleId, id, __v, ...safeRegistration } = ret.registration;

    safeRegistration._id = safeRegistration._id.toString();
    ret.registration = safeRegistration;
  }

  return ret;
}

ExaminationSchema.set('toJSON', { virtuals: true, versionKey: false, transform });
ExaminationSchema.set('toObject', { virtuals: true, versionKey: false, transform });
