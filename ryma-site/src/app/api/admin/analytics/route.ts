import { NextRequest, NextResponse } from 'next/server';
import { requireOwnerAnalytics } from '@/lib/requireAdmin';
import { dbGetAppointments, dbGetInvoices } from '@/lib/db';
import { getServicePrice } from '@/types/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const auth = await requireOwnerAnalytics(request);
  if ('status' in auth) return auth; // 401 or 403

  const lang = request.nextUrl.searchParams.get('lang') || 'fr';

  // Fetch appointments and invoices for aggregate calculation
  const [appointments, invoices] = await Promise.all([
    dbGetAppointments(),
    dbGetInvoices(),
  ]);

  const total = appointments.length;
  const confirmed = appointments.filter((a) => a.status === 'CONFIRMED').length;
  const pending = appointments.filter((a) => a.status === 'PENDING').length;
  const cancelled = appointments.filter((a) => a.status === 'CANCELLED').length;
  const completed = appointments.filter((a) => a.status === 'COMPLETED').length;
  const noShow = appointments.filter((a) => a.status === 'NO_SHOW').length;

  // Realized revenue from paid invoices + confirmed/completed appointments
  const paidInvoicesRevenue = invoices
    .filter((inv) => inv.paymentStatus === 'PAID')
    .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

  const appointmentsRevenue = appointments
    .filter((a) => a.status === 'CONFIRMED' || a.status === 'COMPLETED')
    .reduce((sum, a) => sum + getServicePrice(a.service), 0);

  const revenue = Math.max(paidInvoicesRevenue, appointmentsRevenue);

  // Day of week activity
  const dowLabels =
    lang === 'pt'
      ? ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
      : lang === 'en'
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const dowCounts = Array(7).fill(0);
  appointments.forEach((a) => {
    const d = new Date(a.date + 'T12:00:00');
    const idx = (d.getDay() + 6) % 7;
    dowCounts[idx]++;
  });

  // Service distribution
  const svcMap: Record<string, number> = {};
  appointments.forEach((a) => {
    svcMap[a.service] = (svcMap[a.service] ?? 0) + 1;
  });
  const topServices = Object.entries(svcMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Peak hours
  const hourMap: Record<string, number> = {};
  appointments.forEach((a) => {
    hourMap[a.startTime] = (hourMap[a.startTime] ?? 0) + 1;
  });
  const peakHours = Object.entries(hourMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const cancelRate = total > 0 ? Math.round(((cancelled + noShow) / total) * 100) : 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return NextResponse.json(
    {
      stats: {
        total,
        confirmed,
        pending,
        completed,
        cancelled,
        noShow,
        revenue,
        invoicesCount: invoices.length,
        paidInvoicesRevenue,
      },
      analyticsData: {
        dowLabels,
        dowCounts,
        topServices,
        peakHours,
        cancelRate,
        completionRate,
      },
      expiresAt: auth.session.analyticsUnlockedUntil,
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    }
  );
}
