'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

function isDummyEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !url || url.includes('your-supabase-project');
}

// OTP 이메일 발송 액션
export async function sendOtpAction(email: string) {
  if (!email || !email.includes('@')) {
    return { error: '유효한 이메일 주소를 입력해 주세요.' };
  }

  if (isDummyEnv()) {
    // 테스트용 개발 환경 모의 처리 (Supabase 미연결 상태)
    return { success: true, isMock: true };
  }

  const supabase = await createClient();

  // 직원 계정은 admin(Streamlit) 앱에서 화이트리스트 등록 시
  // auth.admin.createUser(email_confirm: true)로 미리 생성해 둔다.
  // 그래서 여기서는 shouldCreateUser: false로 막아, 등록되지 않은 이메일은
  // 발송 시점에 바로 거부되고(사후 세션 강제 종료 불필요), 등록된 직원은
  // 이미 확인(confirm)된 계정이라 첫 로그인부터 바로 인증 코드 메일을 받는다.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
    },
  });

  if (error) {
    console.error('OTP 발송 에러:', error);
    return { error: '등록되지 않은 이메일이거나 발송에 실패했습니다. 관리자에게 계정 등록을 요청해 주세요.' };
  }
  return { success: true };
}

// OTP 6자리 코드 검증 액션
export async function verifyOtpAction(email: string, otp: string) {
  if (!otp || otp.trim().length < 6) {
    return { error: '이메일로 받은 인증번호를 정확히 입력해 주세요.' };
  }

  if (isDummyEnv()) {
    redirect('/dashboard');
  }

  const supabase = await createClient();

  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: 'email',
  });

  if (verifyError) {
    console.error('OTP 검증 에러:', verifyError);
    return { error: '잘못된 인증번호입니다. 다시 확인해 주세요.' };
  }

  // 세션은 발급되었으나, 강서나눔돌봄센터 실무 담당자 화이트리스트(staff_users)에
  // 등록되어 있고 활성 상태인 계정만 대시보드 접근을 허용한다.
  const { data: staffRow, error: staffError } = await supabase
    .from('staff_users')
    .select('id, is_active')
    .eq('email', email)
    .maybeSingle();

  if (staffError || !staffRow || !staffRow.is_active) {
    await supabase.auth.signOut();
    return {
      error: '등록되지 않았거나 비활성화된 계정입니다. 관리자에게 계정 등록을 요청해 주세요.',
    };
  }

  redirect('/dashboard');
}

// 로그아웃 액션
export async function signOutAction() {
  if (!isDummyEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect('/login');
}
