# **강서나눔돌봄센터 CS 티켓 관리 웹앱 아키텍처 및 구현 보고서**

## **1\. 서론 및 시스템 개요**

본 보고서는 강서나눔돌봄센터 내부 실무 담당자들이 사용할 'CS 티켓 관리 및 업무 처리 웹앱'의 엔드투엔드(End-to-End) 아키텍처와 상세 프론트엔드 구현 코드를 제시한다. 본 시스템은 챗봇을 통해 접수된 고객 민원을 LLM(Large Language Model)이 사전 분석하여 데이터베이스에 적재하면, 이를 실무 담당자들이 확인하고 유선 연락 등의 후속 조치를 기록하는 B2B SaaS(Software as a Service) 형태의 내부 업무망이다1.  
현대 웹 애플리케이션 개발의 사실상 표준으로 자리 잡은 Next.js 15 환경의 App Router와 서버 컴포넌트(Server Components), 서버 액션(Server Actions)을 적극적으로 활용하여 백엔드 로직과 프론트엔드 UI를 견고하게 결합하였다2. 데이터베이스 및 인증 인프라로는 PostgreSQL 기반의 BaaS(Backend as a Service)인 Supabase를 채택하였으며, UI/UX는 Tailwind CSS와 shadcn/ui를 결합하여 사무직 직원들이 엑셀을 다루듯 직관적이고 빠르게 업무를 처리할 수 있도록 설계되었다1.  
본 보고서에서는 비밀번호 없는 이메일 OTP(Passwordless OTP) 로그인, 영구적인 세션 유지, Row Level Security(RLS) 기반의 데이터 보호, 엑셀 호환 CSV 다운로드 기능 등 비즈니스 요구사항을 완벽히 충족하는 최적의 기술적 구현 방안을 심도 있게 분석하고 전체 소스 코드를 제공한다.

## **2\. 시스템 아키텍처 및 데이터베이스 설계**

최신 Next.js 15 환경에서는 서버와 클라이언트의 경계가 명확히 분리되며, 데이터를 가져오고 변이(Mutation)를 일으키는 과정이 서버 액션으로 통합된다6. 본 시스템은 이러한 패러다임에 맞추어 브라우저(Client), 서버(Next.js), 데이터베이스(Supabase) 간의 역할을 엄격하게 분리한다.

### **2.1. 데이터베이스 스키마 및 RLS(Row Level Security) 정책**

Supabase의 근간을 이루는 PostgreSQL 데이터베이스 내에 고객 민원 데이터를 저장할 cs\_tickets 테이블을 설계해야 한다. 단순히 테이블을 생성하는 것에 그치지 않고, 인가되지 않은 사용자의 데이터 접근을 원천 차단하기 위해 Row Level Security(RLS) 정책을 필수적으로 활성화해야 한다7. RLS가 비활성화된 테이블은 익명 사용자(Anon)에게도 데이터가 노출될 위험이 있으므로, 데이터베이스 단에서의 철저한 접근 제어가 요구된다.  
다음 표는 cs\_tickets 테이블의 스키마 구조를 명세한 것이다.

| 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
| :---- | :---- | :---- | :---- |
| id | uuid | Primary Key, gen\_random\_uuid() | 티켓 고유 식별자 |
| created\_at | timestamptz | Not Null, Default now() | 챗봇을 통해 민원이 접수된 일시 |
| customer\_name | text | Not Null | 민원을 접수한 고객명 |
| contact | text | Not Null | 고객 연락처 |
| category | text | Not Null | LLM이 자동 태깅한 분류 (청소품질, 시간미준수 등) |
| summary | text | Not Null | 원본 메시지 및 LLM의 문의 요약 내용 |
| status | text | Not Null, Default '대기중' | 티켓 처리 상태 (대기중 또는 처리완료) |
| memo | text | Nullable | 실무 담당자가 작성한 처리 결과 및 후속 조치 내용 |

위 스키마를 바탕으로 데이터베이스에 테이블을 생성하고, 오직 인증된(Authenticated) 내부 실무자만이 데이터를 읽고 업데이트할 수 있도록 RLS 정책을 적용하는 SQL 명령은 다음과 같다9.

SQL  
\-- 테이블 생성  
CREATE TABLE cs\_tickets (  
  id uuid PRIMARY KEY DEFAULT gen\_random\_uuid(),  
  created\_at timestamptz NOT NULL DEFAULT now(),  
  customer\_name text NOT NULL,  
  contact text NOT NULL,  
  category text NOT NULL,  
  summary text NOT NULL,  
  status text NOT NULL DEFAULT '대기중',  
  memo text  
);

\-- RLS 활성화  
ALTER TABLE cs\_tickets ENABLE ROW LEVEL SECURITY;

\-- 익명 사용자의 접근 권한 회수 및 인증된 사용자에게만 권한 부여  
REVOKE ALL ON TABLE cs\_tickets FROM anon, authenticated;  
GRANT SELECT, UPDATE ON TABLE cs\_tickets TO authenticated;

\-- 인증된 관리자(직원)만 모든 티켓을 조회할 수 있는 RLS 정책  
CREATE POLICY "직원은 모든 티켓을 조회할 수 있다."   
ON cs\_tickets   
FOR SELECT   
TO authenticated   
USING (true);

\-- 인증된 관리자(직원)만 티켓의 상태와 메모를 업데이트할 수 있는 RLS 정책  
CREATE POLICY "직원은 티켓을 업데이트할 수 있다."   
ON cs\_tickets   
FOR UPDATE   
TO authenticated   
USING (true)   
WITH CHECK (true);

이러한 RLS 정책은 프론트엔드나 서버 API에 결함이 발생하더라도 데이터베이스 계층에서 비인가자의 접근을 안전하게 방어하는 심층 방어(Defense in Depth) 역할을 수행한다8.

## **3\. 인증 및 권한 제어 (Authentication & Middleware)**

