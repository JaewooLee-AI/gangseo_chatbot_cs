# Cloudflare Workers 배포 가이드

이 앱(CS 티켓 관리 웹앱)을 Cloudflare Workers에 배포하는 절차다.
`gangseo_chatbot_web`도 동일한 구조이므로 그쪽 배포에도 그대로 적용된다.

> 이 앱은 LLM을 호출하지 않으므로 `gemini-relay`(Cloud Run) 구성이 **필요 없다.**
> 챗봇(`gangseo_chatbot_web`)만 릴레이가 필요하다.

---

## 1. Cloudflare 프로젝트 생성

Cloudflare 대시보드 → **Workers & Pages** → **Create** → **Import a repository** →
이 저장소(`gangseo_chatbot_cs`) 선택.

## 2. 빌드 설정 (Settings → Builds)

| 항목 | 값 |
| --- | --- |
| **Build command** | `npm run cf-build` |
| Deploy command | `npx wrangler deploy` (기본값) |

> ⚠️ **`npm run build`로 두면 안 된다.** 그건 순수 `next build`라서 Cloudflare가 필요로 하는
> `.open-next/` 번들이 만들어지지 않고, 배포 단계에서
> `Could not find compiled Open Next config` 에러가 난다.
>
> 반대로 `package.json`의 `"build"` 자체를 `opennextjs-cloudflare build`로 바꾸는 것도 안 된다.
> OpenNext CLI가 내부적으로 프로젝트의 `"build"` 스크립트를 호출하는 구조라 **무한 재귀**에 빠진다.
> 그래서 `cf-build`라는 별도 스크립트로 분리해 두었다.

## 3. 환경변수 — **두 군데 모두** 등록해야 한다

여기가 가장 많이 실수하는 지점이다. Cloudflare는 **빌드할 때 쓰는 변수**와
**배포된 앱이 실행될 때 쓰는 변수**가 서로 다른 화면이다. 한쪽만 넣으면 조용히 실패한다.

### 3-1. 빌드용 (Settings → **Builds** → Variables and Secrets)

| 변수명 | 타입 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 일반 텍스트 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 일반 텍스트 |

`NEXT_PUBLIC_*` 값은 빌드 시점에 번들 안으로 인라인되므로 **반드시 빌드용에 있어야 한다.**

> 🔴 **이걸 빠뜨리면 빌드는 성공하지만 앱이 망가진 채로 배포된다.**
> 예전에는 환경변수가 없으면 목업 모드로 폴백하면서 **인증이 통째로 우회**됐다
> (누구나 `/dashboard`의 고객 개인정보 열람). 지금은 `src/lib/env.ts`에서
> production일 때 목업 모드를 강제로 끄도록 막아두어, 이 경우 인증 우회 대신
> **로그인이 아예 안 되는 형태로 안전하게 실패**한다. 그래도 정상 동작하려면
> 이 변수들은 반드시 필요하다.

### 3-2. 런타임용 (Worker → Settings → **Variables and Secrets**)

| 변수명 | 타입 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Secret |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Secret |

서버 사이드 코드(미들웨어, 서버 액션)는 실행 시점에 `process.env`를 읽으므로 이쪽도 필요하다.

CLI로 넣는 게 더 확실하다(대시보드에서 저장했는데 실제로는 반영되지 않는 경우를 겪었다):

```bash
# 값을 화면에 노출하지 않고 등록
grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d '=' -f2- | npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | cut -d '=' -f2- | npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY

# 실제로 등록됐는지 확인 (빈 배열이면 반영 안 된 것)
npx wrangler secret list
```

## 4. 배포 확인

```bash
# 실시간 런타임 로그 (에러가 나면 여기 찍힌다)
npx wrangler tail gangseo-chatbot-cs --format pretty
```

브라우저에서 확인할 것:

1. 로그아웃 상태로 `/dashboard` 접속 → `/login`으로 리다이렉트되는가 (인증 게이트 정상)
2. 등록된 직원 이메일로 OTP 로그인 → 대시보드 진입되는가
3. 대시보드에 **실제 티켓**이 보이는가 (김영희·박철수 같은 목업 데이터만 보이면 환경변수 문제)
4. 티켓 상세 열어 조치 메모 입력 → 처리완료 저장되는가

---

## 로컬 개발

```bash
npm run dev          # 일반 Next.js 개발 서버 (3001 포트)
npm run cf-build     # Cloudflare용 번들 생성 (.open-next/)
npm run preview      # Workers 런타임으로 로컬 미리보기
npx wrangler deploy --dry-run   # 배포 없이 설정만 검증
```

`.env.local`이 없으면 로컬 개발에서는 목업 모드로 동작한다(운영 빌드에서는 비활성화됨).

---

## 고객사별로 새로 구성할 때

1. 이 저장소를 고객용 GitHub 계정으로 fork
2. 고객용 Supabase 프로젝트 생성 후 `supabase/schema.sql` 실행
3. 위 1~3단계대로 고객 Cloudflare 계정에 연결 (환경변수는 고객 Supabase 값으로)
4. `wrangler.jsonc`의 `name`과 `services[].service` 값은 **서로 같아야 한다.**
   Worker 이름을 바꾼다면 두 곳 다 바꿀 것 — 다르면
   `Service binding 'WORKER_SELF_REFERENCE' references Worker '...' which was not found`
   에러로 배포가 실패한다.
