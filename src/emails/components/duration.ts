/** "1 hour", "24 hours", "7 days". */
export const duration = (count: number, unit: 'hour' | 'day') => `${count} ${unit}${count === 1 ? '' : 's'}`;
