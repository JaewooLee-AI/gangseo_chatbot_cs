'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { isDummyEnv } from '@/lib/env';

export type InquiryStatus = 'pending' | 'in_progress' | 'resolved';
export type InquiryCategory =
  | '미분류'
  | '요금문의'
  | '서비스신청'
  | '자격상담'
  | '불만접수'
  | '일반문의'
  | '기타';

export interface CounselorInquiry {
  id: string;
  created_at: string;
  updated_at: string;
  user_name: string | null;
  contact_info: string | null;
  inquiry_summary: string | null;
  raw_message: string;
  input_type: 'text' | 'voice';
  category: InquiryCategory;
  status: InquiryStatus;
  admin_note: string | null;
  assigned_to: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
}

// 개발/오프라인 환경(Supabase 미연결)용 목업 시드 데이터
const INITIAL_MOCK_INQUIRIES: CounselorInquiry[] = [
  {
    id: 'tkt-001-2026',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    user_name: '김영희',
    contact_info: '010-3456-7890',
    inquiry_summary: '어르신 댁 주방 바닥 청소 상태 미흡 관련 재방문 조치 요청. 냉장고 밑 먼지 제거가 누락되었다고 함.',
    raw_message: '지난번에 청소해주셨는데 냉장고 밑에 먼지가 그대로예요. 재방문 가능한가요?',
    input_type: 'text',
    category: '불만접수',
    status: 'pending',
    admin_note: null,
    assigned_to: null,
    resolved_by: null,
    resolved_at: null,
  },
  {
    id: 'tkt-002-2026',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    user_name: '박철수',
    contact_info: '010-9876-5432',
    inquiry_summary: '돌봄 서비스 시작 예정 시간(14:00) 대비 40분 지연 도착 관련 불편 민원 접수.',
    raw_message: '오늘 2시에 오신다고 했는데 40분이나 늦으셨어요. 사전 연락도 없었고요.',
    input_type: 'voice',
    category: '불만접수',
    status: 'pending',
    admin_note: null,
    assigned_to: null,
    resolved_by: null,
    resolved_at: null,
  },
  {
    id: 'tkt-003-2026',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    user_name: '이민수',
    contact_info: '010-1122-3344',
    inquiry_summary: '담당 생활지원사 방문 상담 시 불친절한 응대에 대한 지적 및 담당자 변경 희망 문의.',
    raw_message: '담당 선생님이 너무 불친절하셔서 다른 분으로 바꿔주셨으면 좋겠어요.',
    input_type: 'text',
    category: '불만접수',
    status: 'resolved',
    admin_note: '고객 유선 상담 진행하여 사과 전달함. 담당 생활지원사 재배정(이정숙 지원사) 완료 및 재발 방지 교육 안내.',
    assigned_to: null,
    resolved_by: null,
    resolved_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tkt-004-2026',
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    user_name: '정순자',
    contact_info: '010-5566-7788',
    inquiry_summary: '9월 돌봄 서비스 이용 시간표 변경 요청 및 바우처 본인부담금 입금 계좌 재확인 문의.',
    raw_message: '9월부터 시간을 좀 바꾸고 싶은데 어떻게 해야 하나요? 그리고 입금 계좌도 다시 알려주세요.',
    input_type: 'text',
    category: '요금문의',
    status: 'pending',
    admin_note: null,
    assigned_to: null,
    resolved_by: null,
    resolved_at: null,
  },
  {
    id: 'tkt-005-2026',
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(),
    user_name: '최성호',
    contact_info: '010-8899-0011',
    inquiry_summary: '어르신 안방 창틀 및 베란다 묵은 먼지 청소 추가 작업 지원 가능 여부 문의.',
    raw_message: '창틀이랑 베란다도 청소 좀 더 해주실 수 있나요?',
    input_type: 'text',
    category: '서비스신청',
    status: 'resolved',
    admin_note: '청소 전문 보조 인력 추가 편성하여 방문 처리 예정 안내 완료.',
    assigned_to: null,
    resolved_by: null,
    resolved_at: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(),
  },
];

let memoryStore: CounselorInquiry[] = [...INITIAL_MOCK_INQUIRIES];

// 현재 로그인한 담당자의 staff_users.id 조회 (처리 담당자 기록용)
async function getCurrentStaffId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const { data } = await supabase
    .from('staff_users')
    .select('id')
    .eq('email', user.email)
    .maybeSingle();

  return data?.id ?? null;
}

// 문의 전체 리스트 조회 (최신순)
export async function fetchInquiries(): Promise<CounselorInquiry[]> {
  if (isDummyEnv()) {
    return memoryStore;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('counselor_inquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('DB 페칭 경고/폴백:', error);
      return memoryStore;
    }

    return data as CounselorInquiry[];
  } catch (err) {
    console.warn('DB 페칭 예외/폴백:', err);
    return memoryStore;
  }
}

// 문의 처리 결과(조치 메모) 업데이트 및 상태를 처리완료로 전환
export async function processInquiryAction(inquiryId: string, adminNote: string) {
  if (!adminNote || adminNote.trim().length === 0) {
    return { error: '조치 내역을 입력해 주세요.' };
  }

  if (isDummyEnv()) {
    memoryStore = memoryStore.map((item) =>
      item.id === inquiryId
        ? { ...item, status: 'resolved', admin_note: adminNote, resolved_at: new Date().toISOString() }
        : item
    );
    revalidatePath('/dashboard');
    return { success: true };
  }

  try {
    const supabase = await createClient();
    const resolvedBy = await getCurrentStaffId(supabase);

    const { error } = await supabase
      .from('counselor_inquiries')
      .update({
        status: 'resolved',
        admin_note: adminNote,
        ...(resolvedBy ? { resolved_by: resolvedBy } : {}),
      })
      .eq('id', inquiryId);

    if (error) {
      console.error('처리 업데이트 오류:', error);
      return { error: '데이터베이스 업데이트에 실패했습니다.' };
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    console.error('처리 업데이트 예외:', err);
    return { error: '데이터베이스 업데이트 중 오류가 발생했습니다.' };
  }
}
