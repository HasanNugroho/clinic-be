import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/schemas/user.schema';

export enum DayOfWeek {
  SENIN = 'senin',
  SELASA = 'selasa',
  RABU = 'rabu',
  KAMIS = 'kamis',
  JUMAT = 'jumat',
  SABTU = 'sabtu',
  MINGGU = 'minggu',
  HARI_KERJA = 'hari kerja',
  AKHIR_PEKAN = 'akhir pekan',
}

@Schema({ timestamps: true })
export class DoctorSchedule {
  @ApiProperty()
  _id: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Doctor ID reference',
  })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  doctorId: string;

  @ApiProperty({ enum: DayOfWeek })
  @Prop({ type: String, enum: DayOfWeek, required: true })
  dayOfWeek: DayOfWeek;

  @ApiProperty()
  @Prop({ required: true })
  startTime: string;

  @ApiProperty()
  @Prop({ required: true })
  endTime: string;

  @ApiProperty()
  @Prop({ required: true, default: 1 })
  quota: string;

  @ApiProperty({
    required: false,
    type: User,
  })
  doctor?: User;
}

export const DoctorScheduleSchema = SchemaFactory.createForClass(DoctorSchedule);

/* ---------------------------------------------
   VIRTUAL POPULATE -> doctor
---------------------------------------------- */
DoctorScheduleSchema.virtual('doctor', {
  ref: 'User',
  localField: 'doctorId',
  foreignField: '_id',
  justOne: true,
});

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

  return ret;
}

DoctorScheduleSchema.set('toJSON', { virtuals: true, versionKey: false, transform });
DoctorScheduleSchema.set('toObject', { virtuals: true, versionKey: false, transform });

/* --------------------------------------------- */

DoctorScheduleSchema.index({ doctorId: 1 });
DoctorScheduleSchema.index({ doctorId: 1, dayOfWeek: 1 });
DoctorScheduleSchema.index({ dayOfWeek: 1 });
