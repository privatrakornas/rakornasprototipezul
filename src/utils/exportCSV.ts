import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import * as XLSX from 'xlsx';
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
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const downloadCSV = (content: string, filename: string) => {
  const BOM = '\uFEFF';
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

const downloadExcel = (workbook: XLSX.WorkBook, filename: string) => {
  XLSX.writeFile(workbook, filename);
};

// Session export functions
const getSessionHeaders = () => [
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

const mapSessionToRow = (session: ExamSession) => [
  session.name,
  session.status,
  session.twk_score,
  session.tiu_score,
  session.tkp_score,
  session.total_score,
  `${session.answered_count}/${session.total_questions}`,
  session.duration_minutes ?? '-',
  session.disqualification_reason ?? '-',
  formatDateTime(session.started_at),
  formatDateTime(session.finished_at),
  session.device_fingerprint,
];

export const exportSessionsToCSV = (
  sessions: ExamSession[],
  filename: string = 'data-peserta'
) => {
  const headers = getSessionHeaders();
  const rows = sessions.map(session => 
    mapSessionToRow(session).map(v => escapeCSV(v))
  );

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const timestamp = format(new Date(), 'yyyyMMdd-HHmm');
  downloadCSV(csvContent, `${filename}-${timestamp}.csv`);
};

export const exportSessionsToExcel = (
  sessions: ExamSession[],
  filename: string = 'data-peserta'
) => {
  const headers = getSessionHeaders();
  const rows = sessions.map(mapSessionToRow);
  
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 25 }, // Nama
    { wch: 15 }, // Status
    { wch: 8 },  // TWK
    { wch: 8 },  // TIU
    { wch: 8 },  // TKP
    { wch: 12 }, // Total Skor
    { wch: 10 }, // Progress
    { wch: 15 }, // Durasi
    { wch: 30 }, // Alasan
    { wch: 20 }, // Mulai
    { wch: 20 }, // Selesai
    { wch: 15 }, // Device ID
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Peserta');

  const timestamp = format(new Date(), 'yyyyMMdd-HHmm');
  downloadExcel(workbook, `${filename}-${timestamp}.xlsx`);
};

// Audit log export functions
const getAuditLogHeaders = () => [
  'Waktu',
  'Aksi',
  'Target ID',
  'Target Nama',
  'Detail',
  'IP Address',
  'User Agent',
];

const mapAuditLogToRow = (log: AuditLog) => [
  formatDateTime(log.created_at),
  log.action,
  log.target_id ?? '-',
  log.target_name ?? '-',
  log.details ?? '-',
  log.ip_address ?? '-',
  log.user_agent ?? '-',
];

export const exportAuditLogsToCSV = (
  logs: AuditLog[],
  filename: string = 'audit-log'
) => {
  const headers = getAuditLogHeaders();
  const rows = logs.map(log => 
    mapAuditLogToRow(log).map(v => escapeCSV(v))
  );

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const timestamp = format(new Date(), 'yyyyMMdd-HHmm');
  downloadCSV(csvContent, `${filename}-${timestamp}.csv`);
};

export const exportAuditLogsToExcel = (
  logs: AuditLog[],
  filename: string = 'audit-log'
) => {
  const headers = getAuditLogHeaders();
  const rows = logs.map(mapAuditLogToRow);
  
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 20 }, // Waktu
    { wch: 20 }, // Aksi
    { wch: 36 }, // Target ID
    { wch: 25 }, // Target Nama
    { wch: 40 }, // Detail
    { wch: 15 }, // IP Address
    { wch: 50 }, // User Agent
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Log');

  const timestamp = format(new Date(), 'yyyyMMdd-HHmm');
  downloadExcel(workbook, `${filename}-${timestamp}.xlsx`);
};
