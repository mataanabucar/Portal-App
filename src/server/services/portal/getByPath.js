export function getByPath(source, path) {
  if (!path) {
    return source;
  }

  return path.split(".").reduce((value, segment) => {
    if (value === null || value === undefined) {
      return undefined;
    }

    return value[segment];
  }, source);
}
