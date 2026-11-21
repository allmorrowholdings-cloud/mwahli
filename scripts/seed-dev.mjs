import pg from 'pg';import crypto from 'node:crypto';const {Pool}=pg;
if(process.env.NODE_ENV==='production'||process.env.DEV_DEMO_ENABLED!=='true')throw new Error('Dev seed is disabled unless DEV_DEMO_ENABLED=true outside production');
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required');
function hashPassword(password,salt=crypto.randomBytes(16).toString('hex')){const key=crypto.scryptSync(password,salt,64).toString('hex');return `${salt}:${key}`}
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const users=[['00000000-0000-4000-8000-000000000001',process.env.DEV_DEMO_SHOPPER_EMAIL||'shopper@mwahli.local',process.env.DEV_DEMO_SHOPPER_PASSWORD||'LoveMadeFelt!2026','shopper','Phillipa'],['00000000-0000-4000-8000-000000000002',process.env.DEV_DEMO_CREATOR_EMAIL||'creator@mwahli.local',process.env.DEV_DEMO_CREATOR_PASSWORD||'CreateWithCare!2026','creator','Studio Creator'],['00000000-0000-4000-8000-000000000003',process.env.DEV_DEMO_OPS_EMAIL||'ops@mwahli.local',process.env.DEV_DEMO_OPS_PASSWORD||'OperateSafely!2026','ops','Ops']];
for(const [id,email,password,role,name] of users)await pool.query('insert into app_user(id,email,password_hash,role,display_name,email_verified_at) values($1,$2,$3,$4,$5,now()) on conflict(email) do update set password_hash=excluded.password_hash,role=excluded.role,display_name=excluded.display_name,email_verified_at=now(),deleted_at=null',[id,email,hashPassword(password),role,name]);
console.log('dev users seeded');await pool.end();
