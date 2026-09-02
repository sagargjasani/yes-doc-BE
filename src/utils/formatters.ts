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

export const formatDates = (obj: any): any => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return dayjs(obj).format('DD/MM/YYYY');
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => formatDates(item));
  }

  const formatted: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val instanceof Date) {
      formatted[key] = dayjs(val).format('DD/MM/YYYY');
    } else if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}(T|\b)/.test(val) && dayjs(val).isValid()) {
      formatted[key] = dayjs(val).format('DD/MM/YYYY');
    } else if (typeof val === 'object' && val !== null) {
      formatted[key] = formatDates(val);
    } else {
      formatted[key] = val;
    }
  }

  return formatted;
};

