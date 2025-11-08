import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export type RegistrationDocument = Registration & Document;

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
    @Transform(({ obj }) => obj._id.toString())
    _id: string;

    @ApiProperty({ description: 'Patient ID reference to User collection' })
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    patientId: string;

    @ApiProperty({ description: 'Doctor ID reference to User collection' })
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    doctorId: string;

    @ApiProperty({ description: 'Schedule ID reference to DoctorSchedule collection' })
    @Prop({ type: Types.ObjectId, ref: 'DoctorSchedule', required: true })
    scheduleId: string;

    @ApiProperty({ description: 'Date of registration' })
    @Prop({ type: Date, required: true })
    registrationDate: Date;

    @ApiProperty({ description: 'Registration method', enum: RegistrationMethod })
    @Prop({ type: String, enum: RegistrationMethod, required: true })
    registrationMethod: RegistrationMethod;

    @ApiProperty({ description: 'Current patient status', enum: RegistrationStatus })
    @Prop({ type: String, enum: RegistrationStatus, default: RegistrationStatus.WAITING })
    status: RegistrationStatus;

    @ApiProperty({ description: 'Auto-generated queue number' })
    @Prop({ required: true })
    queueNumber: number;

    @ApiProperty({ description: 'Record creation timestamp' })
    createdAt?: Date;

    @ApiProperty({ description: 'Record update timestamp' })
    updatedAt?: Date;
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
