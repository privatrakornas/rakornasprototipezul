import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, PieChartIcon, TrendingUp } from 'lucide-react';

interface NavigationEvent {
  timestamp: string;
  remainingTimeSeconds: number;
  questionNumber: number;
  action: string;
  previousQuestion?: number;
}

interface TimelineChartProps {
  navigationLog: NavigationEvent[];
}

const COLORS = {
  twk: 'hsl(var(--chart-1))',
  tiu: 'hsl(var(--chart-2))',
  tkp: 'hsl(var(--chart-3))',
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  muted: 'hsl(var(--muted))',
};

const getCategoryFromQuestion = (qNum: number): string => {
  if (qNum >= 1 && qNum <= 30) return 'TWK';
  if (qNum >= 31 && qNum <= 65) return 'TIU';
  return 'TKP';
};

const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'TWK':
      return COLORS.twk;
    case 'TIU':
      return COLORS.tiu;
    case 'TKP':
      return COLORS.tkp;
    default:
      return COLORS.primary;
  }
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

export const TimelineChart = ({ navigationLog }: TimelineChartProps) => {
  // Calculate time spent per question
  const timePerQuestion = useMemo(() => {
    if (!navigationLog || navigationLog.length === 0) return [];
    
    const timeMap: Record<number, number> = {};
    const sortedLog = [...navigationLog].sort(
      (a, b) => b.remainingTimeSeconds - a.remainingTimeSeconds
    );
    
    for (let i = 0; i < sortedLog.length; i++) {
      const current = sortedLog[i];
      const next = sortedLog[i + 1];
      const duration = next 
        ? current.remainingTimeSeconds - next.remainingTimeSeconds
        : current.remainingTimeSeconds;
      
      timeMap[current.questionNumber] = 
        (timeMap[current.questionNumber] || 0) + Math.max(0, duration);
    }
    
    return Object.entries(timeMap)
      .map(([q, time]) => ({
        question: parseInt(q),
        timeSeconds: time,
        category: getCategoryFromQuestion(parseInt(q)),
      }))
      .sort((a, b) => a.question - b.question);
  }, [navigationLog]);
  
  // Top 15 longest questions for bar chart
  const topLongestQuestions = useMemo(() => {
    return [...timePerQuestion]
      .sort((a, b) => b.timeSeconds - a.timeSeconds)
      .slice(0, 15);
  }, [timePerQuestion]);
  
  // Time spent per category
  const categoryTime = useMemo(() => {
    const categories: Record<string, number> = { TWK: 0, TIU: 0, TKP: 0 };
    timePerQuestion.forEach(q => {
      categories[q.category] += q.timeSeconds;
    });
    
    return Object.entries(categories).map(([name, value]) => ({
      name,
      value,
      label: formatDuration(value),
    }));
  }, [timePerQuestion]);
  
  // Navigation pattern over time (binned by 10-minute intervals)
  const navigationPattern = useMemo(() => {
    if (!navigationLog || navigationLog.length === 0) return [];
    
    const bins: Record<number, { next: number; prev: number; jump: number }> = {};
    
    // Create bins for each 10-minute interval (0-10, 10-20, ..., 90-100)
    for (let i = 0; i <= 90; i += 10) {
      bins[i] = { next: 0, prev: 0, jump: 0 };
    }
    
    navigationLog.forEach(event => {
      const minutesPassed = Math.floor((6000 - event.remainingTimeSeconds) / 60);
      const binKey = Math.floor(minutesPassed / 10) * 10;
      
      if (bins[binKey]) {
        if (event.action === 'next') bins[binKey].next++;
        else if (event.action === 'prev') bins[binKey].prev++;
        else if (event.action === 'jump') bins[binKey].jump++;
      }
    });
    
    return Object.entries(bins).map(([minute, counts]) => ({
      minute: `${minute}-${parseInt(minute) + 10}`,
      ...counts,
    }));
  }, [navigationLog]);
  
  // Visit count per question
  const visitCount = useMemo(() => {
    if (!navigationLog || navigationLog.length === 0) return [];
    
    const visits: Record<number, number> = {};
    navigationLog.forEach(e => {
      visits[e.questionNumber] = (visits[e.questionNumber] || 0) + 1;
    });
    
    return Object.entries(visits)
      .map(([q, count]) => ({
        question: parseInt(q),
        count,
        category: getCategoryFromQuestion(parseInt(q)),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [navigationLog]);

  if (!navigationLog || navigationLog.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Tidak ada data untuk divisualisasikan.
      </div>
    );
  }

  return (
    <Tabs defaultValue="duration" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="duration" className="flex items-center gap-1 text-xs">
          <BarChart3 className="w-3 h-3" />
          Durasi
        </TabsTrigger>
        <TabsTrigger value="category" className="flex items-center gap-1 text-xs">
          <PieChartIcon className="w-3 h-3" />
          Kategori
        </TabsTrigger>
        <TabsTrigger value="pattern" className="flex items-center gap-1 text-xs">
          <TrendingUp className="w-3 h-3" />
          Pola
        </TabsTrigger>
      </TabsList>
      
      {/* Duration per Question */}
      <TabsContent value="duration" className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Top 15 Soal Terlama Dikerjakan
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topLongestQuestions} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  tickFormatter={(v) => formatDuration(v)}
                  fontSize={10}
                />
                <YAxis 
                  type="category" 
                  dataKey="question" 
                  width={40}
                  tickFormatter={(v) => `#${v}`}
                  fontSize={10}
                />
                <Tooltip 
                  formatter={(value: number) => [formatDuration(value), 'Durasi']}
                  labelFormatter={(label) => `Soal No. ${label}`}
                />
                <Bar dataKey="timeSeconds" radius={[0, 4, 4, 0]}>
                  {topLongestQuestions.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getCategoryColor(entry.category)} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Soal Paling Sering Dikunjungi
            </CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visitCount}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="question" 
                  tickFormatter={(v) => `#${v}`}
                  fontSize={10}
                />
                <YAxis fontSize={10} />
                <Tooltip 
                  formatter={(value: number) => [`${value} kali`, 'Kunjungan']}
                  labelFormatter={(label) => `Soal No. ${label}`}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {visitCount.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getCategoryColor(entry.category)} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>
      
      {/* Category Distribution */}
      <TabsContent value="category">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Distribusi Waktu per Kategori
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryTime}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, label }) => `${name}: ${label}`}
                  labelLine={false}
                >
                  {categoryTime.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getCategoryColor(entry.name)} 
                    />
                  ))}
                </Pie>
                <Legend />
                <Tooltip 
                  formatter={(value: number) => [formatDuration(value), 'Waktu']}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>
      
      {/* Navigation Pattern */}
      <TabsContent value="pattern">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Pola Navigasi per 10 Menit
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={navigationPattern}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="minute" 
                  fontSize={10}
                  label={{ value: 'Menit ke-', position: 'bottom', offset: -5, fontSize: 10 }}
                />
                <YAxis fontSize={10} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="next" 
                  name="Next" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="prev" 
                  name="Previous" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="jump" 
                  name="Jump" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default TimelineChart;
