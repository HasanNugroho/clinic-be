import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { Dashboard, DashboardSchema } from './schemas/dashboard.schema';
import { DashboardService } from './services/dashboard.service';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardCutoffJob } from './jobs/dashboard-cutoff.job';
import { Registration, RegistrationSchema } from '../registrations/schemas/registration.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Dashboard.name, schema: DashboardSchema },
            { name: Registration.name, schema: RegistrationSchema },
        ]),
        ScheduleModule.forRoot(),
    ],
    controllers: [DashboardController],
    providers: [DashboardService, DashboardCutoffJob],
    exports: [DashboardService],
})
export class DashboardModule { }
