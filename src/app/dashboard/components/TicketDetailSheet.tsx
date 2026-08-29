'use client';

import { useState, useEffect } from 'react';
import { CounselorInquiry, processInquiryAction } from '../actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Tag, Clock, CheckCircle2, AlertCircle, Mic, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TicketDetailSheetProps {
  ticket: CounselorInquiry | null;
  onClose: () => void;
}

export default function TicketDetailSheet({ ticket, onClose }: TicketDetailSheetProps) {
  const [memo, setMemo] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (ticket) {
      setMemo(ticket.admin_note || '');
      setErrorMsg('');
    }
  }, [ticket]);

  const handleSubmit = async () => {
    if (!ticket) return;
    if (!memo.trim()) {
      setErrorMsg('조치 내역 및 메모를 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const result = await processInquiryAction(ticket.id, memo);
    setIsSubmitting(false);

    if (result.error) {
      setErrorMsg(result.error);
    } else {
      onClose();
    }
  };

  return (
    <Sheet
      open={!!ticket}
      onClose={onClose}
      title="CS 민원 상세 및 조치 처리"
      description="챗봇을 통해 수집된 고객 문의 내용과 LLM 요약을 확인하고 후속 조치 결과를 기입합니다."
    >
      {ticket && (
        <div className="space-y-6 pt-2 font-sans">
          {/* 상태 뱃지 및 일시 */}
          <div className="flex items-center justify-between border-b-2 border-ace-charcoal pb-4">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-ace-muted block mb-1">
                TICKET ID
              </span>
              <span className="font-mono text-sm font-bold bg-white border border-ace-charcoal px-2 py-0.5">
                {ticket.id}
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs text-ace-muted block mb-1">접수 일시</span>
              <span className="font-mono text-xs font-bold text-ace-charcoal">
                {format(new Date(ticket.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
              </span>
            </div>
          </div>

          {/* 정보 카드 그리드 */}
          <div className="grid grid-cols-2 gap-4 border-2 border-ace-charcoal bg-white p-4 shadow-brutalist-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-ace-muted uppercase">
                <User className="w-3.5 h-3.5" /> 고객명
              </div>
              <p className="text-base font-bold text-ace-charcoal">{ticket.user_name || '미상'}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-ace-muted uppercase">
                <Phone className="w-3.5 h-3.5" /> 연락처
              </div>
              <p className="text-base font-mono font-bold text-ace-charcoal">{ticket.contact_info || '-'}</p>
            </div>

            <div className="space-y-1 pt-2 border-t border-ace-cement">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-ace-muted uppercase">
                <Tag className="w-3.5 h-3.5" /> 민원 카테고리
              </div>
              <Badge variant="secondary" className="mt-1">
                {ticket.category}
              </Badge>
            </div>

            <div className="space-y-1 pt-2 border-t border-ace-cement">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-ace-muted uppercase">
                <Clock className="w-3.5 h-3.5" /> 처리 상태
              </div>
              <div className="mt-1">
                {ticket.status === 'pending' && (
                  <Badge variant="destructive" className="flex w-fit items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> 대기중
                  </Badge>
                )}
                {ticket.status === 'in_progress' && (
                  <Badge variant="secondary" className="flex w-fit items-center gap-1">
                    <Clock className="w-3 h-3" /> 처리중
                  </Badge>
                )}
                {ticket.status === 'resolved' && (
                  <Badge variant="success" className="flex w-fit items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> 처리완료
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-1 pt-2 border-t border-ace-cement col-span-2">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-ace-muted uppercase">
                {ticket.input_type === 'voice' ? <Mic className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                접수 유형
              </div>
              <p className="text-sm font-medium text-ace-charcoal">
                {ticket.input_type === 'voice' ? '음성 녹음' : '텍스트 채팅'}
              </p>
            </div>
          </div>

          {/* 고객 문의 내용 / LLM 요약 */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-ace-charcoal">
              고객 문의 요약 (LLM 자동 분류)
            </label>
            <div className="border-2 border-ace-charcoal bg-white p-4 text-sm leading-relaxed text-ace-charcoal whitespace-pre-wrap font-sans">
              {ticket.inquiry_summary || '요약 없음'}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-ace-charcoal">
              원문 발화 메시지
            </label>
            <div className="border-2 border-ace-cement bg-ace-ivory p-4 text-sm leading-relaxed text-ace-charcoal whitespace-pre-wrap font-sans">
              {ticket.raw_message}
            </div>
          </div>

          {/* 담당자 조치 결과 메모 입력 */}
          <div className="space-y-2 pt-2 border-t-2 border-ace-charcoal">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-ace-charcoal">
              담당자 후속 조치 및 상담 내역 <span className="text-ace-error">*</span>
            </label>
            <Textarea
              placeholder="유선 연락 안내 완료, 요양보호사 일정 조정, 환불 조치 완료 등 상세 조치 결과를 입력하세요."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              disabled={ticket.status === 'resolved'}
              className="min-h-[140px]"
            />
            {ticket.status === 'resolved' && (
              <p className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-300 p-2">
                ✓ 이미 처리가 완료된 문의입니다.
              </p>
            )}
            {errorMsg && (
              <p className="text-xs font-mono text-ace-error bg-red-50 border border-ace-error p-2">
                ⚠ {errorMsg}
              </p>
            )}
          </div>

          {/* 버튼 컨트롤 */}
          <div className="flex gap-3 pt-4 border-t-2 border-ace-charcoal justify-end">
            <Button variant="outline" onClick={onClose} type="button">
              닫기
            </Button>
            {ticket.status !== 'resolved' && (
              <Button
                variant="secondary"
                onClick={handleSubmit}
                disabled={isSubmitting || !memo.trim()}
                type="button"
              >
                {isSubmitting ? '저장 중...' : '처리 완료 및 저장 ✓'}
              </Button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
