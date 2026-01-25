import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
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
  LineChart,
  Line,
} from 'recharts';
import { 
  TrendingUp, 
  Award, 
  Target, 
  Users, 
  CheckCircle, 
  XCircle,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

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

interface AdminDashboardProps {
  scoreStats: ScoreStats;
  passingStats: PassingStats;
  dailyTrends: DailyTrendData[];
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
  isLoading 
}: AdminDashboardProps) => {
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
    </div>
  );
};
