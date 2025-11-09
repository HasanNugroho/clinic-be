/**
 * Interfaces for the Model Registry system that manages Mongoose models.
 * These interfaces define the contract for model registration and retrieval
 * used throughout the application.
 * 
 * @module ModelRegistryInterfaces
 */

import { Model } from 'mongoose';

export interface ModelDefinition {
    name: string;
    model: Model<any>;
}

export interface ModelRegistry {
    /**
     * Registers a Mongoose model with the registry under a specific name.
     * 
     * @param {string} name - The name to register the model under
     * @param {Model<any>} model - The Mongoose model to register
     * 
     * @example
     * registry.registerModel('User', UserModel);
     */
    registerModel(name: string, model: Model<any>): void;

    /**
     * Retrieves a registered model by its name.
     * 
     * @param {string} name - The name of the model to retrieve
     * @returns {Model<any> | undefined} The registered model or undefined if not found
     * 
     * @example
     * const userModel = registry.getModel('User');
     * if (userModel) {
     *   const users = await userModel.find();
     * }
     */
    getModel(name: string): Model<any> | undefined;

    /**
     * Retrieves all registered models with their names.
     * Useful for operations that need to work with all models,
     * such as DataLoader initialization.
     * 
     * @returns {ModelDefinition[]} Array of all registered models with their names
     * 
     * @example
     * const allModels = registry.getAllModels();
     * allModels.forEach(({ name, model }) => {
     *   // Initialize DataLoader for each model
     *   loaders[name] = createDataLoader(model);
     * });
     */
    getAllModels(): ModelDefinition[];
}