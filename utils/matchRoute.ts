export function matchRoute(
  routePath: string,
  requestPath: string
): { params: Record<string, string> } | null {
  const routeParts = routePath.split("/").filter(Boolean);
  const pathParts = requestPath.split("/").filter(Boolean);

  if (routeParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < routeParts.length; i++) {
    const routePart = routeParts[i];
    const pathPart = pathParts[i];

    if (routePart.startsWith(":")) {
      params[routePart.slice(1)] = pathPart;
    } else if (routePart !== pathPart) {
      return null;
    }
  }

  return { params };
}
