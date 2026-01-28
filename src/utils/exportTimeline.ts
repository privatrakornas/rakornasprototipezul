import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

interface NavigationEvent {
  timestamp: string;
  remainingTimeSeconds: number;
  questionNumber: number;
  action: string;
  previousQuestion?: number;
}

interface TimelineEntry {
  startTime: string;
  endTime: string;
  durationSeconds: number;
  questionNumber: number;
  action: string;
  actionLabel: string;
}

// Helper functions
const formatRemainingTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} detik`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) {
    return `${mins} menit`;
  }
  return `${mins} menit ${secs} detik`;
};

const getActionLabel = (action: string, prevQ?: number): string => {
  switch (action) {
    case 'next':
      return 'Klik Next';
    case 'prev':
      return 'Klik Previous';
    case 'jump':
      return prevQ ? `Lompat dari Soal ${prevQ}` : 'Lompat Navigasi';
    case 'submit':
      return 'Submit Ujian';
    case 'auto_submit':
      return 'Auto-Submit (Waktu Habis)';
    case 'start':
      return 'Mulai Ujian';
    default:
      return action;
  }
};

// Process navigation log into timeline entries
export const processNavigationLog = (navigationLog: NavigationEvent[]): TimelineEntry[] => {
  if (!navigationLog || navigationLog.length === 0) return [];
  
  const entries: TimelineEntry[] = [];
  
  // Sort by remaining time (descending - higher time = earlier in exam)
  const sortedLog = [...navigationLog].sort(
    (a, b) => b.remainingTimeSeconds - a.remainingTimeSeconds
  );
  
  for (let i = 0; i < sortedLog.length; i++) {
    const current = sortedLog[i];
    const next = sortedLog[i + 1];
    
    const durationSeconds = next 
      ? current.remainingTimeSeconds - next.remainingTimeSeconds
      : current.remainingTimeSeconds;
    
    entries.push({
      startTime: formatRemainingTime(current.remainingTimeSeconds),
      endTime: formatRemainingTime(next?.remainingTimeSeconds ?? 0),
      durationSeconds: Math.max(0, durationSeconds),
      questionNumber: current.questionNumber,
      action: current.action,
      actionLabel: getActionLabel(current.action, current.previousQuestion),
    });
  }
  
  return entries;
};

// Calculate statistics from navigation log
export const calculateTimelineStats = (navigationLog: NavigationEvent[]) => {
  if (!navigationLog || navigationLog.length === 0) return null;
  
  const totalEvents = navigationLog.length;
  const nextCount = navigationLog.filter(e => e.action === 'next').length;
  const prevCount = navigationLog.filter(e => e.action === 'prev').length;
  const jumpCount = navigationLog.filter(e => e.action === 'jump').length;
  
  // Calculate time spent per question
  const timePerQuestion: Record<number, number> = {};
  const sortedLog = [...navigationLog].sort(
    (a, b) => b.remainingTimeSeconds - a.remainingTimeSeconds
  );
  
  for (let i = 0; i < sortedLog.length; i++) {
    const current = sortedLog[i];
    const next = sortedLog[i + 1];
    const duration = next 
      ? current.remainingTimeSeconds - next.remainingTimeSeconds
      : current.remainingTimeSeconds;
    
    timePerQuestion[current.questionNumber] = 
      (timePerQuestion[current.questionNumber] || 0) + Math.max(0, duration);
  }
  
  // Find most visited questions
  const questionVisits: Record<number, number> = {};
  navigationLog.forEach(e => {
    questionVisits[e.questionNumber] = (questionVisits[e.questionNumber] || 0) + 1;
  });
  
  const mostVisited = Object.entries(questionVisits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([q, count]) => ({ question: parseInt(q), count }));
  
  // Top 10 longest questions
  const longestQuestions = Object.entries(timePerQuestion)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([q, time]) => ({ question: parseInt(q), timeSeconds: time }));
  
  return {
    totalEvents,
    nextCount,
    prevCount,
    jumpCount,
    mostVisited,
    longestQuestions,
    timePerQuestion,
  };
};

// Export timeline to Excel
export const exportTimelineToExcel = (
  navigationLog: NavigationEvent[],
  participantName: string,
  examDurationMinutes: number
) => {
  const entries = processNavigationLog(navigationLog);
  const stats = calculateTimelineStats(navigationLog);
  
  // Timeline sheet data
  const timelineHeaders = ['No', 'Waktu Mulai', 'Waktu Selesai', 'Durasi', 'Nomor Soal', 'Aksi'];
  const timelineRows = entries.map((entry, idx) => [
    idx + 1,
    entry.startTime,
    entry.endTime,
    formatDuration(entry.durationSeconds),
    entry.questionNumber,
    entry.actionLabel,
  ]);
  
  const timelineSheet = XLSX.utils.aoa_to_sheet([timelineHeaders, ...timelineRows]);
  timelineSheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 12 }, // Waktu Mulai
    { wch: 12 }, // Waktu Selesai
    { wch: 18 }, // Durasi
    { wch: 12 }, // Nomor Soal
    { wch: 25 }, // Aksi
  ];
  
  // Stats sheet data
  const statsData = [
    ['LAPORAN JEJAK ALUR PENGERJAAN'],
    [''],
    ['Nama Peserta', participantName],
    ['Durasi Ujian', `${examDurationMinutes} menit`],
    ['Tanggal Export', format(new Date(), 'dd MMM yyyy HH:mm', { locale: localeId })],
    [''],
    ['RINGKASAN STATISTIK'],
    ['Total Aksi Navigasi', stats?.totalEvents ?? 0],
    ['Klik Next', stats?.nextCount ?? 0],
    ['Klik Previous', stats?.prevCount ?? 0],
    ['Lompat Navigasi', stats?.jumpCount ?? 0],
    [''],
    ['SOAL PALING LAMA DIKERJAKAN'],
  ];
  
  if (stats?.longestQuestions) {
    stats.longestQuestions.forEach((q, idx) => {
      statsData.push([`${idx + 1}. Soal No. ${q.question}`, formatDuration(q.timeSeconds)]);
    });
  }
  
  statsData.push(['']);
  statsData.push(['SOAL PALING SERING DIKUNJUNGI']);
  
  if (stats?.mostVisited) {
    stats.mostVisited.forEach((q, idx) => {
      statsData.push([`${idx + 1}. Soal No. ${q.question}`, `${q.count} kali`]);
    });
  }
  
  const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
  statsSheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, statsSheet, 'Ringkasan');
  XLSX.utils.book_append_sheet(workbook, timelineSheet, 'Detail Timeline');
  
  const timestamp = format(new Date(), 'yyyyMMdd-HHmm');
  const safeFileName = participantName.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(workbook, `Timeline-${safeFileName}-${timestamp}.xlsx`);
};

// Export timeline to PDF
export const exportTimelineToPDF = (
  navigationLog: NavigationEvent[],
  participantName: string,
  examDurationMinutes: number
) => {
  const entries = processNavigationLog(navigationLog);
  const stats = calculateTimelineStats(navigationLog);
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;
  
  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN JEJAK ALUR PENGERJAAN', pageWidth / 2, y, { align: 'center' });
  y += 12;
  
  // Participant info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nama Peserta: ${participantName}`, margin, y);
  y += 6;
  doc.text(`Durasi Ujian: ${examDurationMinutes} menit`, margin, y);
  y += 6;
  doc.text(`Tanggal Export: ${format(new Date(), 'dd MMM yyyy HH:mm', { locale: localeId })}`, margin, y);
  y += 12;
  
  // Statistics section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RINGKASAN STATISTIK', margin, y);
  y += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const statsItems = [
    ['Total Aksi Navigasi', String(stats?.totalEvents ?? 0)],
    ['Klik Next', String(stats?.nextCount ?? 0)],
    ['Klik Previous', String(stats?.prevCount ?? 0)],
    ['Lompat Navigasi', String(stats?.jumpCount ?? 0)],
  ];
  
  statsItems.forEach(([label, value]) => {
    doc.text(`${label}: ${value}`, margin, y);
    y += 5;
  });
  y += 5;
  
  // Longest questions
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('SOAL PALING LAMA DIKERJAKAN', margin, y);
  y += 7;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (stats?.longestQuestions) {
    stats.longestQuestions.slice(0, 5).forEach((q, idx) => {
      doc.text(`${idx + 1}. Soal No. ${q.question} - ${formatDuration(q.timeSeconds)}`, margin + 5, y);
      y += 5;
    });
  }
  y += 5;
  
  // Most visited
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('SOAL PALING SERING DIKUNJUNGI', margin, y);
  y += 7;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (stats?.mostVisited) {
    stats.mostVisited.forEach((q, idx) => {
      doc.text(`${idx + 1}. Soal No. ${q.question} - ${q.count} kali`, margin + 5, y);
      y += 5;
    });
  }
  y += 10;
  
  // Timeline detail section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DETAIL TIMELINE NAVIGASI', margin, y);
  y += 8;
  
  // Table header
  const colWidths = [10, 25, 25, 35, 15, 60];
  const headers = ['No', 'Mulai', 'Selesai', 'Durasi', 'Soal', 'Aksi'];
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 3, pageWidth - 2 * margin, 6, 'F');
  
  let x = margin;
  headers.forEach((header, idx) => {
    doc.text(header, x + 1, y);
    x += colWidths[idx];
  });
  y += 6;
  
  // Table rows
  doc.setFont('helvetica', 'normal');
  entries.forEach((entry, idx) => {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    
    x = margin;
    const row = [
      String(idx + 1),
      entry.startTime,
      entry.endTime,
      formatDuration(entry.durationSeconds),
      String(entry.questionNumber),
      entry.actionLabel,
    ];
    
    row.forEach((cell, cellIdx) => {
      const cellText = cell.length > 15 && cellIdx === 5 ? cell.substring(0, 15) + '...' : cell;
      doc.text(cellText, x + 1, y);
      x += colWidths[cellIdx];
    });
    y += 5;
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Halaman ${i} dari ${pageCount} - Generated by SKD CAT System`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  const timestamp = format(new Date(), 'yyyyMMdd-HHmm');
  const safeFileName = participantName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Timeline-${safeFileName}-${timestamp}.pdf`);
};
