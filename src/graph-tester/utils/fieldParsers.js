export class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
    this.code = "InvalidInput";
    this.details = details;
  }
}

export function parseCatalogArgs(entry, rawArgs = {}) {
  const parsedArgs = {};
  const fieldMap = new Map(entry.fields.map((field) => [field.name, field]));

  for (const field of entry.fields) {
    const parsedValue = parseFieldValue(field, rawArgs[field.name]);

    if (parsedValue !== undefined) {
      parsedArgs[field.name] = parsedValue;
    }
  }

  const requiredFields = entry.requiredFields || [];

  for (const fieldName of requiredFields) {
    if (!hasUsableValue(parsedArgs[fieldName])) {
      const field = fieldMap.get(fieldName);

      throw new ValidationError(
        `${field?.label || fieldName} is required for ${entry.label}.`,
        { field: fieldName }
      );
    }
  }

  return parsedArgs;
}

export function buildOptions(args, fieldNames) {
  const options = {};

  for (const fieldName of fieldNames) {
    if (args[fieldName] !== undefined) {
      options[fieldName] = args[fieldName];
    }
  }

  return options;
}

function parseFieldValue(field, rawValue) {
  if (rawValue === undefined || rawValue === null) {
    return undefined;
  }

  if (field.type === "boolean") {
    return parseBoolean(field, rawValue);
  }

  if (typeof rawValue === "string") {
    const trimmedValue = rawValue.trim();

    if (trimmedValue === "") {
      return undefined;
    }

    if (field.type === "number") {
      return parseNumber(field, trimmedValue);
    }

    if (field.type === "json") {
      return parseJson(field, trimmedValue);
    }

    if (field.type === "datetime-local") {
      return parseDateTimeLocal(field, trimmedValue);
    }

    if (field.parseMode === "linesOrJsonArray") {
      return parseLinesOrJsonArray(field, trimmedValue);
    }

    return trimmedValue;
  }

  if (field.type === "number") {
    return parseNumber(field, rawValue);
  }

  if (field.type === "json") {
    return rawValue;
  }

  if (field.parseMode === "linesOrJsonArray") {
    return parseLinesOrJsonArray(field, rawValue);
  }

  return rawValue;
}

function parseBoolean(field, rawValue) {
  if (typeof rawValue === "boolean") {
    return rawValue;
  }

  if (typeof rawValue === "string") {
    const normalizedValue = rawValue.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(normalizedValue)) {
      return true;
    }

    if (["false", "0", "no", "off"].includes(normalizedValue)) {
      return false;
    }
  }

  throw new ValidationError(`${field.label} must be a boolean value.`, {
    field: field.name,
  });
}

function parseNumber(field, rawValue) {
  const parsedValue =
    typeof rawValue === "number" ? rawValue : Number.parseFloat(String(rawValue));

  if (!Number.isFinite(parsedValue)) {
    throw new ValidationError(`${field.label} must be a valid number.`, {
      field: field.name,
    });
  }

  return parsedValue;
}

function parseJson(field, rawValue) {
  if (typeof rawValue !== "string") {
    return rawValue;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    throw new ValidationError(`${field.label} must contain valid JSON.`, {
      field: field.name,
      parseError: error.message,
    });
  }
}

function parseDateTimeLocal(field, rawValue) {
  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.valueOf())) {
    throw new ValidationError(
      `${field.label} must be a valid date and time value.`,
      { field: field.name }
    );
  }

  return parsedDate.toISOString();
}

function parseLinesOrJsonArray(field, rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((value) => String(value).trim()).filter(Boolean);
  }

  if (typeof rawValue !== "string") {
    throw new ValidationError(
      `${field.label} must be provided as newline-delimited text or a JSON array.`,
      { field: field.name }
    );
  }

  if (rawValue.startsWith("[")) {
    const parsedValue = parseJson(field, rawValue);

    if (!Array.isArray(parsedValue)) {
      throw new ValidationError(`${field.label} must parse to an array.`, {
        field: field.name,
      });
    }

    return parsedValue.map((value) => String(value).trim()).filter(Boolean);
  }

  return rawValue
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function hasUsableValue(value) {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim() !== "";
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}
