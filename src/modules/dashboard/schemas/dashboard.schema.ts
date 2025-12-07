import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';

export interface DoctorStat {
    doctorId: string;
    doctorName: string;
    totalRegistrations: number;
    totalCompleted: number;
}

export interface RegistrationMethodBreakdown {
    online: number;
    offline: number;
}

@Schema({ timestamps: true })
export class Dashboard {
    @ApiProperty({
        example: '507f1f77bcf86cd799439011',
        description: 'Dashboard ID (MongoDB ObjectId)',
    })
    _id?: string;

    @ApiProperty({
        example: '2025-01-08',
        description: 'Dashboard date in format YYYY-MM-DD',
    })
    @Prop({ type: String, required: true, unique: true, index: true })
    date!: string;

    @ApiProperty({
        example: 45,
        description: 'Total unique patients with registrations on this date',
    })
    @Prop({ type: Number, required: true, default: 0 })
    totalPatients!: number;

    @ApiProperty({
        example: 120,
        description: 'Total registrations on this date',
    })
    @Prop({ type: Number, required: true, default: 0 })
    totalRegistrations!: number;

    @ApiProperty({
        example: 85,
        description: 'Total completed registrations on this date',
    })
    @Prop({ type: Number, required: true, default: 0 })
    totalCompleted!: number;

    @ApiProperty({
        example: 25,
        description: 'Total waiting registrations on this date',
    })
    @Prop({ type: Number, required: true, default: 0 })
    totalWaiting!: number;

    @ApiProperty({
        example: 8,
        description: 'Total examining registrations on this date',
    })
    @Prop({ type: Number, required: true, default: 0 })
    totalExamining!: number;

    @ApiProperty({
        example: 2,
        description: 'Total cancelled registrations on this date',
    })
    @Prop({ type: Number, required: true, default: 0 })
    totalCancelled!: number;

    @ApiProperty({
        type: Object,
        description: 'Registration method breakdown',
        example: {
            online: 70,
            offline: 50,
        },
    })
    @Prop({
        type: {
            online: { type: Number, default: 0 },
            offline: { type: Number, default: 0 },
        },
        required: true,
    })
    registrationMethod!: RegistrationMethodBreakdown;

    @ApiProperty({
        type: Array,
        description: 'Doctor statistics for this date',
        example: [
            {
                doctorId: '507f1f77bcf86cd799439012',
                doctorName: 'Dr. John Doe',
                totalRegistrations: 25,
                totalCompleted: 20,
            },
        ],
    })
    @Prop({
        type: [
            {
                doctorId: { type: String, required: true },
                doctorName: { type: String, required: true },
                totalRegistrations: { type: Number, required: true },
                totalCompleted: { type: Number, required: true },
            },
        ],
        required: true,
        default: [],
    })
    doctorStats!: DoctorStat[];

    @ApiProperty({
        example: '2025-01-08T23:45:00Z',
        description: 'Created timestamp',
    })
    createdAt?: Date;

    @ApiProperty({
        example: '2025-01-08T23:45:00Z',
        description: 'Updated timestamp',
    })
    updatedAt?: Date;
}

export const DashboardSchema = SchemaFactory.createForClass(Dashboard);

function transform(doc: any, ret: any): any {
    delete ret.__v;

    if (ret._id) {
        ret._id = ret._id.toString();
    }

    return ret;
}

DashboardSchema.set('toJSON', { versionKey: false, transform });
DashboardSchema.set('toObject', { versionKey: false, transform });
