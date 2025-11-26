export function transformObjectId<T>(data: any): T {
  if (!data) return data;

  const convert = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(item => convert(item));
    }

    if (obj && typeof obj === 'object') {
      const newObj: any = {};
      for (const key of Object.keys(obj)) {
        const value = obj[key];

        if (key === '_id' && value) {
          newObj[key] = value.toString();
        } else if (value && typeof value === 'object') {
          newObj[key] = convert(value);
        } else {
          newObj[key] = value;
        }
      }
      return newObj;
    }

    return obj;
  };

  return convert(data);
}
