/**
 * Service for managing Mongoose model registration and retrieval.
 * This service acts as a central registry for all Mongoose models in the application.
 * 
 * @module ModelRegistryService
 */

// src/common/services/model-registry.service.ts
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { ModelDefinition, ModelRegistry } from '../interface/model-registry.interface';

/**
 * Injectable service that implements the ModelRegistry interface.
 * Provides methods to register, retrieve, and list all Mongoose models.
 * 
 * @example
 * // Register a model
 * modelRegistry.registerModel('User', UserModel);
 * 
 * // Get a registered model
 * const userModel = modelRegistry.getModel('User');
 * 
 * // Get all registered models
 * const allModels = modelRegistry.getAllModels();
 */
@Injectable()
export class ModelRegistryService implements ModelRegistry {
    /** Internal storage for registered models */
    private models = new Map<string, Model<any>>();

    /**
     * Registers a Mongoose model with the registry
     * 
     * @param {string} name - The name to register the model under
     * @param {Model<any>} model - The Mongoose model to register
     * 
     * @example
     * modelRegistry.registerModel('User', UserModel);
     */
    registerModel(name: string, model: Model<any>): void {
        this.models.set(name, model);
    }

    /**
     * Retrieves a registered model by name
     * 
     * @param {string} name - The name of the model to retrieve
     * @returns {Model<any> | undefined} The registered model or undefined if not found
     * 
     * @example
     * const userModel = modelRegistry.getModel('User');
     * if (userModel) {
     *   const users = await userModel.find();
     * }
     */
    getModel(name: string): Model<any> | undefined {
        return this.models.get(name);
    }

    /**
     * Retrieves all registered models
     * 
     * @returns {ModelDefinition[]} Array of all registered models with their names
     * 
     * @example
     * const allModels = modelRegistry.getAllModels();
     * allModels.forEach(({ name, model }) => {
     *   console.log(`Model ${name} is registered`);
     * });
     */
    getAllModels(): ModelDefinition[] {
        return Array.from(this.models.entries()).map(([name, model]) => ({ name, model }));
    }
}