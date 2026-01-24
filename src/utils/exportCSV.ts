import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { ExamSession, AuditLog } from '@/components/admin/types';

const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy HH:mm', { locale: localeId });
  } catch {
    return '-';
  }
};

const escapeCSV = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, newline, or quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const downloadCSV = (content: string, filename: string) => {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportSessionsToCSV = (
  sessions: ExamSession[],
  filename: string = 'data-peserta'
) => {
  const headers = [
    'Nama',
    'Status',
    'TWK',
    'TIU',
    'TKP',
    'Total Skor',
    'Progress',
    'Durasi (menit)',
    'Alasan Diskualifikasi',
    'Mulai',
    'Selesai',
    'Device ID',
  ];

  const rows = sessions.map(session => [
    escapeCSV(session.name),
    escapeCSV(session.status),
    escapeCSV(session.twk_score),
    escapeCSV(session.tiu_score),
    escapeCSV(session.tkp_score),
    escapeCSV(session.total_score),
    escapeCSV(`${session.answered_count}/${session.total_questions}`),
    escapeCSV(session.duration_minutes),
    escapeCSV(session.disqualification_reason),
    escapeCSV(formatDateTime(session.started_at)),
    escapeCSV(formatDateTime(session.finished_at)),
    escapeCSV(session.device_fingerprint),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const timestamp = format(new Date(), 'yyyyMMdd-HHmm');
  downloadCSV(csvContent, `${filename}-${timestamp}.csv`);
};

export const exportAuditLogsToCSV = (
  logs: AuditLog[],
  filename: string = 'audit-log'
) => {
  const headers = [
    'Waktu',
    'Aksi',
    'Target ID',
    'Target Nama',
    'Detail',
    'IP Address',
    'User Agent',
  ];

  const rows = logs.map(log => [
    escapeCSV(formatDateTime(log.created_at)),
    escapeCSV(log.action),
    escapeCSV(log.target_id),
    escapeCSV(log.target_name),
    escapeCSV(log.details),
    escapeCSV(log.ip_address),
    escapeCSV(log.user_agent),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const timestamp = format(new Date(), 'yyyyMMdd-HHmm');
  downloadCSV(csvContent, `${filename}-${timestamp}.csv`);
};
