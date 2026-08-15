import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CLIENT_SESSION_COOKIE, readClientInvite } from '@/lib/server/client-auth';
import BookingHomePage from './home-client';

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(CLIENT_SESSION_COOKIE)?.value;
  const invite = session ? readClientInvite(session) : null;
  if (!invite) redirect('/admin/client');
  return <BookingHomePage clientName={invite.clientName} />;
}
