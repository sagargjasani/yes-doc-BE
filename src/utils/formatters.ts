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
