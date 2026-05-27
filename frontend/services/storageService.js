export const loadJson = (key, fallback) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
export const saveJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));

