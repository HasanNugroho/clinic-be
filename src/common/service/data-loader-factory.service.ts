/**
 * Factory service for creating DataLoader instances with a convenient API.
 * Provides a simple way to initialize multiple loaders at once.
 * 
 * @module DataLoaderFactory
 */

import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/modules/users/schemas/user.schema';
import { DoctorSchedule } from 'src/modules/doctorSchedules/schemas/doctor-schedule.schema';
import { Registration } from 'src/modules/registrations/schemas/registration.schema';
import { Examination } from 'src/modules/examinations/schemas/examination.schema';

/**
 * Configuration options for a DataLoader
 */
export interface LoaderConfig {
    /** The field to use as the key for batching (default: '_id') */
    key?: string;
    /** Whether to enable caching (default: true) */
    cache?: boolean;
    /** Maximum batch size (default: unlimited) */
    maxBatchSize?: number;
}

/**
 * Configuration for all loaders
 */
export interface LoadersConfig {
    User?: LoaderConfig;
    DoctorSchedule?: LoaderConfig;
    Registration?: LoaderConfig;
    Examination?: LoaderConfig;
}

/**
 * Return type containing all created loaders
 */
export interface Loaders {
    userLoader?: DataLoader<any, any>;
    doctorScheduleLoader?: DataLoader<any, any>;
    registrationLoader?: DataLoader<any, any>;
    examinationLoader?: DataLoader<any, any>;
}

/**
 * Factory service for creating DataLoader instances.
 * Simplifies the creation of multiple loaders with custom configurations.
 * 
 * @example
 * constructor(private readonly dataLoaderFactory: DataLoaderFactory) {
 *   const loaders = this.dataLoaderFactory.createLoaders({
 *     User: { key: '_id', cache: true },
 *     Registration: { key: 'patientId', cache: true },
 *   });
 *   this.userLoader = loaders.userLoader;
 *   this.registrationLoader = loaders.registrationLoader;
 * }
 */
@Injectable()
export class DataLoaderFactory {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<User>,
        @InjectModel(DoctorSchedule.name) private readonly doctorScheduleModel: Model<DoctorSchedule>,
        @InjectModel(Registration.name) private readonly registrationModel: Model<Registration>,
        @InjectModel(Examination.name) private readonly examinationModel: Model<Examination>,
    ) { }

    /**
     * Creates DataLoader instances based on the provided configuration.
     * Only creates loaders for models specified in the config.
     * 
     * @param {LoadersConfig} config - Configuration for each model's loader
     * @returns {Loaders} Object containing the created DataLoader instances
     * 
     * @example
     * const loaders = factory.createLoaders({
     *   User: { key: '_id', cache: true },
     *   Registration: { key: 'patientId' },
     * });
     */
    createLoaders(config: LoadersConfig): Loaders {
        const loaders: Loaders = {};

        if (config.User) {
            loaders.userLoader = this.createLoader(this.userModel, config.User);
        }

        if (config.DoctorSchedule) {
            loaders.doctorScheduleLoader = this.createLoader(this.doctorScheduleModel, config.DoctorSchedule);
        }

        if (config.Registration) {
            loaders.registrationLoader = this.createLoader(this.registrationModel, config.Registration);
        }

        if (config.Examination) {
            loaders.examinationLoader = this.createLoader(this.examinationModel, config.Examination);
        }

        return loaders;
    }

    /**
     * Creates a single DataLoader for a specific model.
     * 
     * @param {Model<any>} model - The Mongoose model
     * @param {LoaderConfig} config - Configuration options
     * @returns {DataLoader<any, any>} A new DataLoader instance
     * 
     * @private
     */
    private createLoader(model: Model<any>, config: LoaderConfig = {}): DataLoader<any, any> {
        const keyField = config.key || '_id';

        return new DataLoader(
            async (keys: readonly any[]) => {
                // Batch load documents by keys
                const documents = await model.find({
                    [keyField]: { $in: keys as any[] }
                }).exec();

                // Create a map for O(1) lookup
                const documentMap = new Map();
                documents.forEach(doc => {
                    const key = doc[keyField]?.toString() || doc[keyField];
                    documentMap.set(key, doc);
                });

                // Return documents in the same order as keys
                return keys.map(key => {
                    const keyStr = key?.toString() || key;
                    return documentMap.get(keyStr) || null;
                });
            },
            {
                cache: config.cache !== false,
                maxBatchSize: config.maxBatchSize,
            }
        );
    }

    /**
     * Creates a DataLoader for one-to-many relationships.
     * Returns arrays of documents for each key.
     * 
     * @param {Model<any>} model - The Mongoose model
     * @param {string} referenceField - The field that contains the reference
     * @param {LoaderConfig} config - Configuration options
     * @returns {DataLoader<any, any[]>} A DataLoader that returns arrays
     * 
     * @example
     * const registrationLoader = factory.createManyLoader(
     *   registrationModel,
     *   'patientId',
     *   { cache: true }
     * );
     */
    createManyLoader(
        model: Model<any>,
        referenceField: string,
        config: LoaderConfig = {}
    ): DataLoader<any, any[]> {
        return new DataLoader(
            async (keys: readonly any[]) => {
                // Batch load documents by reference field
                const documents = await model.find({
                    [referenceField]: { $in: keys as any[] }
                }).exec();

                // Group documents by reference field
                const documentsByKey = new Map<string, any[]>();
                documents.forEach(doc => {
                    const key = doc[referenceField]?.toString() || doc[referenceField];
                    if (!documentsByKey.has(key)) {
                        documentsByKey.set(key, []);
                    }
                    documentsByKey.get(key)!.push(doc);
                });

                // Return arrays in the same order as keys
                return keys.map(key => {
                    const keyStr = key?.toString() || key;
                    return documentsByKey.get(keyStr) || [];
                });
            },
            {
                cache: config.cache !== false,
                maxBatchSize: config.maxBatchSize,
            }
        );
    }
}
