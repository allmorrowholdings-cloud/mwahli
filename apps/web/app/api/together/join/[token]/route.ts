import { auth, json } from '@/lib/http';
import { query } from '@/lib/db';
import { sha256 } from '@/lib/security';
import { decryptJson } from '@/lib/crypto-store';

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const a = await auth(); if ('response' in a) return a.response;
  const { token } = await params;
  const r = await query<any>(`select g.id,g.title,g.created_at,g.organizer_user_id,c.id pool_id,c.currency,c.target_minor,c.status,
    (select coalesce(sum(amount_minor),0) from contribution where pool_id=c.id and state='paid') contributed_minor,
    (select count(*) from group_room_member gm where gm.room_id=g.id) member_count
    from group_room g left join contribution_pool c on c.id=g.contribution_pool_id where g.invite_token_hash=$1 limit 1`, [sha256(token)]);
  const room = r.rows[0]; if (!room) return json({ error: 'Invite link is invalid or expired.' }, 404);
  const messages = await query<any>('select id,author_user_id,content_ciphertext,created_at from room_message where room_id=$1 order by created_at desc limit 30', [room.id]);
  const safeMessages = messages.rows.map((m:any) => ({ id:m.id, authorUserId:m.author_user_id, content:decryptJson(m.content_ciphertext,`room-message:${m.id}`), createdAt:m.created_at }));
  const votes = await query<any>('select option_key,count(*)::int count from vote where room_id=$1 group by option_key order by count(*) desc', [room.id]);
  return json({ room, messages: safeMessages, votes: votes.rows });
}

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const a = await auth(); if ('response' in a) return a.response;
  const { token } = await params;
  const r = await query<{id:string}>('select id from group_room where invite_token_hash=$1 limit 1', [sha256(token)]);
  const room = r.rows[0]; if (!room) return json({ error: 'Invite link is invalid or expired.' }, 404);
  await query("insert into group_room_member (room_id,user_id,role) values ($1,$2,'contributor') on conflict (room_id,user_id) do nothing", [room.id, a.session.sub]);
  return json({ ok: true, roomId: room.id });
}
