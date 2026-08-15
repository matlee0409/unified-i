import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CLIENT_SESSION_COOKIE, readClientInvite } from '@/lib/server/client-auth';

export default async function EntryPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(CLIENT_SESSION_COOKIE)?.value;
  redirect(session && readClientInvite(session) ? '/home' : '/admin/client');
}
