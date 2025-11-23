import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

@Schema({ timestamps: true })
export class DoctorSchedule {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Doctor Schedule ID (MongoDB ObjectId)',
  })
  _id: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Doctor ID reference',
  })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  doctorId: string;

  @ApiProperty({
    enum: DayOfWeek,
    example: DayOfWeek.MONDAY,
    description: 'Day of week',
  })
  @Prop({ type: String, enum: DayOfWeek, required: true })
  dayOfWeek: DayOfWeek;

  @ApiProperty({
    example: '08:00',
    description: 'Schedule start time (HH:mm format)',
  })
  @Prop({ required: true })
  startTime: string;

  @ApiProperty({
    example: '17:00',
    description: 'Schedule end time (HH:mm format)',
  })
  @Prop({ required: true })
  endTime: string;

  @ApiProperty({
    example: '20',
    description: 'Patient quota per day',
  })
  @Prop({ required: true, default: 1 })
  quota: string;
}

export const DoctorScheduleSchema = SchemaFactory.createForClass(DoctorSchedule);

// Add indexes for better query performance
DoctorScheduleSchema.index({ doctorId: 1 });
DoctorScheduleSchema.index({ doctorId: 1, dayOfWeek: 1 });
DoctorScheduleSchema.index({ dayOfWeek: 1 });

DoctorScheduleSchema.set('toJSON', {
  virtuals: false,
  versionKey: false,
  transform: function (doc, ret) {
    const { __v, ...rest } = ret;
    rest._id = rest._id.toString();
    rest.doctorId = rest.doctorId.toString();
    return rest;
  },
});

DoctorScheduleSchema.set('toObject', {
  virtuals: false,
  versionKey: false,
  transform: function (doc, ret) {
    const { __v, ...rest } = ret;
    rest._id = rest._id.toString();
    rest.doctorId = rest.doctorId.toString();
    return rest;
  },
});
