const DEFAULT_APP_URL = "http://localhost:3000";

function getBaseAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL;
}

export function buildTenantAbsoluteUrl(
  slug: string,
  pathname: string,
  searchParams?: Record<string, string | undefined>,
) {
  const url = new URL(getBaseAppUrl());

  if (url.hostname === "localhost" || url.hostname.endsWith(".localhost")) {
    url.hostname = `${slug}.localhost`;
  } else {
    url.hostname = `${slug}.${url.hostname.replace(/^www\./, "")}`;
  }

  url.pathname = pathname;
  url.search = "";
  url.hash = "";

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
  }

  return url.toString();
}

export function buildTenantLoginUrl(slug: string) {
  return buildTenantAbsoluteUrl(slug, "/login");
}

export function buildTenantVerifyUrl(slug: string, phone: string) {
  return buildTenantAbsoluteUrl(slug, "/verify", {
    phone,
    tenantSlug: slug,
  });
}
