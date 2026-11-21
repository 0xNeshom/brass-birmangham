import { redirect } from 'next/navigation';
import { requireMember } from '@/lib/auth';

export default async function DashboardPage() {
  await requireMember();
  redirect('/');
}
