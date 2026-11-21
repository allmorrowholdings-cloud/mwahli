import {z} from 'zod';
const schema=z.object({
 NODE_ENV:z.enum(['development','test','production']).default('development'),APP_URL:z.string().url().default('http://localhost:3000'),
 DATABASE_URL:z.string().optional(),REDIS_URL:z.string().optional(),SESSION_SECRET:z.string().min(32).optional(),ENCRYPTION_KEY:z.string().optional(),WEBHOOK_SIGNING_SECRET:z.string().optional(),
 OPENAI_BASE_URL:z.string().url().default('https://api.openai.com/v1'),OPENAI_API_KEY:z.string().optional(),OPENAI_MODEL:z.string().optional(),
 DEV_DEMO_ENABLED:z.string().default('false').transform(v=>v==='true'),DEV_DEMO_SHOPPER_EMAIL:z.string().email().optional(),DEV_DEMO_SHOPPER_PASSWORD:z.string().optional()
});
export const env=schema.parse(process.env);
