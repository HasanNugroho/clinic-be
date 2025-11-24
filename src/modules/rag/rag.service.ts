import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Registration } from '../registrations/schemas/registration.schema';
import { Examination } from '../examinations/schemas/examination.schema';
import { DoctorSchedule } from '../doctorSchedules/schemas/doctor-schedule.schema';
import { EmbeddingService } from '../../common/services/embedding/embedding.service';
import { User, UserRole } from '../users/schemas/user.schema';

@Injectable()
export class RagService {
    private readonly logger = new Logger(RagService.name);

    constructor(
        @InjectModel(Registration.name)
        private registrationModel: Model<Registration>,
        @InjectModel(Examination.name)
        private examinationModel: Model<Examination>,
        @InjectModel(DoctorSchedule.name)
        private doctorScheduleModel: Model<DoctorSchedule>,
        @InjectModel(User.name)
        private userModel: Model<User>,
        private embeddingService: EmbeddingService,
    ) { }

    /**
     * Query RAG system with vector similarity search
     * @param query - User query string
     * @param userRole - Role of the user making the query
     * @param userId - ID of the user making the query
     * @param limit - Number of results to return
     * @returns Array of relevant documents
     */
    async query(
        query: string,
        userRole: UserRole,
        userId: string,
        limit: number = 5,
    ): Promise<any[]> {
        try {
            // Generate embedding for the query
            const queryEmbedding = await this.embeddingService.generateEmbedding(query);

            const results: any[] = [];
            const scheduleResults = await this.searchDoctorSchedules(queryEmbedding, limit);
            results.push(...scheduleResults)
            // Search based on user role
            if (userRole === UserRole.PATIENT) {
                // Patients can search doctor schedules and their own examinations
                // const scheduleResults = await this.searchDoctorSchedules(queryEmbedding, limit);
                const examinationResults = await this.searchExaminationsByPatient(
                    queryEmbedding,
                    userId,
                    limit,
                );

                results.push(...examinationResults);
            } else if (userRole === UserRole.DOCTOR) {
                // Doctors can search their own examinations and registrations
                const examinationResults = await this.searchExaminationsByDoctor(
                    queryEmbedding,
                    userId,
                    limit,
                );
                const registrationResults = await this.searchRegistrationsByDoctor(
                    queryEmbedding,
                    userId,
                    limit,
                );

                results.push(...examinationResults, ...registrationResults);
            } else if (userRole === UserRole.SUPERADMIN || userRole === UserRole.EMPLOYEE) {
                // Superadmins and employees can search all data
                const registrationResults = await this.searchRegistrations(queryEmbedding, limit);
                const examinationResults = await this.searchExaminations(queryEmbedding, limit);

                results.push(...registrationResults, ...examinationResults);
            }

            // Sort by similarity score and limit results
            return results
                .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
                .slice(0, limit);
        } catch (error) {
            this.logger.error(`RAG query failed: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Search doctor schedules by vector similarity
     */
    private async searchDoctorSchedules(
        embedding: number[],
        limit: number,
    ): Promise<any[]> {
        try {

            const results = await this.doctorScheduleModel.aggregate([
                {
                    $vectorSearch: {
                        index: `doctorschedules_embedding`,
                        path: 'embedding',
                        queryVector: embedding,
                        numCandidates: 100,
                        limit: 10,
                        // filter: filters,
                    },
                },
                {
                    $project: {
                        score: { $meta: 'vectorSearchScore' },
                        _id: 1,
                        dayOfWeek: 1,
                        startTime: 1,
                        endTime: 1,
                        quota: 1,
                        doctorId: 1,
                        similarity: { $meta: 'searchScore' },
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'doctorId',
                        foreignField: '_id',
                        as: 'doctor',
                    },
                },
                {
                    $unwind: {
                        path: '$doctor',
                        preserveNullAndEmptyArrays: true,
                    },
                },
            ]);

            return results.map(doc => ({
                ...doc,
                type: 'doctor_schedule',
            }));
        } catch (error) {
            this.logger.warn(`Doctor schedule search failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Search registrations by vector similarity
     */
    private async searchRegistrations(
        embedding: number[],
        limit: number,
    ): Promise<any[]> {
        try {
            const results = await this.registrationModel.aggregate([
                {
                    $search: {
                        cosmosSearch: {
                            vector: embedding,
                            k: limit,
                        },
                        returnScore: true,
                    },
                },
                {
                    $project: {
                        _id: 1,
                        patientId: 1,
                        doctorId: 1,
                        registrationDate: 1,
                        registrationMethod: 1,
                        status: 1,
                        queueNumber: 1,
                        embeddingText: 1,
                        similarity: { $meta: 'searchScore' },
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'patientId',
                        foreignField: '_id',
                        as: 'patient',
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'doctorId',
                        foreignField: '_id',
                        as: 'doctor',
                    },
                },
                {
                    $unwind: {
                        path: '$patient',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $unwind: {
                        path: '$doctor',
                        preserveNullAndEmptyArrays: true,
                    },
                },
            ]);

            return results.map(doc => ({
                ...doc,
                type: 'registration',
            }));
        } catch (error) {
            this.logger.warn(`Registration search failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Search registrations by doctor
     */
    private async searchRegistrationsByDoctor(
        embedding: number[],
        doctorId: string,
        limit: number,
    ): Promise<any[]> {
        try {
            const results = await this.registrationModel.aggregate([
                {
                    $match: {
                        doctorId: { $oid: doctorId },
                    },
                },
                {
                    $search: {
                        cosmosSearch: {
                            vector: embedding,
                            k: limit,
                        },
                        returnScore: true,
                    },
                },
                {
                    $project: {
                        _id: 1,
                        patientId: 1,
                        doctorId: 1,
                        registrationDate: 1,
                        registrationMethod: 1,
                        status: 1,
                        queueNumber: 1,
                        embeddingText: 1,
                        similarity: { $meta: 'searchScore' },
                    },
                },
            ]);

            return results.map(doc => ({
                ...doc,
                type: 'registration',
            }));
        } catch (error) {
            this.logger.warn(`Doctor registration search failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Search examinations by vector similarity
     */
    private async searchExaminations(
        embedding: number[],
        limit: number,
    ): Promise<any[]> {
        try {
            const results = await this.examinationModel.aggregate([
                {
                    $search: {
                        cosmosSearch: {
                            vector: embedding,
                            k: limit,
                        },
                        returnScore: true,
                    },
                },
                {
                    $project: {
                        _id: 1,
                        patientId: 1,
                        doctorId: 1,
                        examinationDate: 1,
                        diagnosisSummary: 1,
                        doctorNotes: 1,
                        status: 1,
                        embeddingText: 1,
                        similarity: { $meta: 'searchScore' },
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'patientId',
                        foreignField: '_id',
                        as: 'patient',
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'doctorId',
                        foreignField: '_id',
                        as: 'doctor',
                    },
                },
                {
                    $unwind: {
                        path: '$patient',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $unwind: {
                        path: '$doctor',
                        preserveNullAndEmptyArrays: true,
                    },
                },
            ]);

            return results.map(doc => ({
                ...doc,
                type: 'examination',
            }));
        } catch (error) {
            this.logger.warn(`Examination search failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Search examinations by patient
     */
    private async searchExaminationsByPatient(
        embedding: number[],
        patientId: string,
        limit: number,
    ): Promise<any[]> {
        try {
            const results = await this.examinationModel.aggregate([
                {
                    $match: {
                        patientId: { $oid: patientId },
                    },
                },
                {
                    $search: {
                        cosmosSearch: {
                            vector: embedding,
                            k: limit,
                        },
                        returnScore: true,
                    },
                },
                {
                    $project: {
                        _id: 1,
                        patientId: 1,
                        doctorId: 1,
                        examinationDate: 1,
                        diagnosisSummary: 1,
                        doctorNotes: 1,
                        status: 1,
                        embeddingText: 1,
                        similarity: { $meta: 'searchScore' },
                    },
                },
            ]);

            return results.map(doc => ({
                ...doc,
                type: 'examination',
            }));
        } catch (error) {
            this.logger.warn(`Patient examination search failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Search examinations by doctor
     */
    private async searchExaminationsByDoctor(
        embedding: number[],
        doctorId: string,
        limit: number,
    ): Promise<any[]> {
        try {
            const results = await this.examinationModel.aggregate([
                {
                    $match: {
                        doctorId: { $oid: doctorId },
                    },
                },
                {
                    $search: {
                        cosmosSearch: {
                            vector: embedding,
                            k: limit,
                        },
                        returnScore: true,
                    },
                },
                {
                    $project: {
                        _id: 1,
                        patientId: 1,
                        doctorId: 1,
                        examinationDate: 1,
                        diagnosisSummary: 1,
                        doctorNotes: 1,
                        status: 1,
                        embeddingText: 1,
                        similarity: { $meta: 'searchScore' },
                    },
                },
            ]);

            return results.map(doc => ({
                ...doc,
                type: 'examination',
            }));
        } catch (error) {
            this.logger.warn(`Doctor examination search failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Health check for RAG system
     */
    async healthCheck(): Promise<{ status: string; timestamp: Date }> {
        return {
            status: 'healthy',
            timestamp: new Date(),
        };
    }
}
