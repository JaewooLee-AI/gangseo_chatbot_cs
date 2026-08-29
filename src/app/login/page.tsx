'use client';

import { useState } from 'react';
import { sendOtpAction, verifyOtpAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setInfoMessage('');

    const res = await sendOtpAction(email);
    if (res?.error) {
      setErrorMessage(res.error);
    } else {
      setStep(2);
      if (res?.isMock) {
        setInfoMessage('테스트 환경 모드입니다. 인증번호에 아무 6자리 숫자를 입력 후 로그인하세요.');
      }
    }
    setIsLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    const res = await verifyOtpAction(email, otp);
    if (res?.error) {
      setErrorMessage(res.error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ace-ivory p-4 font-sans">
      <div className="w-full max-w-md border-4 border-ace-charcoal bg-white p-8 shadow-brutalist">
        <div className="mb-8 border-b-2 border-ace-charcoal pb-6 text-center">
          <div className="inline-block bg-ace-orange px-3 py-1 text-xs font-mono font-bold tracking-widest text-ace-charcoal mb-3 border border-ace-charcoal">
            B2B INTERNAL WORKFLOW
          </div>
          <h1 className="text-2xl font-black tracking-tight text-ace-charcoal font-sans">
            강서나눔돌봄센터
          </h1>
          <p className="mt-2 text-xs font-mono font-semibold uppercase text-ace-muted">
            CS Ticket Management System
          </p>
        </div>

        {infoMessage && (
          <div className="mb-6 border-2 border-ace-charcoal bg-amber-100 p-3 text-xs font-mono text-ace-charcoal">
            💡 {infoMessage}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendEmail} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-ace-charcoal">
                담당자 이메일 주소
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gangseocare.or.kr"
              />
            </div>
            {errorMessage && (
              <p className="border border-ace-error bg-red-50 p-2 text-xs font-mono text-ace-error">
                ⚠ {errorMessage}
              </p>
            )}
            <Button type="submit" variant="secondary" className="w-full" disabled={isLoading}>
              {isLoading ? '인증번호 발송 중...' : '인증번호 받기 →'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-ace-charcoal">
                  이메일 인증번호
                </label>
                <span className="text-xs font-mono text-ace-muted">{email}</span>
              </div>
              <Input
                type="text"
                required
                inputMode="numeric"
                maxLength={10}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="이메일로 받은 인증번호 입력"
                className="text-center font-mono text-xl font-bold tracking-widest"
              />
            </div>
            {errorMessage && (
              <p className="border border-ace-error bg-red-50 p-2 text-xs font-mono text-ace-error">
                ⚠ {errorMessage}
              </p>
            )}
            <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
              {isLoading ? '인증 확인 중...' : '시스템 로그인'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setOtp('');
                setErrorMessage('');
                setInfoMessage('');
              }}
              className="w-full text-xs font-mono text-ace-muted hover:text-ace-charcoal underline underline-offset-4 pt-2"
            >
              ← 이메일 다시 입력하기
            </button>
          </form>
        )}
      </div>

      <p className="mt-8 text-center text-xs font-mono text-ace-muted">
        Gangseo Nanum Care Center CS Ticket Management Systems v1.0
      </p>
    </div>
  );
}
