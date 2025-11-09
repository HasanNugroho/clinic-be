import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { User } from 'src/modules/users/schemas/user.schema';
import { Registration } from 'src/modules/registrations/schemas/registration.schema';

export type ExaminationDocument = Examination & Document;

export enum ExaminationStatus {
    COMPLETED = 'completed',
    PENDING = 'pending',
}

// Register enum for GraphQL
registerEnumType(ExaminationStatus, {
    name: 'ExaminationStatus',
    description: 'Status of examination',
});

@ObjectType()
@Schema({ timestamps: true })
export class Examination {
    @Field(() => String)
    _id: string;

    @Field(() => Registration, { description: 'Registration ID reference to Registration collection' })
    @Prop({ type: Types.ObjectId, ref: 'Registration', required: true })
    registrationId: string;

    @Field(() => User, { description: 'Doctor ID reference to User collection' })
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    doctorId: string;

    @Field(() => User, { description: 'Patient ID reference to User collection' })
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    patientId: string;

    @Field({ description: 'Date of examination' })
    @Prop({ type: Date, required: true })
    examinationDate: Date;

    @Field({ description: 'Brief diagnosis summary' })
    @Prop({ type: String, required: true })
    diagnosisSummary: string;

    @Field({ description: 'Additional notes from doctor' })
    @Prop({ type: String, required: true })
    doctorNotes: string;

    @Field(() => ExaminationStatus, { description: 'Examination status' })
    @Prop({ type: String, enum: ExaminationStatus, default: ExaminationStatus.PENDING })
    status: ExaminationStatus;

    @Field({ nullable: true, description: 'Record creation timestamp' })
    createdAt?: Date;

    @Field({ nullable: true, description: 'Record update timestamp' })
    updatedAt?: Date;
}

export const ExaminationSchema = SchemaFactory.createForClass(Examination);

// Add indexes for better query performance
ExaminationSchema.index({ registrationId: 1 });
ExaminationSchema.index({ doctorId: 1, examinationDate: 1 });
ExaminationSchema.index({ patientId: 1, examinationDate: 1 });
ExaminationSchema.index({ status: 1 });

ExaminationSchema.set('toJSON', {
    virtuals: false,
    versionKey: false,
    transform: function (doc, ret) {
        const { __v, ...rest } = ret;
        rest._id = rest._id.toString();
        if (rest.registrationId) rest.registrationId = rest.registrationId.toString();
        if (rest.doctorId) rest.doctorId = rest.doctorId.toString();
        if (rest.patientId) rest.patientId = rest.patientId.toString();
        return rest;
    },
});

ExaminationSchema.set('toObject', {
    virtuals: false,
    versionKey: false,
    transform: function (doc, ret) {
        const { __v, ...rest } = ret;
        rest._id = rest._id.toString();
        if (rest.registrationId) rest.registrationId = rest.registrationId.toString();
        if (rest.doctorId) rest.doctorId = rest.doctorId.toString();
        if (rest.patientId) rest.patientId = rest.patientId.toString();
        return rest;
    },
});