내부망 시스템에서 가장 중요한 요소 중 하나는 사용자의 접근 편의성과 보안성의 균형이다. 기존의 아이디/비밀번호 방식은 비밀번호 분실 및 주기적 변경 등으로 인해 IT 비숙련자에게 큰 피로도를 유발한다. 따라서 본 시스템은 Supabase Auth를 활용하여 이메일 수신을 통한 6자리 숫자 OTP 인증(Passwordless OTP) 방식을 구현한다12.  
또한, 한 번 로그인한 직원이 명시적으로 로그아웃을 요청하기 전까지 로그인 상태가 영구적으로 유지되도록(Session Persistence) 브라우저 쿠키의 만료 기한(maxAge)을 극한으로 연장하여 설정한다14. Next.js 환경에서 이러한 세션 쿠키는 @supabase/ssr 클라이언트를 통해 생성 및 검증되며, Next.js 15의 비동기 쿠키 접근 정책에 맞추어 구현되어야 한다16.

### **3.1. 서버사이드 Supabase 클라이언트 설정**

서버 컴포넌트 및 서버 액션에서 데이터베이스와 통신하고 쿠키를 설정하기 위한 유틸리티 함수를 정의한다. cookies() 함수가 Next.js 15부터 비동기(Promise)로 동작하므로 반드시 await 키워드를 사용하여 호출해야 런타임 에러(params should be awaited)를 방지할 수 있다16.  
다음은 src/lib/supabase/server.ts의 구현 코드이다. 쿠키 저장 시 maxAge를 약 10년으로 설정하여 영구적인 세션을 부여한다4.

TypeScript  
import { createServerClient } from '@supabase/ssr';  
import { cookies } from 'next/headers';

// 영구 세션 유지를 위한 10년 단위 초(seconds) 계산  
const TEN\_YEARS\_IN\_SECONDS \= 60 \* 60 \* 24 \* 365 \* 10;

export async function createClient() {  
  const cookieStore \= await cookies();

  return createServerClient(  
    process.env.NEXT\_PUBLIC\_SUPABASE\_URL\!,  
    process.env.NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY\!,  
    {  
      cookies: {  
        getAll() {  
          return cookieStore.getAll();  
        },  
        setAll(cookiesToSet) {  
          try {  
            cookiesToSet.forEach(({ name, value, options }) \=\>  
              cookieStore.set(name, value, {  
                ...options,  
                maxAge: TEN\_YEARS\_IN\_SECONDS, // 세션 영구 유지  
              })  
            );  
          } catch (error) {  
            // Server Component 컨텍스트에서 setAll 호출 시 무시  
            // 실제 쿠키 갱신은 Middleware와 Server Actions에서 수행됨  
          }  
        },  
      },  
    }  
  );  
}

클라이언트 컴포넌트를 위한 src/lib/supabase/client.ts는 다음과 같이 구성된다4.

TypeScript  
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {  
  return createBrowserClient(  
    process.env.NEXT\_PUBLIC\_SUPABASE\_URL\!,  
    process.env.NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY\!  
  );  
}

### **3.2. 라우팅 보호 및 세션 갱신 미들웨어 (Middleware)**

인증되지 않은 사용자가 URL을 직접 입력하여 /dashboard에 접근하는 것을 차단하기 위해 Next.js의 미들웨어 로직을 구성한다. 미들웨어는 매 요청마다 세션을 확인하고 갱신(updateSession)하며, 사용자의 인증 상태에 따라 리다이렉션을 수행한다4.  
다음은 src/lib/supabase/middleware.ts 및 src/middleware.ts의 구현이다.

TypeScript  
// src/lib/supabase/middleware.ts  
import { createServerClient } from '@supabase/ssr';  
import { NextResponse, type NextRequest } from 'next/server';

const TEN\_YEARS \= 60 \* 60 \* 24 \* 365 \* 10;

export async function updateSession(request: NextRequest) {  
  let supabaseResponse \= NextResponse.next({  
    request,  
  });

  const supabase \= createServerClient(  
    process.env.NEXT\_PUBLIC\_SUPABASE\_URL\!,  
    process.env.NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY\!,  
    {  
      cookies: {  
        getAll() {  
          return request.cookies.getAll();  
        },  
        setAll(cookiesToSet) {  
          // 요청(Request) 쿠키 설정  
          cookiesToSet.forEach(({ name, value }) \=\> request.cookies.set(name, value));  
          supabaseResponse \= NextResponse.next({  
            request,  
          });  
          // 응답(Response) 쿠키 설정 시 긴 만료 기한 부여  
          cookiesToSet.forEach(({ name, value, options }) \=\>  
            supabaseResponse.cookies.set(name, value, {  
              ...options,  
              maxAge: TEN\_YEARS,   
            })  
          );  
        },  
      },  
    }  
  );

  // 현재 인증된 사용자 조회 (보안 상 안전한 getUser 활용)  
  const {  
    data: { user },  
  } \= await supabase.auth.getUser();

  const isDashboardRoute \= request.nextUrl.pathname.startsWith('/dashboard');  
  const isLoginRoute \= request.nextUrl.pathname \=== '/login';  
  const isRootRoute \= request.nextUrl.pathname \=== '/';

  // 루트 경로 접속 시 대시보드 또는 로그인으로 리다이렉트  
  if (isRootRoute) {  
    const target \= user ? '/dashboard' : '/login';  
    return NextResponse.redirect(new URL(target, request.url));  
  }

  // 1\. 비인가자의 /dashboard 접근 차단  
  if (\!user && isDashboardRoute) {  
    return NextResponse.redirect(new URL('/login', request.url));  
  }

  // 2\. 이미 로그인된 직원의 /login 접근 시 대시보드로 이동  
  if (user && isLoginRoute) {  
    return NextResponse.redirect(new URL('/dashboard', request.url));  
  }

  return supabaseResponse;  
}

TypeScript  
// src/middleware.ts  
import { type NextRequest } from 'next/server';  
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {  
  return await updateSession(request);  
}

// 미들웨어가 실행될 경로 필터링 (정적 파일 및 API 등 제외)  
export const config \= {  
  matcher: \[  
    '/((?\!\_next/static|\_next/image|favicon.ico|.\*\\\\.(?:svg|png|jpg|jpeg|gif|webp)$).\*)',  
  \],  
};

이러한 미들웨어 설계는 인증 토큰이 갱신될 때마다 maxAge를 재설정하여 브라우저 내에서 안전하게 세션이 연장되도록 보장한다14.

## **4\. 프론트엔드 모듈 구현: 로그인 페이지 (Passwordless OTP)**

로그인 모듈은 클라이언트의 Form 데이터를 받아 서버 액션으로 전송하고, 이메일로 발송된 6자리 코드를 검증하는 2단계(Step) 프로세스로 설계된다13. 서버 액션을 활용하면 API 라우트를 별도로 구축할 필요 없이 백엔드 로직을 직접 호출할 수 있어 유지보수성이 극대화된다2.

