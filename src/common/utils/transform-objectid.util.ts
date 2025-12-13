/**
 * Convert all ObjectIds to strings recursively
 * Only converts ObjectId instances, preserves Date objects and other types
 */
export function convertObjectIdsToStrings(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  // Handle Date objects - preserve as-is
  if (obj instanceof Date) {
    return obj;
  }

  // Handle ObjectId
  if (
    obj._bsontype === 'ObjectId' ||
    (obj.toString && typeof obj.toString === 'function' && obj.constructor.name === 'ObjectId')
  ) {
    return obj.toString();
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => convertObjectIdsToStrings(item));
  }

  // Handle objects (but not Date or other built-in types)
  if (typeof obj === 'object' && obj.constructor === Object) {
    const converted: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        converted[key] = convertObjectIdsToStrings(obj[key]);
      }
    }
    return converted;
  }

  return obj;
}