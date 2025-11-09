import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { DoctorSchedulesModule } from './modules/doctorSchedules/doctor-schedules.module';
import { RegistrationsModule } from './modules/registrations/registrations.module';
import { ExaminationsModule } from './modules/examinations/examinations.module';
import { CommonModule } from './common/common.module';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/clinic',
      }),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: false,
      introspection: true,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
      context: ({ req }) => ({ req }),
      csrfPrevention: true,
      subscriptions: {
        'graphql-ws': true, // modern
        'subscriptions-transport-ws': true, // legacy,
      },
    }),
    CommonModule,
    UsersModule,
    AuthModule,
    DoctorSchedulesModule,
    RegistrationsModule,
    ExaminationsModule,
  ],
  providers: [],
})
export class AppModule {}
