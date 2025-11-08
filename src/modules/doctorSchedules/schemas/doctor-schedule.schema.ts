import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export type DoctorScheduleDocument = DoctorSchedule & Document;

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
    @Transform(({ obj }) => obj._id.toString())
    _id: string;

    @ApiProperty({ description: 'Doctor ID reference to User collection' })
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    doctorId: string;

    @ApiProperty({ description: 'Day of the week', enum: DayOfWeek })
    @Prop({ type: String, enum: DayOfWeek, required: true })
    dayOfWeek: DayOfWeek;

    @ApiProperty({ description: 'Start time of doctor shift (HH:mm format)' })
    @Prop({ required: true })
    startTime: string;

    @ApiProperty({ description: 'End time of doctor shift (HH:mm format)' })
    @Prop({ required: true })
    endTime: string;

    @ApiProperty({ description: 'The quota per day' })
    @Prop({ required: true, default: 1 })
    quota: string;
}

export const DoctorScheduleSchema = SchemaFactory.createForClass(DoctorSchedule);

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