import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
  var prismaDatasourceUrl: string | undefined;
}

function getDatasourceUrl() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(url);

    // Supabase pooler can reject Prisma's default pool size in dev/serverless.
    if (parsedUrl.hostname.includes("pooler.supabase.com") && !parsedUrl.searchParams.has("connection_limit")) {
      parsedUrl.searchParams.set("connection_limit", "1");
    }

    return parsedUrl.toString();
  } catch {
    return url;
  }
}

const datasourceUrl = getDatasourceUrl();
const shouldReusePrisma = global.prisma && global.prismaDatasourceUrl === datasourceUrl;

if (global.prisma && !shouldReusePrisma) {
  void global.prisma.$disconnect().catch(() => undefined);
}

export const db =
  shouldReusePrisma && global.prisma
    ? global.prisma
    : new PrismaClient({
        datasources: {
          db: {
            url: datasourceUrl,
          },
        },
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      });

if (process.env.NODE_ENV !== "production") {
  global.prisma = db;
  global.prismaDatasourceUrl = datasourceUrl;
}