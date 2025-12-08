import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { Dashboard, DashboardSchema } from './schemas/dashboard.schema';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { DashboardCutoffJob } from './jobs/dashboard-cutoff.job';
import { Registration, RegistrationSchema } from '../registrations/schemas/registration.schema';
import { QdrantModule } from '../qdrant/qdrant.module';
import { DatabaseModule } from 'src/common/services/database.module';

@Module({
    imports: [
        DatabaseModule,
        ScheduleModule.forRoot(),
        QdrantModule,
    ],
    controllers: [DashboardController],
    providers: [DashboardService, DashboardCutoffJob],
    exports: [DashboardService],
})
export class DashboardModule { }
