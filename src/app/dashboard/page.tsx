import { fetchInquiries } from './actions';
import { signOutAction } from '@/app/login/actions';
import TicketDashboardClient from './components/TicketDashboardClient';
import { createClient } from '@/lib/supabase/server';
import { ShieldCheck, LogOut } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  let userEmail = 'admin@gangseocare.or.kr';

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.email) {
      userEmail = user.email;
    }
  } catch (e) {
    // Development fallback
  }

  const initialData = await fetchInquiries();

  return (
    <div className="min-h-screen bg-ace-ivory p-4 sm:p-8 font-sans">
      <div className="mx-auto max-w-7xl">
        {/* 상단 럭셔리 부르탈리스트 헤더 */}
        <header className="mb-8 border-4 border-ace-charcoal bg-white p-6 shadow-brutalist flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-ace-orange text-ace-charcoal font-mono font-bold text-xs px-2.5 py-0.5 border border-ace-charcoal">
                LIVE MANAGEMENT
              </span>
              <span className="font-mono text-xs text-ace-muted">SYSTEM ID: GANGSEO-CS-V1</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-ace-charcoal font-sans">
              CS 티켓 통합 관제 센터
            </h1>
            <p className="text-sm font-sans text-ace-muted mt-1">
              강서나눔돌봄센터 챗봇 민원 수집 및 실무자 조치 내역 기록 관제 시스템
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 border-2 border-ace-charcoal bg-ace-ivory px-4 py-2 text-xs font-mono font-bold text-ace-charcoal shadow-brutalist-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>접속 계정: {userEmail}</span>
            </div>

            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 border-2 border-ace-charcoal bg-white px-3 py-2 text-xs font-mono font-bold text-ace-charcoal hover:bg-ace-orange transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                로그아웃
              </button>
            </form>
          </div>
        </header>

        {/* 클라이언트 대시보드 메인 테이블 */}
        <main>
          <TicketDashboardClient initialTickets={initialData} />
        </main>
      </div>
    </div>
  );
}
