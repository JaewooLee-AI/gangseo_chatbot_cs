import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// 영구 세션 유지를 위한 10년 단위 초(seconds) 계산
const TEN_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 10;

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                maxAge: TEN_YEARS_IN_SECONDS, // 세션 영구 유지
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
