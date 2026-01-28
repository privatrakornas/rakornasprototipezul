import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Shield,
  ShieldAlert,
  ShieldX,
  CheckCircle2,
  Zap,
  ArrowLeftRight,
  Clock,
  Bot,
  Search,
} from 'lucide-react';
import { analyzeNavigationAnomalies, type AnomalyFlag, type NavigationEvent } from '@/utils/anomalyDetection';

interface AnomalyAnalysisPanelProps {
  navigationLog: NavigationEvent[] | null;
}

const getRiskIcon = (risk: string) => {
  switch (risk) {
    case 'critical':
      return <ShieldX className="w-5 h-5 text-destructive" />;
    case 'high':
      return <ShieldAlert className="w-5 h-5 text-orange-500" />;
    case 'medium':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    default:
      return <Shield className="w-5 h-5 text-green-500" />;
  }
};

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'critical':
      return 'bg-destructive';
    case 'high':
      return 'bg-orange-500';
    case 'medium':
      return 'bg-yellow-500';
    default:
      return 'bg-green-500';
  }
};

const getRiskLabel = (risk: string) => {
  switch (risk) {
    case 'critical':
      return 'Kritis';
    case 'high':
      return 'Tinggi';
    case 'medium':
      return 'Sedang';
    default:
      return 'Rendah';
  }
};

const getFlagIcon = (code: string) => {
  switch (code) {
    case 'VERY_FAST_ANSWERS':
    case 'FAST_ANSWERS':
    case 'MANY_FAST_ANSWERS':
    case 'RAPID_SEQUENCES':
      return <Zap className="w-4 h-4" />;
    case 'EXCESSIVE_JUMPING':
    case 'MANY_JUMPS':
      return <ArrowLeftRight className="w-4 h-4" />;
    case 'VERY_LONG_PAUSES':
    case 'PAUSE_THEN_RAPID':
      return <Clock className="w-4 h-4" />;
    case 'BOT_LIKE_TIMING':
      return <Bot className="w-4 h-4" />;
    default:
      return <Search className="w-4 h-4" />;
  }
};

const getFlagTypeStyles = (type: 'critical' | 'warning' | 'info') => {
  switch (type) {
    case 'critical':
      return {
        bg: 'bg-destructive/10 border-destructive/30',
        icon: <AlertCircle className="w-4 h-4 text-destructive" />,
        badge: 'destructive' as const,
      };
    case 'warning':
      return {
        bg: 'bg-orange-500/10 border-orange-500/30',
        icon: <AlertTriangle className="w-4 h-4 text-orange-500" />,
        badge: 'outline' as const,
      };
    default:
      return {
        bg: 'bg-muted border-muted-foreground/20',
        icon: <Info className="w-4 h-4 text-muted-foreground" />,
        badge: 'secondary' as const,
      };
  }
};

export const AnomalyAnalysisPanel = ({ navigationLog }: AnomalyAnalysisPanelProps) => {
  const analysis = useMemo(() => {
    return analyzeNavigationAnomalies(navigationLog);
  }, [navigationLog]);

  if (!navigationLog || navigationLog.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Data tidak cukup untuk analisis anomali</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Risk Score Header */}
      <div className="p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getRiskIcon(analysis.overallRisk)}
            <span className="font-semibold">Skor Risiko</span>
          </div>
          <Badge 
            variant={analysis.overallRisk === 'low' ? 'secondary' : 'destructive'}
            className="text-xs"
          >
            {getRiskLabel(analysis.overallRisk)}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Level Risiko</span>
            <span className="font-medium">{analysis.riskScore}/100</span>
          </div>
          <Progress 
            value={analysis.riskScore} 
            className={`h-2 ${getRiskColor(analysis.overallRisk)}`}
          />
        </div>
        
        <p className="mt-3 text-sm text-muted-foreground">
          {analysis.summary}
        </p>
      </div>

      {/* Flags List */}
      {analysis.flags.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Temuan ({analysis.flags.length})
          </h4>
          
          {analysis.flags.map((flag, idx) => {
            const styles = getFlagTypeStyles(flag.type);
            
            return (
              <div 
                key={idx}
                className={`p-3 rounded-lg border ${styles.bg}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getFlagIcon(flag.code)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{flag.title}</span>
                      <Badge variant={styles.badge} className="text-xs">
                        {flag.type === 'critical' ? 'Kritis' : 
                         flag.type === 'warning' ? 'Peringatan' : 'Info'}
                      </Badge>
                      {flag.count && (
                        <Badge variant="outline" className="text-xs">
                          {flag.count}x
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {flag.description}
                    </p>
                    {flag.details && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {flag.details}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Alert className="border-green-500/30 bg-green-500/10">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <AlertTitle>Tidak Ada Anomali</AlertTitle>
          <AlertDescription>
            Pola navigasi ujian peserta ini terlihat normal dan wajar.
          </AlertDescription>
        </Alert>
      )}

      {/* Legend */}
      <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        <p className="font-medium mb-2">Keterangan Level:</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span>Kritis: Sangat mencurigakan</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Tinggi: Perlu investigasi</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Sedang: Perlu perhatian</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Rendah: Normal</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnomalyAnalysisPanel;