### **4.1. 로그인 인증 처리 서버 액션**

사용자 입력을 검증하고 Supabase Auth와 상호작용하는 서버 액션을 src/app/login/actions.ts에 정의한다. Next.js 15 환경에서는 서버 액션 내부에서 클라이언트의 전역 객체(window)에 접근할 수 없으므로, 로직은 순수하게 서버 사이드에서 동작하도록 작성된다2.

TypeScript  
// src/app/login/actions.ts  
'use server';

import { createClient } from '@/lib/supabase/server';  
import { redirect } from 'next/navigation';

// OTP 이메일 발송 액션  
export async function sendOtpAction(email: string) {  
  if (\!email || \!email.includes('@')) {  
    return { error: '유효한 이메일 주소를 입력해 주세요.' };  
  }

  const supabase \= await createClient();  
    
  // signInWithOtp를 활용한 6자리 코드 발송  
  const { error } \= await supabase.auth.signInWithOtp({  
    email,  
    options: {  
      shouldCreateUser: false, // 사전 등록된 담당자 이메일만 허용  
    },  
  });

  if (error) {  
    console.error('OTP 발송 에러:', error);  
    return { error: '인가되지 않은 이메일이거나 발송에 실패했습니다.' };  
  }  
  return { success: true };  
}

// OTP 6자리 코드 검증 액션  
export async function verifyOtpAction(email: string, otp: string) {  
  if (\!otp || otp.length \!== 6) {  
    return { error: '6자리 숫자를 정확히 입력해 주세요.' };  
  }

  const supabase \= await createClient();

  const { error } \= await supabase.auth.verifyOtp({  
    email,  
    token: otp,  
    type: 'email',  
  });

  if (error) {  
    console.error('OTP 검증 에러:', error);  
    return { error: '잘못된 인증번호입니다. 다시 확인해 주세요.' };  
  }

  // 인증 성공 시 대시보드로 이동  
  redirect('/dashboard');  
}

### **4.2. 로그인 사용자 인터페이스**

로그인 뷰 컴포넌트는 직관적인 디자인과 오류 메시지 표출 기능을 포함하여 src/app/login/page.tsx에 작성된다. shadcn/ui의 입력 폼 요소들을 차용하여 모던한 스타일을 구성한다1.

TypeScript  
// src/app/login/page.tsx  
'use client';

import { useState } from 'react';  
import { sendOtpAction, verifyOtpAction } from './actions';  
import { Button } from '@/components/ui/button';  
import { Input } from '@/components/ui/input';

export default function LoginPage() {  
  const \[email, setEmail\] \= useState('');  
  const \[otp, setOtp\] \= useState('');  
  const \[step, setStep\] \= useState\<1 | 2\>(1);  
  const \[isLoading, setIsLoading\] \= useState(false);  
  const \[errorMessage, setErrorMessage\] \= useState('');

  const handleSendEmail \= async (e: React.FormEvent) \=\> {  
    e.preventDefault();  
    setIsLoading(true);  
    setErrorMessage('');

    const res \= await sendOtpAction(email);  
    if (res.error) {  
      setErrorMessage(res.error);  
    } else {  
      setStep(2); // 2단계 OTP 입력 화면으로 전환  
    }  
    setIsLoading(false);  
  };

  const handleVerifyOtp \= async (e: React.FormEvent) \=\> {  
    e.preventDefault();  
    setIsLoading(true);  
    setErrorMessage('');

    const res \= await verifyOtpAction(email, otp);  
    if (res?.error) {  
      setErrorMessage(res.error);  
      setIsLoading(false);  
    }  
  };

  return (  
    \<div className="flex min-h-screen items-center justify-center bg-gray-50 p-4"\>  
      \<div className="w-full max-w-md bg-white rounded-xl shadow-lg border p-8"\>  
        \<div className="mb-8 text-center"\>  
          \<h1 className="text-2xl font-bold tracking-tight text-gray-900"\>  
            강서나눔돌봄센터  
          \</h1\>  
          \<p className="text-sm text-gray-500 mt-2"\>  
            CS 민원 관리 시스템 접속  
          \</p\>  
        \</div\>

        {step \=== 1 ? (  
          \<form onSubmit={handleSendEmail} className="space-y-5"\>  
            \<div className="space-y-2"\>  
              \<label className="text-sm font-medium text-gray-700"\>이메일 주소\</label\>  
              \<Input  
                type="email"  
                required  
                value={email}  
                onChange={(e) \=\> setEmail(e.target.value)}  
                placeholder="담당자 이메일 입력"  
                className="w-full"  
              /\>  
            \</div\>  
            {errorMessage && (  
              \<p className="text-red-500 text-sm font-medium"\>{errorMessage}\</p\>  
            )}  
            \<Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}\>  
              {isLoading ? '발송 중...' : '인증번호 받기'}  
            \</Button\>  
          \</form\>  
        ) : (  
          \<form onSubmit={handleVerifyOtp} className="space-y-5"\>  
            \<div className="space-y-2"\>  
              \<label className="text-sm font-medium text-gray-700"\>인증번호 6자리\</label\>  
              \<Input  
                type="text"  
                required  
                maxLength={6}  
                value={otp}  
                onChange={(e) \=\> setOtp(e.target.value)}  
                placeholder="이메일로 도착한 숫자 입력"  
                className="text-center tracking-widest text-lg w-full"  
              /\>  
            \</div\>  
            {errorMessage && (  
              \<p className="text-red-500 text-sm font-medium"\>{errorMessage}\</p\>  
            )}  
            \<Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}\>  
              {isLoading ? '확인 중...' : '로그인'}  
            \</Button\>  
            \<button  
              type="button"  
              onClick={() \=\> { setStep(1); setOtp(''); setErrorMessage(''); }}  
              className="w-full text-sm text-gray-500 hover:text-gray-700 underline underline-offset-4"  
            \>  
              이메일 다시 입력하기  
            \</button\>  
          \</form\>  
        )}  
      \</div\>  
    \</div\>  
  );  
}

## **5\. 프론트엔드 모듈 구현: 통합 대시보드 (Dashboard & Data Filtering)**

