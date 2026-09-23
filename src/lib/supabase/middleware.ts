import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isDummyEnv as detectDummyEnv } from '@/lib/env';

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  // 로컬 개발(Supabase 미연결)에서만 인증을 건너뛴다. 운영 빌드에서는 환경변수가
  // 없더라도 false가 되어 아래 인증 검사를 정상적으로 타게 된다(lib/env.ts 참고).
  const isDummyEnv = detectDummyEnv();

  let user = null;

  if (!isDummyEnv) {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, {
                ...options,
                maxAge: TEN_YEARS,
              })
            );
          },
        },
      }
    );

    try {
      const {
        data: { user: supabaseUser },
      } = await supabase.auth.getUser();
      user = supabaseUser;
    } catch (e) {
      // Ignore auth fetch errors in dev/placeholder mode
    }
  }

  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');
  const isLoginRoute = request.nextUrl.pathname === '/login';
  const isRootRoute = request.nextUrl.pathname === '/';

  // 루트 경로 접속 시 인증 상태에 따라 대시보드 또는 로그인으로 이동
  if (isRootRoute) {
    const target = isDummyEnv || user ? '/dashboard' : '/login';
    return NextResponse.redirect(new URL(target, request.url));
  }

  // 실제 Supabase 연결 상태에서만 비인가자 차단
  if (!isDummyEnv && !user && isDashboardRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && isLoginRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}
