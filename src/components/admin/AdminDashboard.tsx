import { useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  CheckCircle, 
  XCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  Loader2,
  FileText,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface DailyTrendData {
  date: string;
  total: number;
  lulus: number;
  tidakLulus: number;
}

interface ScoreStats {
  avgTwk: number;
  avgTiu: number;
  avgTkp: number;
  avgTotal: number;
  minTotal: number;
  maxTotal: number;
}

interface PassingStats {
  totalFinished: number;
  totalLulus: number;
  totalTidakLulus: number;
  passRate: number;
}

interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

interface CategoryDistribution {
  twk: ScoreDistribution[];
  tiu: ScoreDistribution[];
  tkp: ScoreDistribution[];
  total: ScoreDistribution[];
}

interface AdminDashboardProps {
  scoreStats: ScoreStats;
  passingStats: PassingStats;
  dailyTrends: DailyTrendData[];
  scoreDistribution: CategoryDistribution;
  isLoading: boolean;
}

const CHART_COLORS = {
  lulus: '#22c55e',
  tidakLulus: '#ef4444',
  total: '#3b82f6',
  twk: '#8b5cf6',
  tiu: '#f59e0b',
  tkp: '#06b6d4',
};

export const AdminDashboard = ({ 
  scoreStats, 
  passingStats, 
  dailyTrends,
  scoreDistribution,
  isLoading 
}: AdminDashboardProps) => {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedDistribution, setSelectedDistribution] = useState<'total' | 'twk' | 'tiu' | 'tkp'>('total');

  // Format daily trends for chart
  const formattedTrends = useMemo(() => {
    return dailyTrends.map(d => ({
      ...d,
      dateFormatted: format(parseISO(d.date), 'd MMM', { locale: localeId }),
    }));
  }, [dailyTrends]);

  // Pie chart data for passing rate
  const pieData = useMemo(() => [
    { name: 'Lulus', value: passingStats.totalLulus, color: CHART_COLORS.lulus },
    { name: 'Tidak Lulus', value: passingStats.totalTidakLulus, color: CHART_COLORS.tidakLulus },
  ], [passingStats]);

  // Bar chart data for average scores
  const scoreData = useMemo(() => [
    { 
      name: 'TWK', 
      skor: scoreStats.avgTwk, 
      passing: 65,
      fill: CHART_COLORS.twk,
    },
    { 
      name: 'TIU', 
      skor: scoreStats.avgTiu, 
      passing: 80,
      fill: CHART_COLORS.tiu,
    },
    { 
      name: 'TKP', 
      skor: scoreStats.avgTkp, 
      passing: 166,
      fill: CHART_COLORS.tkp,
    },
  ], [scoreStats]);

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;

    setIsExporting(true);
    toast.info('Mempersiapkan PDF...');

    try {
      const element = dashboardRef.current;
      
      // Create canvas from the dashboard
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Calculate PDF dimensions (A4 landscape for better fit)
      const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Add header
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Laporan Dashboard Statistik Ujian', pdfWidth / 2, 15, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Digenerate: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: localeId })}`, pdfWidth / 2, 22, { align: 'center' });

      // Calculate image dimensions to fit page
      const marginTop = 30;
      const marginX = 10;
      const availableWidth = pdfWidth - (marginX * 2);
      const availableHeight = pdfHeight - marginTop - 10;

      const ratio = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;

      const xOffset = (pdfWidth - scaledWidth) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, marginTop, scaledWidth, scaledHeight);

      // Add footer
      pdf.setFontSize(8);
      pdf.setTextColor(128);
      pdf.text('Laporan ini digenerate otomatis dari sistem Admin Panel', pdfWidth / 2, pdfHeight - 5, { align: 'center' });

      // Download PDF
      const timestamp = format(new Date(), 'yyyyMMdd-HHmm');
      pdf.save(`laporan-statistik-${timestamp}.pdf`);

      toast.success('PDF berhasil diexport');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Gagal mengexport PDF');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <Skeleton className="h-[250px] w-full" />
          </Card>
          <Card className="p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <Skeleton className="h-[250px] w-full" />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleExportPDF}
          disabled={isExporting || passingStats.totalFinished === 0}
          className="gap-2"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          Export PDF
        </Button>
      </div>

      {/* Dashboard Content - wrapped in ref for PDF export */}
      <div ref={dashboardRef} className="space-y-6 bg-white p-4 rounded-lg">
        {/* Report Title for PDF */}
        <div className="text-center pb-2 border-b print:block hidden">
          <h1 className="text-xl font-bold">Laporan Statistik Ujian</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), 'dd MMMM yyyy', { locale: localeId })}
          </p>
        </div>

        {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-200">
              <Users className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <p className="text-sm text-blue-600">Total Selesai</p>
              <p className="text-2xl font-bold text-blue-800">{passingStats.totalFinished}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-200">
              <CheckCircle className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-green-600">Lulus</p>
              <p className="text-2xl font-bold text-green-800">{passingStats.totalLulus}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-200">
              <XCircle className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <p className="text-sm text-red-600">Tidak Lulus</p>
              <p className="text-2xl font-bold text-red-800">{passingStats.totalTidakLulus}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-purple-200">
              <TrendingUp className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <p className="text-sm text-purple-600">Tingkat Kelulusan</p>
              <p className="text-2xl font-bold text-purple-800">{passingStats.passRate}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Score Stats Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Rata-rata TWK</p>
          <p className="text-xl font-bold text-purple-600">{scoreStats.avgTwk}</p>
          <p className="text-xs text-muted-foreground">/ 65</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Rata-rata TIU</p>
          <p className="text-xl font-bold text-amber-600">{scoreStats.avgTiu}</p>
          <p className="text-xs text-muted-foreground">/ 80</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Rata-rata TKP</p>
          <p className="text-xl font-bold text-cyan-600">{scoreStats.avgTkp}</p>
          <p className="text-xs text-muted-foreground">/ 166</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Rata-rata Total</p>
          <p className="text-xl font-bold text-blue-600">{scoreStats.avgTotal}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Skor Tertinggi</p>
          <p className="text-xl font-bold text-green-600">{scoreStats.maxTotal}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Skor Terendah</p>
          <p className="text-xl font-bold text-red-600">{scoreStats.minTotal}</p>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Passing Rate Pie Chart */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Distribusi Kelulusan</h3>
          </div>
          {passingStats.totalFinished === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              Belum ada data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value} peserta`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Average Score Bar Chart */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Rata-rata Skor per Kategori</h3>
          </div>
          {passingStats.totalFinished === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              Belum ada data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={scoreData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={40} />
                <Tooltip 
                  formatter={(value: number, name: string) => [value, name === 'skor' ? 'Rata-rata' : 'Passing Grade']}
                />
                <Bar dataKey="skor" radius={[0, 4, 4, 0]}>
                  {scoreData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
                <Bar dataKey="passing" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Daily Trends Chart */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Tren Harian (14 Hari Terakhir)</h3>
        </div>
        {formattedTrends.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Belum ada data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateFormatted" />
              <YAxis />
              <Tooltip 
                labelFormatter={(label) => `Tanggal: ${label}`}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    lulus: 'Lulus',
                    tidakLulus: 'Tidak Lulus',
                    total: 'Total',
                  };
                  return [value, labels[name] || name];
                }}
              />
              <Legend 
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    lulus: 'Lulus',
                    tidakLulus: 'Tidak Lulus',
                  };
                  return labels[value] || value;
                }}
              />
              <Bar dataKey="lulus" stackId="a" fill={CHART_COLORS.lulus} radius={[0, 0, 0, 0]} />
              <Bar dataKey="tidakLulus" stackId="a" fill={CHART_COLORS.tidakLulus} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Score Distribution Histogram */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Distribusi Skor (Histogram)</h3>
          </div>
          <div className="flex gap-1">
            {(['total', 'twk', 'tiu', 'tkp'] as const).map((key) => (
              <Button
                key={key}
                variant={selectedDistribution === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDistribution(key)}
                className="text-xs"
              >
                {key.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
        {passingStats.totalFinished === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Belum ada data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreDistribution[selectedDistribution]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" unit="%" />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'count') return [`${value} peserta`, 'Jumlah'];
                  if (name === 'percentage') return [`${value}%`, 'Persentase'];
                  return [value, name];
                }}
              />
              <Legend 
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    count: 'Jumlah Peserta',
                    percentage: 'Persentase',
                  };
                  return labels[value] || value;
                }}
              />
              <Bar 
                yAxisId="left" 
                dataKey="count" 
                fill={
                  selectedDistribution === 'twk' ? CHART_COLORS.twk :
                  selectedDistribution === 'tiu' ? CHART_COLORS.tiu :
                  selectedDistribution === 'tkp' ? CHART_COLORS.tkp :
                  CHART_COLORS.total
                } 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div className="mt-4 text-sm text-muted-foreground text-center">
          {selectedDistribution === 'total' && 'Distribusi skor total (TWK + TIU + TKP)'}
          {selectedDistribution === 'twk' && 'Distribusi skor TWK (Passing Grade: 65)'}
          {selectedDistribution === 'tiu' && 'Distribusi skor TIU (Passing Grade: 80)'}
          {selectedDistribution === 'tkp' && 'Distribusi skor TKP (Passing Grade: 166)'}
        </div>
      </Card>
      </div>
    </div>
  );
};