대시보드 모듈은 실무자가 챗봇을 통해 인입된 전체 민원을 조회하고 필터링하는 핵심 공간이다. Next.js의 서버 컴포넌트를 활용하여 렌더링 단계에서 데이터베이스에 쿼리를 수행해 초기 데이터를 가져오고, 이를 클라이언트 컴포넌트로 전달하여 인터랙티브한 검색 및 필터링을 제공한다3.

### **5.1. 데이터 페칭 및 조작 서버 액션**

테이블 데이터를 렌더링하기 위한 타입 정의와 데이터 페칭 로직, 그리고 민원 처리 결과를 데이터베이스에 업데이트하는 로직을 src/app/dashboard/actions.ts에 작성한다. 특히 업데이트 이후 최신 상태를 화면에 반영하기 위해 Next.js의 revalidatePath 메서드를 호출하여 서버 캐시를 무효화하는 것이 필수적이다3.

TypeScript  
// src/app/dashboard/actions.ts  
'use server';

import { createClient } from '@/lib/supabase/server';  
import { revalidatePath } from 'next/cache';

export interface CsTicket {  
  id: string;  
  created\_at: string;  
  customer\_name: string;  
  contact: string;  
  category: string;  
  summary: string;  
  status: '대기중' | '처리완료';  
  memo: string | null;  
}

// 티켓 전체 리스트 조회 (최신순)  
export async function fetchTickets(): Promise\<CsTicket\[\]\> {  
  const supabase \= await createClient();  
  const { data, error } \= await supabase  
    .from('cs\_tickets')  
    .select('\*')  
    .order('created\_at', { ascending: false });

  if (error) {  
    console.error('데이터 페칭 오류:', error);  
    throw new Error('티켓을 불러오지 못했습니다.');  
  }  
    
  return data as CsTicket\[\];  
}

// 티켓 처리결과 업데이트 로직  
export async function processTicketAction(ticketId: string, memoContent: string) {  
  const supabase \= await createClient();

  const { error } \= await supabase  
    .from('cs\_tickets')  
    .update({  
      status: '처리완료',  
      memo: memoContent,  
    })  
    .eq('id', ticketId);

  if (error) {  
    return { error: '데이터베이스 업데이트에 실패했습니다.' };  
  }

  // 서버 캐시 강제 무효화 및 해당 라우트 리렌더링  
  revalidatePath('/dashboard');  
  return { success: true };  
}

### **5.2. 대시보드 뷰 및 필터링 테이블 구현**

대시보드의 최상위 페이지인 src/app/dashboard/page.tsx는 서버 컴포넌트로서 데이터를 미리 받아온다.

TypeScript  
// src/app/dashboard/page.tsx  
import { fetchTickets } from './actions';  
import TicketDashboardClient from './components/TicketDashboardClient';  
import { createClient } from '@/lib/supabase/server';  
import { redirect } from 'next/navigation';

export default async function DashboardPage() {  
  const supabase \= await createClient();  
  const { data: { user } } \= await supabase.auth.getUser();

  if (\!user) {  
    redirect('/login');  
  }

  const initialData \= await fetchTickets();

  return (  
    \<div className="min-h-screen bg-gray-100/50 p-6"\>  
      \<div className="mx-auto max-w-7xl"\>  
        \<header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"\>  
          \<div\>  
            \<h1 className="text-3xl font-bold text-gray-900"\>CS 티켓 통합 관제\</h1\>  
            \<p className="text-gray-500 mt-1"\>  
              챗봇 접수 민원 확인 및 처리 결과 기록 대시보드  
            \</p\>  
          \</div\>  
          \<div className="px-4 py-2 bg-white rounded-full border shadow-sm text-sm text-gray-600 font-medium"\>  
            접속 계정: {user.email}  
          \</div\>  
        \</header\>  
          
        {/\* 클라이언트 컴포넌트로 데이터 전달 \*/}  
        \<TicketDashboardClient initialTickets={initialData} /\>  
      \</div\>  
    \</div\>  
  );  
}

TicketDashboardClient 컴포넌트는 사용자의 조작에 따라 리스트를 필터링하고 모달 패널(Sheet)을 띄우는 역할을 담당한다. B2B 애플리케이션의 특성을 고려하여 엑셀과 유사한 테이블 UI(shadcn/ui Table)를 구현하고, 시각적 구분이 명확한 배지(Badge) 컴포넌트를 사용해 직관성을 높인다1.

TypeScript  
// src/app/dashboard/components/TicketDashboardClient.tsx  
'use client';

import { useState } from 'react';  
import { CsTicket } from '../actions';  
import { format } from 'date-fns';  
import { ko } from 'date-fns/locale';  
import TicketDetailSheet from './TicketDetailSheet';  
import CsvExportButton from './CsvExportButton';

import {  
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,  
} from '@/components/ui/table';  
import { Badge } from '@/components/ui/badge';  
import { Input } from '@/components/ui/input';  
import {  
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,  
} from '@/components/ui/select';

