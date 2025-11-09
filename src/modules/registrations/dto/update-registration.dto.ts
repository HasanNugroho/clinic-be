import { IsEnum, IsOptional } from 'class-validator';
import { RegistrationStatus } from '../schemas/registration.schema';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateRegistrationDto {
    @Field(() => RegistrationStatus, { description: 'Current patient status', nullable: true })
    @IsOptional()
    @IsEnum(RegistrationStatus)
    status?: RegistrationStatus;
}
