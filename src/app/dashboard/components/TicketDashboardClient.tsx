'use client';

import { useState } from 'react';
import { CounselorInquiry } from '../actions';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import TicketDetailSheet from './TicketDetailSheet';
import CsvExportButton from './CsvExportButton';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Search } from 'lucide-react';

export default function TicketDashboardClient({ initialTickets }: { initialTickets: CounselorInquiry[] }) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchWord, setSearchWord] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<CounselorInquiry | null>(null);

  // 동적 카테고리 추출
  const uniqueCategories = Array.from(new Set(initialTickets.map((t) => t.category)));

  // 필터링 적용 로직
  const displayedTickets = initialTickets.filter((ticket) => {
    const matchStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchCat = filterCategory === 'all' || ticket.category === filterCategory;
    const search = searchWord.trim();
    const matchSearch =
      search === '' ||
      (ticket.user_name ?? '').includes(search) ||
      (ticket.inquiry_summary ?? '').includes(search) ||
      (ticket.raw_message ?? '').includes(search) ||
      (ticket.contact_info ?? '').includes(search);
    return matchStatus && matchCat && matchSearch;
  });

  const statusOptions = [
    { value: 'all', label: '전체 상태' },
    { value: 'pending', label: '대기중' },
    { value: 'in_progress', label: '처리중' },
    { value: 'resolved', label: '처리완료' },
  ];

  const categoryOptions = [
    { value: 'all', label: '전체 카테고리' },
    ...uniqueCategories.map((cat) => ({ value: cat, label: cat })),
  ];

  const getStatusBadge = (status: string) => {
    if (status === 'pending') {
      return <Badge variant="destructive">대기중</Badge>;
    }
    if (status === 'in_progress') {
      return <Badge variant="secondary">처리중</Badge>;
    }
    return <Badge variant="success">처리완료</Badge>;
  };

  return (
    <div className="border-4 border-ace-charcoal bg-white shadow-brutalist overflow-hidden font-sans">
      {/* 필터 및 컨트롤 바 */}
      <div className="p-5 border-b-4 border-ace-charcoal bg-ace-ivory flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          {/* 상태 필터 */}
          <div className="w-full sm:w-44">
            <Select
              options={statusOptions}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            />
          </div>

          {/* 카테고리 필터 */}
          <div className="w-full sm:w-52">
            <Select
              options={categoryOptions}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            />
          </div>

          {/* 검색 필터 */}
          <div className="relative flex-1 min-w-[200px]">
            <Input
              placeholder="고객명, 연락처, 요약 검색..."
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              className="pl-9"
            />
            <Search className="w-4 h-4 text-ace-muted absolute left-3 top-3.5 pointer-events-none" />
          </div>
        </div>

        {/* CSV 추출 버튼 */}
        <div className="shrink-0 flex items-center justify-end">
          <CsvExportButton dataToExport={displayedTickets} />
        </div>
      </div>

      {/* 결과 집계 현황 메타 바 */}
      <div className="px-5 py-2.5 bg-ace-charcoal text-white font-mono text-xs flex justify-between items-center border-b-2 border-ace-charcoal">
        <div className="flex items-center gap-4">
          <span>TOTAL: <strong>{initialTickets.length}</strong>건</span>
          <span>FILTERED: <strong className="text-ace-orange">{displayedTickets.length}</strong>건</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> 대기: {displayedTickets.filter((t) => t.status === 'pending').length}건</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> 처리중: {displayedTickets.filter((t) => t.status === 'in_progress').length}건</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> 완료: {displayedTickets.filter((t) => t.status === 'resolved').length}건</span>
        </div>
      </div>

      {/* 데이터 테이블 */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">접수일시</TableHead>
              <TableHead className="w-[110px]">고객명</TableHead>
              <TableHead className="w-[140px]">연락처</TableHead>
              <TableHead className="w-[120px]">카테고리</TableHead>
              <TableHead>문의 내용 요약 (LLM)</TableHead>
              <TableHead className="w-[110px] text-center">처리 상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedTickets.length > 0 ? (
              displayedTickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="cursor-pointer group"
                >
                  <TableCell className="font-mono text-xs font-bold text-ace-muted group-hover:text-ace-charcoal">
                    {format(new Date(ticket.created_at), 'yy.MM.dd HH:mm', { locale: ko })}
                  </TableCell>
                  <TableCell className="font-extrabold text-ace-charcoal text-base">
                    {ticket.user_name || '미상'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-ace-charcoal">
                    {ticket.contact_info || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-ace-ivory">
                      {ticket.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-ace-charcoal font-medium truncate max-w-[320px]">
                    {ticket.inquiry_summary || ticket.raw_message}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(ticket.status)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center font-mono text-sm text-ace-muted">
                  검색 및 필터 조건에 일치하는 문의가 존재하지 않습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 우측 슬라이드 오버 패널 */}
      <TicketDetailSheet
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
      />
    </div>
  );
}
