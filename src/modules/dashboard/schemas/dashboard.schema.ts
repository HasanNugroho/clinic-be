import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum DashboardType {
    ADMIN = 'admin',
    DOCTOR = 'doctor',
    PATIENT = 'patient',
}

@Schema({ timestamps: true })
export class DoctorStat {
    @ApiProperty({
        example: '507f1f77bcf86cd799439012',
        description: 'Doctor ID',
    })
    doctorId: string;

    @ApiProperty({
        example: 'Dr. John Doe',
        description: 'Doctor name',
    })
    doctorName: string;

    @ApiProperty({
        example: 10,
        description: 'Total registrations for the day',
    })
    totalRegistrations: number;

    @ApiProperty({
        example: 8,
        description: 'Total completed examinations for the day',
    })
    totalCompleted: number;
}

@Schema({ timestamps: true })
export class RegistrationMethodBreakdown {
    @ApiProperty({
        example: 15,
        description: 'Online registrations count',
    })
    online: number;

    @ApiProperty({
        example: 10,
        description: 'Offline registrations count',
    })
    offline: number;
}

@Schema({ timestamps: true })
export class Dashboard {
    @ApiProperty({
        example: '507f1f77bcf86cd799439011',
        description: 'Dashboard ID (MongoDB ObjectId)',
    })
    _id: string;

    @ApiProperty({
        example: '2025-01-08',
        description: 'Dashboard date in YYYY-MM-DD format',
    })
    @Prop({ type: String, required: true, index: true })
    date: string;

    @ApiProperty({
        example: 'admin',
        enum: DashboardType,
        description: 'Dashboard type/role',
    })
    @Prop({ type: String, enum: DashboardType, required: true, index: true })
    dashboardType: DashboardType;

    @ApiProperty({
        example: '507f1f77bcf86cd799439012',
        description: 'User ID (for doctor/patient dashboards)',
        required: false,
    })
    @Prop({ type: String, required: false, index: true })
    userId?: string;

    // --- Basic Counts ---
    @ApiProperty({
        example: 50,
        description: 'Total unique patients for the day',
    })
    @Prop({ type: Number, required: true, default: 0 })
    totalPatients: number;

    @ApiProperty({
        example: 45,
        description: 'Total registrations for the day',
    })
    @Prop({ type: Number, required: true, default: 0 })
    totalRegistrations: number;

    @ApiProperty({
        example: 35,
        description: 'Total completed examinations',
    })
    @Prop({ type: Number, required: true, default: 0 })
    totalCompleted: number;

    @ApiProperty({
        example: 8,
        description: 'Total waiting registrations',
    })
    @Prop({ type: Number, required: true, default: 0 })
    totalWaiting: number;

    @ApiProperty({
        example: 2,
        description: 'Total examining registrations',
    })
    @Prop({ type: Number, required: true, default: 0 })
    totalExamining: number;

    @ApiProperty({
        example: 0,
        description: 'Total cancelled registrations',
    })
    @Prop({ type: Number, required: true, default: 0 })
    totalCancelled: number;

    // --- Registration Method Breakdown ---
    @ApiProperty({
        type: Object,
        description: 'Registration method breakdown',
        example: {
            online: 25,
            offline: 20,
        },
    })
    @Prop({
        type: {
            online: { type: Number, default: 0 },
            offline: { type: Number, default: 0 },
        },
        required: true,
        default: { online: 0, offline: 0 },
    })
    registrationMethod: RegistrationMethodBreakdown;

    // --- Doctor Summary for the Day ---
    @ApiProperty({
        type: [Object],
        description: 'Doctor statistics for the day',
        example: [
            {
                doctorId: '507f1f77bcf86cd799439012',
                doctorName: 'Dr. John Doe',
                totalRegistrations: 10,
                totalCompleted: 8,
            },
        ],
    })
    @Prop({
        type: [
            {
                doctorId: String,
                doctorName: String,
                totalRegistrations: { type: Number, default: 0 },
                totalCompleted: { type: Number, default: 0 },
            },
        ],
        required: true,
        default: [],
    })
    doctorStats: DoctorStat[];

    // --- Monthly Data (for reports) ---
    @ApiProperty({
        example: 1200,
        description: 'Total examinations for the month',
        required: false,
    })
    @Prop({ type: Number, required: false })
    monthlyTotalExaminations?: number;

    @ApiProperty({
        example: 800,
        description: 'Total completed examinations for the month',
        required: false,
    })
    @Prop({ type: Number, required: false })
    monthlyCompleted?: number;

    @ApiProperty({
        example: 5.2,
        description: 'No-show rate percentage for the month',
        required: false,
    })
    @Prop({ type: Number, required: false })
    monthlyNoShowRate?: number;

    @ApiProperty({
        example: 2.1,
        description: 'Cancellation rate percentage for the month',
        required: false,
    })
    @Prop({ type: Number, required: false })
    monthlyCancellationRate?: number;

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

// Add indexes for better query performance
DashboardSchema.index({ date: 1, dashboardType: 1, userId: 1 }, { unique: true });
DashboardSchema.index({ date: 1, dashboardType: 1 });
DashboardSchema.index({ dashboardType: 1, userId: 1 });

DashboardSchema.set('toJSON', {
    virtuals: false,
    versionKey: false,
    transform: function (doc, ret) {
        const { __v, ...rest } = ret;
        if (rest._id) rest._id = rest._id.toString();
        return rest;
    },
});

DashboardSchema.set('toObject', {
    virtuals: false,
    versionKey: false,
    transform: function (doc, ret) {
        const { __v, ...rest } = ret;
        if (rest._id) rest._id = rest._id.toString();
        return rest;
    },
});