export default function TicketDashboardClient({ initialTickets }: { initialTickets: CsTicket\[\] }) {  
  const \[filterStatus, setFilterStatus\] \= useState\<string\>('all');  
  const \[filterCategory, setFilterCategory\] \= useState\<string\>('all');  
  const \[searchWord, setSearchWord\] \= useState\<string\>('');  
  const \[selectedTicket, setSelectedTicket\] \= useState\<CsTicket | null\>(null);

  // 동적 카테고리 추출  
  const uniqueCategories \= Array.from(new Set(initialTickets.map((t) \=\> t.category)));

  // 필터링 적용 로직  
  const displayedTickets \= initialTickets.filter((ticket) \=\> {  
    const matchStatus \= filterStatus \=== 'all' || ticket.status \=== filterStatus;  
    const matchCat \= filterCategory \=== 'all' || ticket.category \=== filterCategory;  
    const matchSearch \=  
      ticket.customer\_name.includes(searchWord) ||  
      ticket.summary.includes(searchWord);  
    return matchStatus && matchCat && matchSearch;  
  });

  const getStatusBadge \= (status: string) \=\> {  
    if (status \=== '대기중') {  
      // 대기중: 노란색/붉은색 계열 경고 톤  
      return \<Badge variant="destructive" className="bg-red-500 hover:bg-red-600"\>대기중\</Badge\>;  
    }  
    // 처리완료: 녹색 계열 안정 톤  
    return \<Badge variant="outline" className="border-emerald-500 text-emerald-700 bg-emerald-50"\>처리완료\</Badge\>;  
  };

  return (  
    \<div className="bg-white rounded-xl shadow-sm border overflow-hidden"\>  
      {/\* 필터 및 조작 컨트롤 바 \*/}  
      \<div className="p-4 border-b bg-gray-50/50 flex flex-col md:flex-row gap-4 justify-between items-center"\>  
        \<div className="flex flex-wrap gap-3 w-full md:w-auto"\>  
          \<Select value={filterStatus} onValueChange={setFilterStatus}\>  
            \<SelectTrigger className="w-\[150px\] bg-white"\>  
              \<SelectValue placeholder="상태 전체" /\>  
            \</SelectTrigger\>  
            \<SelectContent\>  
              \<SelectItem value="all"\>전체 상태\</SelectItem\>  
              \<SelectItem value="대기중"\>대기중\</SelectItem\>  
              \<SelectItem value="처리완료"\>처리완료\</SelectItem\>  
            \</SelectContent\>  
          \</Select\>

          \<Select value={filterCategory} onValueChange={setFilterCategory}\>  
            \<SelectTrigger className="w-\[180px\] bg-white"\>  
              \<SelectValue placeholder="카테고리 전체" /\>  
            \</SelectTrigger\>  
            \<SelectContent\>  
              \<SelectItem value="all"\>전체 카테고리\</SelectItem\>  
              {uniqueCategories.map((cat) \=\> (  
                \<SelectItem key={cat} value={cat}\>{cat}\</SelectItem\>  
              ))}  
            \</SelectContent\>  
          \</Select\>

          \<Input   
            placeholder="고객명, 내용 검색"   
            value={searchWord}  
            onChange={(e) \=\> setSearchWord(e.target.value)}  
            className="w-\[200px\] bg-white"  
          /\>  
        \</div\>

        {/\* 필터링된 결과에 대한 CSV 추출 컴포넌트 마운트 \*/}  
        \<CsvExportButton dataToExport={displayedTickets} /\>  
      \</div\>

      {/\* 데이터 테이블 \*/}  
      \<div className="overflow-x-auto"\>  
        \<Table\>  
          \<TableHeader\>  
            \<TableRow className="bg-gray-50/80"\>  
              \<TableHead className="w-\[160px\]"\>접수일시\</TableHead\>  
              \<TableHead className="w-\[100px\]"\>고객명\</TableHead\>  
              \<TableHead className="w-\[130px\]"\>연락처\</TableHead\>  
              \<TableHead className="w-\[140px\]"\>카테고리\</TableHead\>  
              \<TableHead\>문의 내용 요약\</TableHead\>  
              \<TableHead className="w-\[100px\] text-center"\>상태\</TableHead\>  
            \</TableRow\>  
          \</TableHeader\>  
          \<TableBody\>  
            {displayedTickets.length \> 0 ? (  
              displayedTickets.map((ticket) \=\> (  
                \<TableRow   
                  key={ticket.id}  
                  onClick={() \=\> setSelectedTicket(ticket)}  
                  className="cursor-pointer hover:bg-slate-50 transition-colors"  
                \>  
                  \<TableCell className="text-gray-500 font-medium text-sm"\>  
                    {format(new Date(ticket.created\_at), 'yy.MM.dd HH:mm', { locale: ko })}  
                  \</TableCell\>  
                  \<TableCell className="font-semibold text-gray-900"\>{ticket.customer\_name}\</TableCell\>  
                  \<TableCell className="text-gray-600"\>{ticket.contact}\</TableCell\>  
                  \<TableCell\>  
                    \<Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 border"\>  
                      {ticket.category}  
                    \</Badge\>  
                  \</TableCell\>  
                  \<TableCell className="text-gray-700 truncate max-w-\[250px\]"\>  
                    {ticket.summary}  
                  \</TableCell\>  
                  \<TableCell className="text-center"\>  
                    {getStatusBadge(ticket.status)}  
                  \</TableCell\>  
                \</TableRow\>  
              ))  
            ) : (  
              \<TableRow\>  
                \<TableCell colSpan={6} className="h-40 text-center text-gray-500 font-medium"\>  
                  조건에 일치하는 티켓이 존재하지 않습니다.  
                \</TableCell\>  
              \</TableRow\>  
            )}  
          \</TableBody\>  
        \</Table\>  
      \</div\>

      {/\* 우측 슬라이드 오버 패널 \*/}  
      \<TicketDetailSheet   
        ticket={selectedTicket}  
        onClose={() \=\> setSelectedTicket(null)}  
      /\>  
    \</div\>  
  );  
}

## **6\. 상세 조회 및 처리 결과 입력 (Detail & Update)**

실무자가 테이블의 행(Row)을 클릭했을 때 등장하는 UI는 전체 화면 모달(Modal) 대신 우측에서 튀어나오는 슬라이드 오버(Slide-over, Sheet) 방식을 적용한다1. 이 방식은 사용자가 현재 대시보드의 어느 위치에서 작업하고 있었는지 맥락(Context)을 잃지 않게 해주어 B2B SaaS 환경에서 널리 사용되는 패턴이다.  
담당자는 해당 화면에서 원본 메시지를 열람하고 조치 내역을 텍스트 영역(Textarea)에 기입한 뒤 처리 상태를 업데이트한다. 앞서 actions.ts에 정의된 processTicketAction 서버 액션을 호출하여 데이터베이스에 트랜잭션을 반영한다3.

TypeScript  
// src/app/dashboard/components/TicketDetailSheet.tsx  
'use client';

import { useState, useEffect } from 'react';  
import { CsTicket, processTicketAction } from '../actions';  
import { Button } from '@/components/ui/button';  
import { Textarea } from '@/components/ui/textarea';  
import {  
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,  
} from '@/components/ui/sheet';

interface TicketDetailSheetProps {  
  ticket: CsTicket | null;  
  onClose: () \=\> void;  
}

