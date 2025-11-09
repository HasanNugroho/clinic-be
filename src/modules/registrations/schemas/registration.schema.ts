import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ObjectType, Field, registerEnumType, Int } from '@nestjs/graphql';
import { User } from 'src/modules/users/schemas/user.schema';
import { DoctorSchedule } from 'src/modules/doctorSchedules/schemas/doctor-schedule.schema';

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

// Register enums for GraphQL
registerEnumType(RegistrationMethod, {
    name: 'RegistrationMethod',
    description: 'Method of registration',
});

registerEnumType(RegistrationStatus, {
    name: 'RegistrationStatus',
    description: 'Current status of registration',
});

@ObjectType()
@Schema({ timestamps: true })
export class Registration {
    @Field(() => String)
    _id: string;

    @Field(() => User, { description: 'Patient ID reference to User collection' })
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    patientId: string;

    @Field(() => User, { description: 'Doctor ID reference to User collection' })
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    doctorId: string;

    @Field(() => DoctorSchedule, { description: 'Schedule ID reference to DoctorSchedule collection' })
    @Prop({ type: Types.ObjectId, ref: 'DoctorSchedule', required: true })
    scheduleId: string;

    @Field({ description: 'Date of registration' })
    @Prop({ type: Date, required: true })
    registrationDate: Date;

    @Field(() => RegistrationMethod, { description: 'Registration method' })
    @Prop({ type: String, enum: RegistrationMethod, required: true })
    registrationMethod: RegistrationMethod;

    @Field(() => RegistrationStatus, { description: 'Current patient status' })
    @Prop({ type: String, enum: RegistrationStatus, default: RegistrationStatus.WAITING })
    status: RegistrationStatus;

    @Field(() => Int, { description: 'Auto-generated queue number' })
    @Prop({ required: true })
    queueNumber: number;

    @Field({ nullable: true, description: 'Record creation timestamp' })
    createdAt?: Date;

    @Field({ nullable: true, description: 'Record update timestamp' })
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
