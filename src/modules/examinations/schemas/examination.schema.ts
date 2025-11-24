import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

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
