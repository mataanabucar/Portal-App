import type { CatalogField, CatalogFunction, FieldSample } from "@/types";

// Builds the initial form value for a field and serializes form values back
// into the args payload the /run endpoint expects. Logic ported verbatim from
// the original tester so server-side validation sees the same input.

export function buildLocalDateTimeValue(hoursToAdd: number): string {
  const value = new Date(Date.now() + hoursToAdd * 60 * 60 * 1000);
  const year = String(value.getFullYear());
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function getFieldSamples(
  entry: CatalogFunction,
  field: Partial<CatalogField>,
): FieldSample[] {
  return entry.samplePayloads?.[field.name as string] || field.samples || [];
}

export function formatFieldValue(value: unknown, field: CatalogField): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (field.type === "json" && typeof value !== "string") {
    return JSON.stringify(value, null, 2);
  }

  if (field.type === "datetime-local") {
    const date = new Date(value as string);
    if (Number.isNaN(date.valueOf())) {
      return String(value);
    }
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  if (Array.isArray(value) && field.parseMode === "linesOrJsonArray") {
    return value.join("\n");
  }

  return String(value);
}

// Returns the v-model initial value for a field: boolean -> boolean,
// everything else -> string (matching the original DOM input behavior).
export function getFieldInitialValue(
  entry: CatalogFunction,
  field: CatalogField,
): string | boolean {
  const explicitDefault =
    entry.defaults?.[field.name] !== undefined
      ? entry.defaults[field.name]
      : field.defaultValue;

  if (field.type === "boolean") {
    return explicitDefault === true;
  }

  if (explicitDefault !== undefined) {
    return formatFieldValue(explicitDefault, field);
  }

  if (field.type === "datetime-local") {
    const plusHours = field.name === "end" ? 1 : 0;
    return buildLocalDateTimeValue(plusHours);
  }

  return "";
}

export function buildInitialFormValues(
  entry: CatalogFunction,
): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};
  for (const field of entry.fields) {
    values[field.name] = getFieldInitialValue(entry, field);
  }
  return values;
}

// Serialize the reactive form state into the args object for /run. Booleans are
// only included when required, toggled on, or backed by an explicit default —
// preserving the original collectFormArgs semantics.
export function collectFormArgs(
  entry: CatalogFunction,
  formValues: Record<string, string | boolean>,
): Record<string, unknown> {
  const args: Record<string, unknown> = {};

  for (const field of entry.fields) {
    const value = formValues[field.name];

    if (field.type === "boolean") {
      const checked = value === true;
      if (field.required || checked || entry.defaults?.[field.name] !== undefined) {
        args[field.name] = checked;
      }
      continue;
    }

    args[field.name] = value ?? "";
  }

  return args;
}