export default function TicketDetailSheet({ ticket, onClose }: TicketDetailSheetProps) {  
  const \[memo, setMemo\] \= useState\<string\>('');  
  const \[isSubmitting, setIsSubmitting\] \= useState(false);

  useEffect(() \=\> {  
    // 티켓 정보가 로드되면 기존 메모를 텍스트 영역에 바인딩  
    if (ticket) {  
      setMemo(ticket.memo || '');  
    }  
  }, \[ticket\]);

  const handleSubmit \= async () \=\> {  
    if (\!ticket) return;  
    setIsSubmitting(true);

    const result \= await processTicketAction(ticket.id, memo);  
    setIsSubmitting(false);

    if (result.error) {  
      alert(result.error);  
    } else {  
      onClose(); // 성공 시 패널을 닫으면 Next.js revalidatePath로 인해 백그라운드 리스트 갱신됨  
    }  
  };

  return (  
    \<Sheet open={\!\!ticket} onOpenChange={(isOpen) \=\> \!isOpen && onClose()}\>  
      {/\* 우측에서 슬라이드인(Slide-in) 되는 패널 컨테이너 \*/}  
      \<SheetContent className="sm:max-w-lg w-full overflow-y-auto bg-white"\>  
        \<SheetHeader className="mb-6 border-b pb-4"\>  
          \<SheetTitle className="text-2xl text-gray-900"\>민원 처리 상세\</SheetTitle\>  
          \<SheetDescription className="text-gray-500"\>  
            고객 연락처를 통해 상담을 진행하고 조치 결과를 기입해 주세요.  
          \</SheetDescription\>  
        \</SheetHeader\>

        {ticket && (  
          \<div className="space-y-6"\>  
            {/\* 요약 정보 카드 그리드 \*/}  
            \<div className="grid grid-cols-2 gap-4 bg-gray-50 p-5 rounded-xl border"\>  
              \<div\>  
                \<p className="text-xs font-bold text-gray-500 mb-1"\>고객명\</p\>  
                \<p className="text-base text-gray-900"\>{ticket.customer\_name}\</p\>  
              \</div\>  
              \<div\>  
                \<p className="text-xs font-bold text-gray-500 mb-1"\>연락처\</p\>  
                \<p className="text-base font-semibold text-blue-600"\>{ticket.contact}\</p\>  
              \</div\>  
              \<div\>  
                \<p className="text-xs font-bold text-gray-500 mb-1"\>카테고리\</p\>  
                \<p className="text-sm font-medium text-gray-800"\>{ticket.category}\</p\>  
              \</div\>  
              \<div\>  
                \<p className="text-xs font-bold text-gray-500 mb-1"\>처리 상태\</p\>  
                \<p className={\`text-sm font-bold ${ticket.status \=== '대기중' ? 'text-red-500' : 'text-emerald-600'}\`}\>  
                  {ticket.status}  
                \</p\>  
              \</div\>  
            \</div\>

            {/\* 원본 메시지 및 요약 영역 \*/}  
            \<div className="space-y-2"\>  
              \<label className="text-sm font-bold text-gray-800 block"\>고객 문의 상세 (LLM 요약)\</label\>  
              \<div className="bg-slate-50 border p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap leading-relaxed shadow-inner"\>  
                {ticket.summary}  
              \</div\>  
            \</div\>

            {/\* 담당자 조치 결과 기입 영역 \*/}  
            \<div className="space-y-2 border-t pt-5"\>  
              \<label className="text-sm font-bold text-gray-800 block"\>  
                담당자 조치 결과 \<span className="text-red-500"\>\*\</span\>  
              \</label\>  
              \<Textarea  
                placeholder="유선 안내 완료, 환불 조치 진행 등 상세 처리 내역을 입력하세요..."  
                className="min-h-\[160px\] resize-none focus-visible:ring-blue-500 p-3"  
                value={memo}  
                onChange={(e) \=\> setMemo(e.target.value)}  
                disabled={ticket.status \=== '처리완료'}  
              /\>  
            \</div\>  
          \</div\>  
        )}

        \<SheetFooter className="mt-8 pt-4 border-t flex gap-2 sm:justify-end"\>  
          \<Button variant="outline" onClick={onClose} className="w-full sm:w-auto"\>  
            취소 및 닫기  
          \</Button\>  
          {ticket?.status \=== '대기중' && (  
            \<Button   
              onClick={handleSubmit}   
              disabled={isSubmitting || memo.trim().length \=== 0}  
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"  
            \>  
              {isSubmitting ? '데이터 갱신 중...' : '처리 완료 및 저장'}  
            \</Button\>  
          )}  
        \</SheetFooter\>  
      \</SheetContent\>  
    \</Sheet\>  
  );  
}

## **7\. 엑셀 호환 CSV 다운로드 기능 (CSV Export)**

대시보드 상단에 배치되는 CSV 다운로드 버튼은 화면에 현재 필터링되어 노출된 배열 데이터(displayedTickets)를 인자로 받아, 브라우저 상에서 즉시 CSV 파일을 생성하여 다운로드하는 로직을 수행한다.  
이 모듈 설계 시 가장 주의해야 할 점은 **텍스트 인코딩 및 한글 깨짐 현상 방지**이다. MS 엑셀(Microsoft Excel)은 별도의 설정 없이 CSV를 열면 기본적으로 ANSI(윈도우 기본 인코딩)로 텍스트를 파싱하려고 시도하므로 UTF-8 문자열이 심각하게 깨지는 문제가 발생한다21. 이를 해결하기 위해 생성되는 CSV 데이터 스트림의 맨 첫 바이트에 **BOM(Byte Order Mark, \\uFEFF)** 문자를 삽입하여 해당 파일이 UTF-8로 인코딩되었음을 명시적으로 선언해주어야 엑셀 등 외부 프로그램에서 한글이 정상적으로 출력된다22.  
또한, CSV 표준 규칙을 준수하기 위해 텍스트 데이터 내에 포함될 수 있는 줄바꿈 문자나 콤마(,), 쌍따옴표(")를 방어할 수 있도록 데이터 셀 전체를 쌍따옴표로 감싸는 이스케이프(Escape) 처리를 적용해야 한다.

TypeScript  
// src/app/dashboard/components/CsvExportButton.tsx  
'use client';

import { CsTicket } from '../actions';  
import { Button } from '@/components/ui/button';  
import { Download } from 'lucide-react';  
import { format } from 'date-fns';

export default function CsvExportButton({ dataToExport }: { dataToExport: CsTicket\[\] }) {  
  const exportToCsv \= () \=\> {  
    if (\!dataToExport || dataToExport.length \=== 0\) {  
      alert('추출할 데이터가 존재하지 않습니다.');  
      return;  
    }

    // 1\. CSV 컬럼 헤더 정의  
    const headerRow \= \['접수일시', '고객명', '연락처', '카테고리', '문의내용요약', '상태', '담당자메모'\];  
      
    // 2\. CSV 바디 구성 (내부 쌍따옴표 이스케이프 및 콤마 충돌 방지를 위해 문자열 캡슐화)  
    const bodyRows \= dataToExport.map(ticket \=\> {  
      return \[  
        format(new Date(ticket.created\_at), 'yyyy-MM-dd HH:mm'),  
        \`"${ticket.customer\_name}"\`,  
        \`"${ticket.contact}"\`,  
        \`"${ticket.category}"\`,  
        \`"${ticket.summary.replace(/"/g, '""')}"\`, // 텍스트 내 쌍따옴표 중복 처리  
        \`"${ticket.status}"\`,  
        \`"${ticket.memo ? ticket.memo.replace(/"/g, '""') : ''}"\`  
      \];  
    });

    const csvString \= \[  
      headerRow.join(','),  
      ...bodyRows.map(row \=\> row.join(','))  
    \].join('\\n');

    // 3\. 한글 깨짐 방지를 위한 UTF-8 BOM(\\uFEFF) 삽입  
    const BOM \= '\\uFEFF';  
      
    // 4\. 브라우저 메모리에 Blob 객체 생성 후 다운로드 트리거  
    const blob \= new Blob(\[BOM \+ csvString\], { type: 'text/csv;charset=utf-8;' });  
    const fileUrl \= URL.createObjectURL(blob);  
      
    const downloadLink \= document.createElement('a');  
    downloadLink.href \= fileUrl;  
    downloadLink.setAttribute('download', \`강서나눔돌봄센터\_CS민원데이터\_${format(new Date(), 'yyyyMMdd\_HHmm')}.csv\`);  
      
    document.body.appendChild(downloadLink);  
    downloadLink.click();  
      
    // 5\. 사용된 메모리 해제  
    document.body.removeChild(downloadLink);  
    URL.revokeObjectURL(fileUrl);  
  };

  return (  
    \<Button   
      variant="outline"   
      size="sm"   
      onClick={exportToCsv}  
      className="flex items-center gap-2 border-gray-300 shadow-sm text-gray-700 bg-white hover:bg-gray-50"  
    \>  
      \<Download className="w-4 h-4" /\>  
      CSV 내보내기  
    \</Button\>  
  );  
}

## **8\. 향후 고도화 방안: 서버 액션 에러 핸들링 및 실시간 동기화 (Realtime)**

본 구현체는 기초적인 Server Action 에러 핸들링 로직(Try-catch 및 error 객체 반환)을 채택하였으나, 시스템 규모가 커지고 트래픽이 집중될 경우 검증된 외부 래퍼(Wrapper) 라이브러리인 next-safe-action 등을 도입할 것을 권장한다. 해당 패턴은 Zod 등의 스키마 검증 도구와 결합하여 액션 호출 이전 단계에서 타입 검사 및 파라미터 유효성 검증을 완벽하게 수행하며, 보다 우수한 개발자 경험(DX)과 타입 안정성을 제공한다16.  
더불어, Supabase의 가장 강력한 기능인 **실시간(Realtime)** 데이터 동기화 파이프라인을 구축할 수 있다25. 현재 시스템은 직원이 모달을 닫거나 새로고침을 수행할 때 서버 상태를 동기화(revalidatePath)하는 구조이나, 챗봇 환경 특성상 고객의 민원은 무작위로 인입될 수 있다.  
향후 고도화 단계에서 브라우저의 클라이언트 측 컴포넌트에 Supabase의 channel 객체를 등록하고 데이터베이스의 변경 사항(postgres\_changes) 이벤트를 청취하도록 코드를 확장하면, 직원이 대시보드를 주시하고 있는 중에도 브라우저 새로고침 없이 새로 접수된 민원이 노란색 뱃지를 달고 최상단 행으로 스르륵 밀려들어 오는 반응형(Reactive) 아키텍처를 구현할 수 있다26.

## **9\. 결론**

강서나눔돌봄센터를 위해 구축된 본 프론트엔드 시스템은 최신 Next.js 15와 Supabase BaaS 인프라를 활용하여 서버 렌더링 성능과 보안이라는 두 마리 토끼를 성공적으로 획득하였다.  
단순하지만 강력한 6자리 이메일 OTP(Passwordless) 로그인과 더불어 영구적인 쿠키 세션을 적용함으로써 잦은 로그인에 지친 현업 실무진의 페인 포인트(Pain Point)를 원천적으로 해소하였다13. 데이터베이스 측면에서는 RLS(Row Level Security) 정책을 촘촘히 엮어 외부 해킹이나 비정상적인 API 호출에 데이터가 무방비로 노출되지 않도록 견고히 방어했다9.  
사용성 측면에서 shadcn/ui 기반의 슬라이드-오버(Sheet) 모달과 동적 테이블 필터링, 그리고 한글 인코딩이 깨지지 않도록 BOM 처리를 한 CSV 다운로드(Export) 기능 등은 사용자의 업무 생산성을 크게 향상시킬 것이다5. 본 시스템은 Vercel 에코시스템을 통해 빠르고 안정적으로 배포될 수 있으며, 비즈니스 성장에 따라 유연하게 코드를 변형하고 확장할 수 있는 최적의 B2B SaaS 골격을 갖추었다.

#### **참고 자료**

> 1. AI\_AX 컨설팅\_ 강서나눔돌봄센터.pdf  
> 2. Nextjs 15 — Actions Best Practice | by Lior Amsalem \- Medium, [https://medium.com/@lior\_amsalem/nextjs-15-actions-best-practice-207ef6a2e52a](https://medium.com/@lior_amsalem/nextjs-15-actions-best-practice-207ef6a2e52a)  
> 3. Next.js 15 Server Actions Tutorial — Build Full Stack Apps \- Medium, [https://medium.com/@cloudfullstack/next-js-15-server-actions-tutorial-build-full-stack-apps-1f1329edc9f2](https://medium.com/@cloudfullstack/next-js-15-server-actions-tutorial-build-full-stack-apps-1f1329edc9f2)  
> 4. Complete Guide to a Secure Web App using Next.js, Supabase, [https://ayeshasahar.hashnode.dev/complete-guide-to-a-secure-web-app-using-nextjs-supabase-typescript-tailwind-css-database-triggers](https://ayeshasahar.hashnode.dev/complete-guide-to-a-secure-web-app-using-nextjs-supabase-typescript-tailwind-css-database-triggers)  
> 5. Shadcn Drawer, [https://www.shadcn.io/ui/drawer](https://www.shadcn.io/ui/drawer)  
> 6. Next.js 15 App Router for SaaS in 2026: Patterns That Work, [https://www.duskolicanin.com/blog/nextjs-15-app-router-saas-patterns-2026](https://www.duskolicanin.com/blog/nextjs-15-app-router-saas-patterns-2026)  
> 7. Supabase Row Level Security Explained With Real Examples, [https://medium.com/@jigsz6391/supabase-row-level-security-explained-with-real-examples-6d06ce8d221c](https://medium.com/@jigsz6391/supabase-row-level-security-explained-with-real-examples-6d06ce8d221c)  
> 8. Row Level Security | Supabase Docs, [https://supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security)  
> 9. Supabase RLS Guide 2026: Policies That Actually Work, [https://designrevision.com/blog/supabase-row-level-security](https://designrevision.com/blog/supabase-row-level-security)  
> 10. supabase/examples/prompts/database-rls-policies.md at master, [https://github.com/supabase/supabase/blob/master/examples/prompts/database-rls-policies.md](https://github.com/supabase/supabase/blob/master/examples/prompts/database-rls-policies.md)  
> 11. Supabase Row Level Security in Production: Patterns That Actually, [https://dev.to/whoffagents/supabase-row-level-security-in-production-patterns-that-actually-work-2l78](https://dev.to/whoffagents/supabase-row-level-security-in-production-patterns-that-actually-work-2l78)  
> 12. What Is Supabase? The Open-Source Firebase Alternative Explained, [https://www.mindstudio.ai/blog/what-is-supabase](https://www.mindstudio.ai/blog/what-is-supabase)  
> 13. Add password-less OTP based authentication to your Next.js apps, [https://dev.to/asheeshh/add-password-less-otp-based-authentication-to-your-nextjs-apps-using-supabase-twilio-4na1](https://dev.to/asheeshh/add-password-less-otp-based-authentication-to-your-nextjs-apps-using-supabase-twilio-4na1)  
> 14. cookieOptions and config.toml config for cookie MaxAge are ignored, [https://github.com/supabase/ssr/issues/40](https://github.com/supabase/ssr/issues/40)  
> 15. Supabase auth for same session on multiple sub domains \#5742, [https://github.com/orgs/supabase/discussions/5742](https://github.com/orgs/supabase/discussions/5742)  
> 16. Fix Next.js "params should be awaited" Error in Next.js 15+, [https://dev.to/amrishkhan05/fix-nextjs-params-should-be-awaited-error-in-nextjs-15-273d](https://dev.to/amrishkhan05/fix-nextjs-params-should-be-awaited-error-in-nextjs-15-273d)  
> 17. Next.js App Router middleware for Supabase SSR auth. Refreshes, [https://gist.github.com/CodeLikeAGirl29/46fb0a1c84225fb6b4c02f3734f4ac9e](https://gist.github.com/CodeLikeAGirl29/46fb0a1c84225fb6b4c02f3734f4ac9e)  
> 18. next-safe-action, [https://next-safe-action.dev/](https://next-safe-action.dev/)  
> 19. How to Add Supabase to Next.js (2026 Step-by-Step Guide) | InBuild, [https://www.inbuild.io/guides/how-to-add-supabase-to-nextjs](https://www.inbuild.io/guides/how-to-add-supabase-to-nextjs)  
> 20. Does caching works in supabase \+ nextjs15? \- Stack Overflow, [https://stackoverflow.com/questions/79453323/does-caching-works-in-supabase-nextjs15](https://stackoverflow.com/questions/79453323/does-caching-works-in-supabase-nextjs15)  
> 21. Javascript Export CSV data URI is not displaying korean characters, [https://stackoverflow.com/questions/60266978/javascript-export-csv-data-uri-is-not-displaying-korean-characters](https://stackoverflow.com/questions/60266978/javascript-export-csv-data-uri-is-not-displaying-korean-characters)  
> 22. 왓챠피디아 데이터 추출 및 레터박스 옮기기 (최신) \- A Little Life, [https://volver.tistory.com/187](https://volver.tistory.com/187)  
> 23. \[javascript\] JSON to CSV (엑셀 셀 데이터), [https://dmobi.tistory.com/159](https://dmobi.tistory.com/159)  
> 24. 자주 발생하는 CSV 다운로드 한글 깨짐 현상 해결 방법 \- nicksoon, [https://nickdeveloper.co.kr/entry/%EC%9E%90%EC%A3%BC-%EB%B0%9C%EC%83%9D%ED%95%98%EB%8A%94-CSV-%EB%8B%A4%EC%9A%B4%EB%A1%9C%EB%93%9C-%ED%95%9C%EA%B8%80-%EA%B9%A8%EC%A7%90-%ED%98%84%EC%83%81-%ED%95%B4%EA%B2%B0-%EB%B0%A9%EB%B2%95](https://nickdeveloper.co.kr/entry/%EC%9E%90%EC%A3%BC-%EB%B0%9C%EC%83%9D%ED%95%98%EB%8A%94-CSV-%EB%8B%A4%EC%9A%B4%EB%A1%9C%EB%93%9C-%ED%95%9C%EA%B8%80-%EA%B9%A8%EC%A7%90-%ED%98%84%EC%83%81-%ED%95%B4%EA%B2%B0-%EB%B0%A9%EB%B2%95)  
> 25. Using Realtime with Next.js | Supabase Docs, [https://supabase.com/docs/guides/realtime/realtime-with-nextjs](https://supabase.com/docs/guides/realtime/realtime-with-nextjs)  
> 26. Realtime \- Supabase, [https://supabase.com/realtime](https://supabase.com/realtime)  
> 27. Building Real-time Magic: Supabase Subscriptions in Next.js 15, [https://dev.to/lra8dev/building-real-time-magic-supabase-subscriptions-in-nextjs-15-2kmp](https://dev.to/lra8dev/building-real-time-magic-supabase-subscriptions-in-nextjs-15-2kmp)  
> 28. AltotechTH/supabase-realtime-react-example \- GitHub, [https://github.com/AltotechTH/supabase-realtime-react-example](https://github.com/AltotechTH/supabase-realtime-react-example)