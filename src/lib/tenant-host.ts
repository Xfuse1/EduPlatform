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

function extractHostname(host: string) {
  const normalizedHost = normalizeHost(host);

  if (!normalizedHost) {
    return "";
  }

  try {
    return new URL(`http://${normalizedHost}`).hostname.toLowerCase();
  } catch {
    return normalizedHost.split(":")[0]?.toLowerCase() ?? "";
  }
}

function isIpAddress(hostname: string) {
  const normalizedHostname = hostname.replace(/^\[|\]$/g, "");

  return (
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalizedHostname) ||
    /^[a-f0-9:]+$/i.test(normalizedHostname)
  );
}

export function extractSubdomain(host: string) {
  const hostname = extractHostname(host);
  const parts = hostname.split(".");

  if (
    !hostname ||
    hostname === "localhost" ||
    isIpAddress(hostname) ||
    !hostname.includes(".") ||
    PLATFORM_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
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
