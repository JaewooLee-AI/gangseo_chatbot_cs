'use client';

import { CounselorInquiry } from '../actions';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_LABEL: Record<string, string> = {
  pending: '대기중',
  in_progress: '처리중',
  resolved: '처리완료',
};

export default function CsvExportButton({ dataToExport }: { dataToExport: CounselorInquiry[] }) {
  const exportToCsv = () => {
    if (!dataToExport || dataToExport.length === 0) {
      alert('추출할 데이터가 존재하지 않습니다.');
      return;
    }

    // 1. CSV 컬럼 헤더 정의
    const headerRow = ['접수일시', '고객명', '연락처', '카테고리', '문의내용요약', '원문메시지', '상태', '담당자메모'];

    // 2. CSV 바디 구성 (내부 쌍따옴표 이스케이프 및 콤마 충돌 방지를 위해 문자열 캡슐화)
    const bodyRows = dataToExport.map((ticket) => {
      const formattedDate = format(new Date(ticket.created_at), 'yyyy-MM-dd HH:mm');
      const safeSummary = ticket.inquiry_summary ? ticket.inquiry_summary.replace(/"/g, '""') : '';
      const safeRaw = ticket.raw_message ? ticket.raw_message.replace(/"/g, '""') : '';
      const safeMemo = ticket.admin_note ? ticket.admin_note.replace(/"/g, '""') : '';

      return [
        `"${formattedDate}"`,
        `"${ticket.user_name || ''}"`,
        `"${ticket.contact_info || ''}"`,
        `"${ticket.category}"`,
        `"${safeSummary}"`,
        `"${safeRaw}"`,
        `"${STATUS_LABEL[ticket.status] ?? ticket.status}"`,
        `"${safeMemo}"`,
      ];
    });

    const csvString = [
      headerRow.join(','),
      ...bodyRows.map((row) => row.join(',')),
    ].join('\n');

    // 3. MS 엑셀 한글 깨짐 방지를 위한 UTF-8 BOM(﻿) 삽입
    const BOM = '﻿';

    // 4. 브라우저 메모리에 Blob 객체 생성 후 다운로드 트리거
    const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });
    const fileUrl = URL.createObjectURL(blob);

    const downloadLink = document.createElement('a');
    downloadLink.href = fileUrl;
    downloadLink.setAttribute('download', `강서나눔돌봄센터_CS민원데이터_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);

    document.body.appendChild(downloadLink);
    downloadLink.click();

    // 5. 메모리 해제 및 링크 제거
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(fileUrl);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportToCsv}
      className="flex items-center gap-2 font-mono text-xs tracking-wider"
    >
      <Download className="w-4 h-4 text-ace-charcoal" />
      CSV 내보내기 (EXCEL)
    </Button>
  );
}
