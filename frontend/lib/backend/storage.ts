export const getFromStorage = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
};

export const setToStorage = (key: string, value: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, value);
};

export const removeFromStorage = (key: string): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
};
