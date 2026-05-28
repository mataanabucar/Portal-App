export function parseJsonEnv(rawValue, fieldName, fallback) {
  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    throw new Error(`${fieldName} must contain valid JSON.`);
  }
}
