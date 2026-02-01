import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, FileSpreadsheet, FileText, ShieldAlert, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { type LeaderboardEntry, isLulus } from '@/hooks/useRealtimeLeaderboard';
import { analyzeNavigationAnomalies, type NavigationEvent, type AnomalyAnalysis, type AnomalyFlag } from '@/utils/anomalyDetection';

interface AnomalyExportPanelProps {
  data: LeaderboardEntry[];
}

const formatDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy HH:mm', { locale: localeId });
  } catch {
    return '-';
  }
};

const getRiskLabel = (risk: string): string => {
  switch (risk) {
    case 'critical': return 'KRITIS';
    case 'high': return 'TINGGI';
    case 'medium': return 'SEDANG';
    default: return 'RENDAH';
  }
};

const getFlagTypeLabel = (type: AnomalyFlag['type']): string => {
  switch (type) {
    case 'critical': return 'Kritis';
    case 'warning': return 'Peringatan';
    default: return 'Info';
  }
};

const AnomalyExportPanel = ({ data }: AnomalyExportPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Compute anomaly data for all entries with navigation logs
  const anomalyData = useMemo(() => {
    const results: Array<{
      entry: LeaderboardEntry;
      analysis: AnomalyAnalysis;
    }> = [];

    data.forEach(entry => {
      if (entry.status === 'finished' && entry.navigation_log && Array.isArray(entry.navigation_log) && entry.navigation_log.length > 0) {
        const analysis = analyzeNavigationAnomalies(entry.navigation_log as NavigationEvent[]);
        if (analysis.overallRisk === 'high' || analysis.overallRisk === 'critical') {
          results.push({ entry, analysis });
        }
      }
    });

    // Sort by risk score descending
    return results.sort((a, b) => b.analysis.riskScore - a.analysis.riskScore);
  }, [data]);

  const downloadCSV = () => {
    const headers = [
      'No',
      'Nama',
      'Skor Total',
      'Status Lulus',
      'Durasi (menit)',
      'Risiko',
      'Skor Risiko',
      'Temuan Anomali',
      'Tanggal Selesai'
    ];

    const rows = anomalyData.map((item, idx) => {
      const { entry, analysis } = item;
      const flagsText = analysis.flags
        .map(f => `[${getFlagTypeLabel(f.type)}] ${f.title}: ${f.description}`)
        .join(' | ');

      return [
        idx + 1,
        entry.name,
        entry.total_score,
        isLulus(entry) ? 'LULUS' : 'TIDAK LULUS',
        entry.duration_minutes ?? '-',
        getRiskLabel(analysis.overallRisk),
        analysis.riskScore,
        flagsText,
        formatDateTime(entry.created_at)
      ];
    });

    const escapeCSV = (value: string | number | null | undefined): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(v => escapeCSV(v)).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `anomali-peserta-berisiko-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  const downloadExcel = () => {
    // Summary sheet
    const summaryData = [
      ['LAPORAN PESERTA BERISIKO TINGGI/KRITIS'],
      ['Tanggal Export', format(new Date(), 'dd MMMM yyyy HH:mm', { locale: localeId })],
      ['Total Peserta Berisiko', anomalyData.length],
      ['Kritis', anomalyData.filter(d => d.analysis.overallRisk === 'critical').length],
      ['Tinggi', anomalyData.filter(d => d.analysis.overallRisk === 'high').length],
      [],
      ['DAFTAR PESERTA']
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

    // Main data sheet
    const headers = ['No', 'Nama', 'Skor', 'Status', 'Durasi', 'Risiko', 'Skor Risiko', 'Tanggal'];
    const rows = anomalyData.map((item, idx) => {
      const { entry, analysis } = item;
      return [
        idx + 1,
        entry.name,
        entry.total_score,
        isLulus(entry) ? 'LULUS' : 'TL',
        entry.duration_minutes ?? '-',
        getRiskLabel(analysis.overallRisk),
        analysis.riskScore,
        formatDateTime(entry.created_at)
      ];
    });

    const dataSheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    dataSheet['!cols'] = [
      { wch: 5 },
      { wch: 25 },
      { wch: 8 },
      { wch: 10 },
      { wch: 8 },
      { wch: 10 },
      { wch: 10 },
      { wch: 20 }
    ];

    // Flags detail sheet
    const flagsHeaders = ['Nama', 'Level', 'Judul', 'Deskripsi', 'Detail'];
    const flagsRows: (string | number)[][] = [];
    anomalyData.forEach(item => {
      item.analysis.flags.forEach(flag => {
        flagsRows.push([
          item.entry.name,
          getFlagTypeLabel(flag.type),
          flag.title,
          flag.description,
          flag.details || '-'
        ]);
      });
    });

    const flagsSheet = XLSX.utils.aoa_to_sheet([flagsHeaders, ...flagsRows]);
    flagsSheet['!cols'] = [
      { wch: 25 },
      { wch: 10 },
      { wch: 25 },
      { wch: 40 },
      { wch: 30 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');
    XLSX.utils.book_append_sheet(workbook, dataSheet, 'Daftar Peserta');
    XLSX.utils.book_append_sheet(workbook, flagsSheet, 'Detail Temuan');

    XLSX.writeFile(workbook, `anomali-peserta-berisiko-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`);
    setIsOpen(false);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN PESERTA BERISIKO', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tanggal: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: localeId })}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    // Summary
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RINGKASAN', 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const criticalCount = anomalyData.filter(d => d.analysis.overallRisk === 'critical').length;
    const highCount = anomalyData.filter(d => d.analysis.overallRisk === 'high').length;

    doc.text(`Total Peserta Berisiko: ${anomalyData.length}`, 14, yPos);
    yPos += 6;
    doc.text(`Risiko Kritis: ${criticalCount}`, 14, yPos);
    yPos += 6;
    doc.text(`Risiko Tinggi: ${highCount}`, 14, yPos);
    yPos += 12;

    // Table header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DAFTAR PESERTA', 14, yPos);
    yPos += 8;

    // Table
    doc.setFontSize(9);
    const colWidths = [8, 50, 15, 20, 25, 15];
    const headers = ['No', 'Nama', 'Skor', 'Risiko', 'Temuan', 'Tanggal'];

    // Header row
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(220, 220, 220);
    doc.rect(14, yPos - 4, colWidths.reduce((a, b) => a + b, 0), 7, 'F');
    let xPos = 14;
    headers.forEach((header, i) => {
      doc.text(header, xPos + 1, yPos);
      xPos += colWidths[i];
    });
    yPos += 8;

    // Data rows
    doc.setFont('helvetica', 'normal');
    anomalyData.forEach((item, idx) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      const { entry, analysis } = item;
      const row = [
        String(idx + 1),
        entry.name.length > 20 ? entry.name.substring(0, 18) + '...' : entry.name,
        String(entry.total_score),
        getRiskLabel(analysis.overallRisk),
        `${analysis.flags.length} item`,
        format(new Date(entry.created_at || ''), 'dd/MM/yy')
      ];

      // Alternate row colors
      if (idx % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(14, yPos - 4, colWidths.reduce((a, b) => a + b, 0), 6, 'F');
      }

      // Highlight critical
      if (analysis.overallRisk === 'critical') {
        doc.setTextColor(180, 0, 0);
      } else if (analysis.overallRisk === 'high') {
        doc.setTextColor(200, 100, 0);
      } else {
        doc.setTextColor(0, 0, 0);
      }

      xPos = 14;
      row.forEach((cell, i) => {
        doc.text(cell, xPos + 1, yPos);
        xPos += colWidths[i];
      });
      doc.setTextColor(0, 0, 0);
      yPos += 7;
    });

    // Flags detail page
    doc.addPage();
    yPos = 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DETAIL TEMUAN ANOMALI', pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    anomalyData.forEach((item, idx) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      const { entry, analysis } = item;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}. ${entry.name}`, 14, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Skor Risiko: ${analysis.riskScore}/100 (${getRiskLabel(analysis.overallRisk)})`, 14, yPos);
      yPos += 5;

      analysis.flags.forEach(flag => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        if (flag.type === 'critical') {
          doc.setTextColor(180, 0, 0);
        } else if (flag.type === 'warning') {
          doc.setTextColor(200, 100, 0);
        } else {
          doc.setTextColor(100, 100, 0);
        }
        doc.text(`• [${getFlagTypeLabel(flag.type)}] ${flag.title}`, 18, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 4;

        const descLines = doc.splitTextToSize(flag.description, pageWidth - 40);
        descLines.forEach((line: string) => {
          doc.text(line, 22, yPos);
          yPos += 4;
        });
        yPos += 2;
      });

      yPos += 5;
    });

    doc.save(`anomali-peserta-berisiko-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
    setIsOpen(false);
  };

  if (anomalyData.length === 0) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="destructive" 
          size="sm" 
          className="h-7 gap-1.5 text-xs"
        >
          <ShieldAlert className="w-3 h-3" />
          Export Risiko ({anomalyData.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-destructive" />
            <h4 className="font-semibold text-sm">Export Peserta Berisiko</h4>
          </div>

          {/* Summary */}
          <div className="text-xs bg-muted/50 rounded p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-destructive" />
                Risiko Kritis
              </span>
              <span className="font-bold text-destructive">
                {anomalyData.filter(d => d.analysis.overallRisk === 'critical').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-orange-500" />
                Risiko Tinggi
              </span>
              <span className="font-bold text-orange-600">
                {anomalyData.filter(d => d.analysis.overallRisk === 'high').length}
              </span>
            </div>
            <div className="border-t pt-1 mt-1 flex items-center justify-between">
              <span>Total</span>
              <span className="font-bold">{anomalyData.length} peserta</span>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground">
            Export mencakup skor risiko dan detail temuan anomali untuk setiap peserta.
          </p>

          {/* Export buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={downloadCSV}
            >
              <FileText className="w-3 h-3" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={downloadExcel}
            >
              <FileSpreadsheet className="w-3 h-3" />
              Excel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={downloadPDF}
            >
              <Download className="w-3 h-3" />
              PDF
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AnomalyExportPanel;
