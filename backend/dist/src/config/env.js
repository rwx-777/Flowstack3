import { z } from "zod";
const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/flowstack3"),
    JWT_SECRET: z.string().min(32).default("change-me-in-production-jwt-secret-123"),
    ENCRYPTION_KEY: z.string().min(32).default("change-me-in-production-encryption-key-123"),
    MICROSOFT_CLIENT_ID: z.string().default(""),
    MICROSOFT_CLIENT_SECRET: z.string().default(""),
    MICROSOFT_TENANT_ID: z.string().default("common"),
    MICROSOFT_REDIRECT_URI: z.string().default("http://localhost:4000/auth/callback"),
    FRONTEND_URL: z.string().default("http://localhost:3000"),
    REDIS_URL: z.string().default("redis://localhost:6379"),
    QUEUE_INLINE_MODE: z.string().default("true")
});
export const env = envSchema.parse(process.env);
export const isQueueInlineMode = env.QUEUE_INLINE_MODE.toLowerCase() === "true";
