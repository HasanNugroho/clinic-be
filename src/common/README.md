# Common Module

This module provides shared services and utilities used across the application.

## DataLoaderFactory

The `DataLoaderFactory` service provides an efficient way to batch and cache database queries, solving the N+1 query problem.

### Features

- **Batch Loading**: Automatically batches multiple requests into a single database query
- **Caching**: Caches results within a request context to avoid duplicate queries
- **Flexible Configuration**: Configure key fields, cache settings, and batch sizes per model
- **Type-Safe**: Full TypeScript support with proper typing

### Supported Models

- `User`
- `DoctorSchedule`
- `Registration`
- `Examination`

### Basic Usage

```typescript
import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { DataLoaderFactory } from './common/service/data-loader-factory.service';

@Injectable()
export class YourService {
    private userLoader: DataLoader<any, any>;

    constructor(
        private readonly dataLoaderFactory: DataLoaderFactory,
    ) {
        // Initialize loaders
        const loaders = this.dataLoaderFactory.createLoaders({
            User: {
                key: '_id',
                cache: true,
            },
        });
        this.userLoader = loaders.userLoader!;
    }

    async getUser(userId: string) {
        // This will be batched with other load() calls
        return await this.userLoader.load(userId);
    }

    async getUsers(userIds: string[]) {
        // Load multiple users in a single query
        return await this.userLoader.loadMany(userIds);
    }
}
```

### Configuration Options

```typescript
interface LoaderConfig {
    /** The field to use as the key for batching (default: '_id') */
    key?: string;
    /** Whether to enable caching (default: true) */
    cache?: boolean;
    /** Maximum batch size (default: unlimited) */
    maxBatchSize?: number;
}
```

### Advanced Usage

#### Load by Custom Field

```typescript
// Load users by email instead of _id
const loaders = this.dataLoaderFactory.createLoaders({
    User: {
        key: 'email',
        cache: true,
    },
});

const user = await loaders.userLoader!.load('user@example.com');
```

#### One-to-Many Relationships

```typescript
// Load all registrations for multiple patients
const registrationLoader = this.dataLoaderFactory.createManyLoader(
    registrationModel,
    'patientId',
    { cache: true }
);

// Returns an array of registrations for each patient
const registrations = await registrationLoader.loadMany(['patient1', 'patient2']);
```

#### Cache Management

```typescript
// Clear cache for a specific key
this.userLoader.clear(userId);

// Clear all cached values
this.userLoader.clearAll();

// Prime the cache with a known value
this.userLoader.prime(userId, userObject);
```

### Best Practices

1. **Initialize Once**: Create loaders in the constructor, not in methods
2. **Clear Cache**: Clear caches after mutations to avoid stale data
3. **Use Appropriate Keys**: Choose the right key field based on your query patterns
4. **Batch Similar Operations**: Group related load() calls together for better batching

### Example: Resolving Nested Data

```typescript
async getRegistrationsWithPatients(registrationIds: string[]) {
    // Load registrations
    const registrations = await this.registrationLoader.loadMany(registrationIds);
    
    // Extract patient IDs
    const patientIds = registrations.map(r => r.patientId);
    
    // Batch load all patients in a single query
    const patients = await this.userLoader.loadMany(patientIds);
    
    // Combine the data
    return registrations.map((reg, i) => ({
        ...reg,
        patient: patients[i],
    }));
}
```

### Performance Benefits

Without DataLoader:
```
Query 1: Find registration 1
Query 2: Find patient for registration 1
Query 3: Find registration 2
Query 4: Find patient for registration 2
...
Total: N + N queries (N registrations + N patients)
```

With DataLoader:
```
Query 1: Find all registrations [1, 2, ...]
Query 2: Find all patients [patient1, patient2, ...]
Total: 2 queries
```

## Module Setup

The `CommonModule` is marked as `@Global()`, so you only need to import it once in `AppModule`:

```typescript
@Module({
  imports: [
    CommonModule,
    // ... other modules
  ],
})
export class AppModule {}
```

After that, `DataLoaderFactory` is available in all modules without explicit imports.
