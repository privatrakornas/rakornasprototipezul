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

// Multi-sheet Excel export for all categories
export const exportAuditLogsMultiSheet = (
  logs: AuditLog[],
  filename: string = 'audit-log-lengkap'
) => {
  const headers = getAuditLogHeaders();
  
  // Categorize logs
  const loginLogs = logs.filter(log => 
    log.action === 'ADMIN_LOGIN' || log.action === 'ADMIN_LOGIN_FAILED' || log.action === 'ADMIN_LOGOUT'
  );
  const pesertaLogs = logs.filter(log => 
    log.action === 'DISQUALIFY' || log.action === 'SOFT_DELETE' || log.action === 'RESTORE'
  );
  const pinLogs = logs.filter(log => 
    log.action === 'PIN_CHANGE' || log.action === 'PIN_RESET'
  );

  const workbook = XLSX.utils.book_new();

  // Helper to create worksheet
  const createSheet = (data: AuditLog[], sheetName: string) => {
    const rows = data.map(mapAuditLogToRow);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    worksheet['!cols'] = [
      { wch: 20 }, { wch: 20 }, { wch: 36 }, { wch: 25 }, { wch: 40 }, { wch: 15 }, { wch: 50 },
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  };

  // Add all sheets
  createSheet(logs, 'Semua Log');
  createSheet(loginLogs, 'Login Admin');
  createSheet(pesertaLogs, 'Manajemen Peserta');
  createSheet(pinLogs, 'Manajemen PIN');

  const timestamp = format(new Date(), 'yyyyMMdd-HHmm');
  downloadExcel(workbook, `${filename}-${timestamp}.xlsx`);
  
  return {
    total: logs.length,
    login: loginLogs.length,
    peserta: pesertaLogs.length,
    pin: pinLogs.length,
  };
};

// Bulk export: Sessions + Audit Logs in one Excel file
export const exportBulkDataToExcel = (
  sessions: ExamSession[],
  auditLogs: AuditLog[],
  filename: string = 'data-lengkap-ujian'
) => {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: All Sessions
  const sessionHeaders = getSessionHeaders();
  const sessionRows = sessions.map(mapSessionToRow);
  const sessionSheet = XLSX.utils.aoa_to_sheet([sessionHeaders, ...sessionRows]);
  sessionSheet['!cols'] = [
    { wch: 25 }, { wch: 15 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 },
    { wch: 10 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(workbook, sessionSheet, 'Semua Peserta');

  // Sheet 2: Finished sessions only
  const finishedSessions = sessions.filter(s => s.status === 'finished');
  const finishedRows = finishedSessions.map(mapSessionToRow);
  const finishedSheet = XLSX.utils.aoa_to_sheet([sessionHeaders, ...finishedRows]);
  finishedSheet['!cols'] = sessionSheet['!cols'];
  XLSX.utils.book_append_sheet(workbook, finishedSheet, 'Selesai');

  // Sheet 3: Disqualified sessions
  const disqualifiedSessions = sessions.filter(s => s.status === 'disqualified');
  const disqualifiedRows = disqualifiedSessions.map(mapSessionToRow);
  const disqualifiedSheet = XLSX.utils.aoa_to_sheet([sessionHeaders, ...disqualifiedRows]);
  disqualifiedSheet['!cols'] = sessionSheet['!cols'];
  XLSX.utils.book_append_sheet(workbook, disqualifiedSheet, 'Diskualifikasi');

  // Sheet 4: Deleted sessions
  const deletedSessions = sessions.filter(s => s.deleted_at !== null);
  const deletedRows = deletedSessions.map(mapSessionToRow);
  const deletedSheet = XLSX.utils.aoa_to_sheet([sessionHeaders, ...deletedRows]);
  deletedSheet['!cols'] = sessionSheet['!cols'];
  XLSX.utils.book_append_sheet(workbook, deletedSheet, 'Di Sampah');

  // Sheet 5: All Audit Logs
  const auditHeaders = getAuditLogHeaders();
  const auditRows = auditLogs.map(mapAuditLogToRow);
  const auditSheet = XLSX.utils.aoa_to_sheet([auditHeaders, ...auditRows]);
  auditSheet['!cols'] = [
    { wch: 20 }, { wch: 20 }, { wch: 36 }, { wch: 25 }, { wch: 40 }, { wch: 15 }, { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(workbook, auditSheet, 'Audit Log');

  // Sheet 6: Summary
  const summaryData = [
    ['Ringkasan Export Data Ujian'],
    [''],
    ['Tanggal Export', format(new Date(), 'dd MMM yyyy HH:mm', { locale: localeId })],
    [''],
    ['DATA PESERTA'],
    ['Total Peserta', sessions.length],
    ['Selesai', finishedSessions.length],
    ['Diskualifikasi', disqualifiedSessions.length],
    ['Di Sampah', deletedSessions.length],
    [''],
    ['AUDIT LOG'],
    ['Total Log', auditLogs.length],
    ['Login Admin', auditLogs.filter(l => ['ADMIN_LOGIN', 'ADMIN_LOGIN_FAILED', 'ADMIN_LOGOUT'].includes(l.action)).length],
    ['Manajemen Peserta', auditLogs.filter(l => ['DISQUALIFY', 'SOFT_DELETE', 'RESTORE'].includes(l.action)).length],
    ['Manajemen PIN', auditLogs.filter(l => ['PIN_CHANGE', 'PIN_RESET'].includes(l.action)).length],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');

  const timestamp = format(new Date(), 'yyyyMMdd-HHmm');
  downloadExcel(workbook, `${filename}-${timestamp}.xlsx`);

  return {
    sessions: sessions.length,
    finished: finishedSessions.length,
    disqualified: disqualifiedSessions.length,
    deleted: deletedSessions.length,
    auditLogs: auditLogs.length,
  };
};
