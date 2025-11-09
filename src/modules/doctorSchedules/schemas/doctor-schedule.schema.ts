import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ObjectType, Field, registerEnumType, ID } from '@nestjs/graphql';
import { User } from 'src/modules/users/schemas/user.schema';


export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

// Register enum for GraphQL
registerEnumType(DayOfWeek, {
  name: 'DayOfWeek',
  description: 'Day of the week',
});

@ObjectType()
@Schema({ timestamps: true })
export class DoctorSchedule {
  @Field(() => ID)
  _id: string;

  @Field(() => User, { description: 'Doctor ID reference to User collection' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  doctorId: string;

  @Field(() => DayOfWeek, { description: 'Day of the week' })
  @Prop({ type: String, enum: DayOfWeek, required: true })
  dayOfWeek: DayOfWeek;

  @Field({ description: 'Start time of doctor shift (HH:mm format)' })
  @Prop({ required: true })
  startTime: string;

  @Field({ description: 'End time of doctor shift (HH:mm format)' })
  @Prop({ required: true })
  endTime: string;

  @Field({ description: 'The quota per day' })
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
