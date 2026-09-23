// Supabase 미연결(목업) 모드 판정 — 로컬 개발 편의 전용.
//
// 운영 빌드에서는 절대 활성화되면 안 된다. NEXT_PUBLIC_* 값은 빌드 시점에 번들로
// 인라인되므로, 배포 플랫폼의 "빌드용 환경변수"를 빠뜨리면 빌드는 성공하지만
// 목업 모드로 굳어진 결과물이 배포된다(실제로 gangseo_chatbot_web의 Cloudflare
// 이관 때 빌드 환경변수가 전달되지 않는 일을 겪었다, 2026-09-23).
//
// 그 상태가 이 앱에서 특히 위험한 이유:
//   - 미들웨어가 인증을 통째로 건너뛰어 누구나 /dashboard의 고객 개인정보를 열람
//   - OTP 검증이 아무 6자리 코드나 통과시킴
// 그래서 production에서는 값이 없더라도 목업으로 빠지지 않고 정상 인증 경로를
// 타도록(= 로그인 불가, fail closed) 고정한다.
export function isDummyEnv(): boolean {
  if (process.env.NODE_ENV === 'production') return false;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !url || url.includes('your-supabase-project');
}
