import dayjs from 'dayjs';

export const formatName = (name?: string): string => {
  if (!name) return '';
  return name
    .trim()
    .split(' ')
    .map((word) => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

export const formatDates = (obj: any, seen = new WeakSet()): any => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return dayjs(obj).format('DD/MM/YYYY');
  }

  // If obj is a Mongoose Document or has toObject/toJSON, convert it to plain object
  if (typeof obj.toObject === 'function') {
    obj = obj.toObject();
  } else if (typeof obj.toJSON === 'function') {
    obj = obj.toJSON();
  }

  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (seen.has(obj)) {
    return obj;
  }

  // Handle Buffer or ObjectId (BSON)
  if (Buffer.isBuffer(obj)) {
    return obj;
  }
  if (obj._bsontype === 'ObjectID' || obj.constructor?.name === 'ObjectId') {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    seen.add(obj);
    return obj.map((item) => formatDates(item, seen));
  }

  seen.add(obj);
  const formatted: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val instanceof Date) {
      formatted[key] = dayjs(val).format('DD/MM/YYYY');
    } else if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}(T|\b)/.test(val) && dayjs(val).isValid()) {
      formatted[key] = dayjs(val).format('DD/MM/YYYY');
    } else if (typeof val === 'object' && val !== null) {
      formatted[key] = formatDates(val, seen);
    } else {
      formatted[key] = val;
    }
  }

  return formatted;
};

