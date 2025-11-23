import { Types } from 'mongoose';

/**
 * Transform ObjectId fields to string
 * Works with aggregate results, lean queries, and regular documents
 */
export function transformObjectId<T = any>(doc: any): T {
  if (!doc) return doc;

  // Handle array of documents
  if (Array.isArray(doc)) {
    return doc.map((item) => transformObjectId(item)) as T;
  }

  // Handle single document
  if (typeof doc === 'object') {
    const transformed: any = {};

    for (const key in doc) {
      const value = doc[key];

      // Convert ObjectId to string
      if (value instanceof Types.ObjectId) {
        transformed[key] = value.toString();
      }
      // Recursively transform nested objects
      else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        transformed[key] = transformObjectId(value);
      }
      // Transform arrays
      else if (Array.isArray(value)) {
        transformed[key] = value.map((item) =>
          item instanceof Types.ObjectId
            ? item.toString()
            : typeof item === 'object' && item !== null
            ? transformObjectId(item)
            : item
        );
      }
      // Keep other values as is
      else {
        transformed[key] = value;
      }
    }

    return transformed as T;
  }

  return doc;
}

/**
 * Transform common reference fields to string
 * Useful for populated documents
 */
export function transformReferences(doc: any, fields: string[] = []): any {
  if (!doc) return doc;

  const transformed = { ...doc };

  // Always transform _id
  if (transformed._id) {
    transformed._id = transformed._id.toString();
  }

  // Transform specified reference fields
  fields.forEach((field) => {
    if (transformed[field]) {
      if (typeof transformed[field] === 'object' && transformed[field]._id) {
        // If populated, transform the nested _id
        transformed[field] = {
          ...transformed[field],
          _id: transformed[field]._id.toString(),
        };
      } else {
        // If not populated, just transform the ObjectId
        transformed[field] = transformed[field].toString();
      }
    }
  });

  return transformed;
}
