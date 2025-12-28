import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum ClinicInfoCategory {
  OPEN_HOURS = 'open_hours',
  EXAMINATION_FLOW = 'examination_flow',
  SERVICES = 'services',
  REGISTRATION_INFO = 'registration_info',
}

@Schema({ timestamps: true })
export class ClinicInfo {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Clinic Info ID (MongoDB ObjectId)',
  })
  _id: string;

  @ApiProperty({
    example: 'Jam Operasional Klinik',
    description: 'Title of the clinic information',
  })
  @Prop({ type: String, required: true })
  title: string;

  @ApiProperty({
    example: ClinicInfoCategory.OPEN_HOURS,
    description: 'Category of the information',
    enum: ClinicInfoCategory,
  })
  @Prop({
    type: String,
    required: true,
    enum: Object.values(ClinicInfoCategory),
  })
  category: ClinicInfoCategory;

  @ApiProperty({
    example: 'Klinik buka setiap hari Senin - Jumat pukul 08:00 - 16:00 WIB',
    description: 'Detailed content of the clinic information',
  })
  @Prop({ type: String, required: true })
  content: string;

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
}

export const ClinicInfoSchema = SchemaFactory.createForClass(ClinicInfo);

ClinicInfoSchema.index({ category: 1 });

function transform(doc, ret: any) {
  delete ret.__v;

  if (ret._id) ret._id = ret._id.toString();

  return ret;
}

ClinicInfoSchema.set('toJSON', { virtuals: true, versionKey: false, transform });
ClinicInfoSchema.set('toObject', { virtuals: true, versionKey: false, transform });
