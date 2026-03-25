const RESERVED_SUBDOMAINS = new Set(["", "www", "app", "localhost"]);
const PLATFORM_HOST_SUFFIXES = [".vercel.app", ".vercel.sh"];

export function normalizeHost(host: string) {
  return (
    host
      .trim()
      .toLowerCase()
      .split(",")[0]
      ?.trim()
      .replace(/^https?:\/\//, "")
      .split("/")[0] ?? ""
  );
}

export function extractSubdomain(host: string) {
  const hostname = normalizeHost(host).split(":")[0];
  const parts = hostname.split(".");

  if (!hostname || hostname === "localhost" || PLATFORM_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    return "";
  }

  if (hostname.endsWith(".localhost")) {
    return parts[0] ?? "";
  }

  if (parts.length > 2) {
    return parts[0] ?? "";
  }

  return "";
}

export function extractTenantSlug(host: string) {
  const subdomain = extractSubdomain(host);
  return RESERVED_SUBDOMAINS.has(subdomain) ? "" : subdomain;
}
