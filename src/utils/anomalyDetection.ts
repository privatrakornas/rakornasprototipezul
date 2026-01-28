/**
 * Anomaly Detection for Exam Navigation Timeline
 * 
 * Detects suspicious patterns that may indicate cheating or unusual behavior:
 * - Too fast answering (< 5 seconds per question)
 * - Excessive jumping between non-sequential questions
 * - Unusually consistent timing patterns (bot-like behavior)
 * - Long pauses followed by rapid answers (potentially looking up answers)
 * - Answering in unusual order patterns
 */

export interface NavigationEvent {
  timestamp: string;
  remainingTimeSeconds: number;
  remainingTimeFormatted?: string;
  action: string;
  fromQuestion: number;
  toQuestion: number;
  // Legacy fields
  questionNumber?: number;
  previousQuestion?: number;
}

export interface AnomalyFlag {
  type: 'critical' | 'warning' | 'info';
  code: string;
  title: string;
  description: string;
  details?: string;
  affectedQuestions?: number[];
  count?: number;
}

export interface AnomalyAnalysis {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  flags: AnomalyFlag[];
  summary: string;
}

// Thresholds for anomaly detection
const THRESHOLDS = {
  // Time thresholds (in seconds)
  VERY_FAST_ANSWER: 3,      // Less than 3 seconds is suspicious
  FAST_ANSWER: 5,           // Less than 5 seconds is notable
  LONG_PAUSE: 120,          // More than 2 minutes on one question
  VERY_LONG_PAUSE: 300,     // More than 5 minutes is suspicious
  
  // Count thresholds
  MAX_NORMAL_JUMPS_PERCENT: 30,    // More than 30% jumps is suspicious
  EXCESSIVE_JUMPS_PERCENT: 50,      // More than 50% is highly suspicious
  MIN_QUESTIONS_FOR_ANALYSIS: 5,    // Need at least 5 events to analyze
  
  // Pattern thresholds
  CONSISTENT_TIMING_VARIANCE: 2,    // Less than 2 seconds variance is bot-like
  RAPID_SEQUENCE_COUNT: 5,          // 5+ very fast answers in a row
};

/**
 * Calculate time spent per question from navigation log
 */
function calculateTimePerQuestion(events: NavigationEvent[]): Map<number, number> {
  const timePerQuestion = new Map<number, number>();
  
  // Sort by remaining time (descending = chronological order)
  const sorted = [...events].sort((a, b) => b.remainingTimeSeconds - a.remainingTimeSeconds);
  
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    
    const toQ = current.toQuestion ?? current.questionNumber ?? 0;
    if (toQ <= 0) continue;
    
    const duration = next 
      ? current.remainingTimeSeconds - next.remainingTimeSeconds
      : current.remainingTimeSeconds;
    
    const existingTime = timePerQuestion.get(toQ) || 0;
    timePerQuestion.set(toQ, existingTime + Math.max(0, duration));
  }
  
  return timePerQuestion;
}

/**
 * Detect very fast answers (< threshold seconds)
 */
function detectFastAnswers(events: NavigationEvent[]): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];
  const timePerQuestion = calculateTimePerQuestion(events);
  
  const veryFastQuestions: number[] = [];
  const fastQuestions: number[] = [];
  
  timePerQuestion.forEach((time, question) => {
    if (time < THRESHOLDS.VERY_FAST_ANSWER && time > 0) {
      veryFastQuestions.push(question);
    } else if (time < THRESHOLDS.FAST_ANSWER && time > 0) {
      fastQuestions.push(question);
    }
  });
  
  if (veryFastQuestions.length >= 3) {
    flags.push({
      type: 'critical',
      code: 'VERY_FAST_ANSWERS',
      title: 'Jawaban Sangat Cepat',
      description: `${veryFastQuestions.length} soal dijawab dalam waktu kurang dari ${THRESHOLDS.VERY_FAST_ANSWER} detik`,
      details: `Soal: ${veryFastQuestions.sort((a, b) => a - b).join(', ')}`,
      affectedQuestions: veryFastQuestions,
      count: veryFastQuestions.length,
    });
  } else if (veryFastQuestions.length > 0) {
    flags.push({
      type: 'warning',
      code: 'FAST_ANSWERS',
      title: 'Jawaban Cepat',
      description: `${veryFastQuestions.length} soal dijawab dalam waktu sangat singkat`,
      affectedQuestions: veryFastQuestions,
      count: veryFastQuestions.length,
    });
  }
  
  if (fastQuestions.length >= 10) {
    flags.push({
      type: 'warning',
      code: 'MANY_FAST_ANSWERS',
      title: 'Banyak Jawaban Cepat',
      description: `${fastQuestions.length} soal dijawab kurang dari ${THRESHOLDS.FAST_ANSWER} detik`,
      affectedQuestions: fastQuestions,
      count: fastQuestions.length,
    });
  }
  
  return flags;
}

/**
 * Detect excessive jumping between questions
 */
function detectExcessiveJumping(events: NavigationEvent[]): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];
  
  const totalNavigations = events.filter(e => 
    e.action === 'next' || e.action === 'prev' || e.action === 'jump'
  ).length;
  
  if (totalNavigations < THRESHOLDS.MIN_QUESTIONS_FOR_ANALYSIS) return flags;
  
  const jumpCount = events.filter(e => e.action === 'jump').length;
  const jumpPercent = (jumpCount / totalNavigations) * 100;
  
  if (jumpPercent >= THRESHOLDS.EXCESSIVE_JUMPS_PERCENT) {
    flags.push({
      type: 'critical',
      code: 'EXCESSIVE_JUMPING',
      title: 'Lompatan Berlebihan',
      description: `${jumpPercent.toFixed(0)}% navigasi adalah lompatan (${jumpCount}/${totalNavigations})`,
      details: 'Pola navigasi tidak linear menunjukkan kemungkinan mencari jawaban atau koordinasi eksternal',
      count: jumpCount,
    });
  } else if (jumpPercent >= THRESHOLDS.MAX_NORMAL_JUMPS_PERCENT) {
    flags.push({
      type: 'warning',
      code: 'MANY_JUMPS',
      title: 'Banyak Lompatan',
      description: `${jumpPercent.toFixed(0)}% navigasi adalah lompatan`,
      count: jumpCount,
    });
  }
  
  return flags;
}

/**
 * Detect long pauses that might indicate looking up answers
 */
function detectLongPauses(events: NavigationEvent[]): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];
  const timePerQuestion = calculateTimePerQuestion(events);
  
  const veryLongPauses: { question: number; duration: number }[] = [];
  const longPauses: { question: number; duration: number }[] = [];
  
  timePerQuestion.forEach((time, question) => {
    if (time >= THRESHOLDS.VERY_LONG_PAUSE) {
      veryLongPauses.push({ question, duration: time });
    } else if (time >= THRESHOLDS.LONG_PAUSE) {
      longPauses.push({ question, duration: time });
    }
  });
  
  if (veryLongPauses.length > 0) {
    const details = veryLongPauses
      .sort((a, b) => b.duration - a.duration)
      .map(p => `Q${p.question}: ${Math.floor(p.duration / 60)}m ${p.duration % 60}s`)
      .join(', ');
    
    flags.push({
      type: 'warning',
      code: 'VERY_LONG_PAUSES',
      title: 'Jeda Sangat Lama',
      description: `${veryLongPauses.length} soal dengan waktu lebih dari 5 menit`,
      details,
      affectedQuestions: veryLongPauses.map(p => p.question),
      count: veryLongPauses.length,
    });
  }
  
  return flags;
}

/**
 * Detect rapid sequences (many fast answers in a row)
 */
function detectRapidSequences(events: NavigationEvent[]): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];
  
  // Sort chronologically
  const sorted = [...events].sort((a, b) => b.remainingTimeSeconds - a.remainingTimeSeconds);
  
  let rapidSequenceStart = -1;
  let rapidSequenceCount = 0;
  const rapidSequences: { start: number; end: number; count: number }[] = [];
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const duration = current.remainingTimeSeconds - next.remainingTimeSeconds;
    
    if (duration < THRESHOLDS.FAST_ANSWER && duration > 0) {
      if (rapidSequenceStart === -1) {
        rapidSequenceStart = current.toQuestion ?? current.questionNumber ?? 0;
        rapidSequenceCount = 1;
      }
      rapidSequenceCount++;
    } else {
      if (rapidSequenceCount >= THRESHOLDS.RAPID_SEQUENCE_COUNT) {
        rapidSequences.push({
          start: rapidSequenceStart,
          end: current.toQuestion ?? current.questionNumber ?? 0,
          count: rapidSequenceCount,
        });
      }
      rapidSequenceStart = -1;
      rapidSequenceCount = 0;
    }
  }
  
  // Check last sequence
  if (rapidSequenceCount >= THRESHOLDS.RAPID_SEQUENCE_COUNT) {
    const lastEvent = sorted[sorted.length - 1];
    rapidSequences.push({
      start: rapidSequenceStart,
      end: lastEvent.toQuestion ?? lastEvent.questionNumber ?? 0,
      count: rapidSequenceCount,
    });
  }
  
  if (rapidSequences.length > 0) {
    const totalRapid = rapidSequences.reduce((sum, s) => sum + s.count, 0);
    const details = rapidSequences
      .map(s => `Q${s.start}-Q${s.end} (${s.count} soal)`)
      .join(', ');
    
    flags.push({
      type: 'critical',
      code: 'RAPID_SEQUENCES',
      title: 'Urutan Jawaban Kilat',
      description: `${totalRapid} soal dijawab berturut-turut dalam waktu sangat singkat`,
      details: `Urutan: ${details}`,
      count: totalRapid,
    });
  }
  
  return flags;
}

/**
 * Detect bot-like consistent timing patterns
 */
function detectConsistentTiming(events: NavigationEvent[]): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];
  
  // Sort chronologically
  const sorted = [...events].sort((a, b) => b.remainingTimeSeconds - a.remainingTimeSeconds);
  
  if (sorted.length < 10) return flags;
  
  // Calculate intervals between events
  const intervals: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const interval = sorted[i].remainingTimeSeconds - sorted[i + 1].remainingTimeSeconds;
    if (interval > 0 && interval < 60) { // Only consider reasonable intervals
      intervals.push(interval);
    }
  }
  
  if (intervals.length < 5) return flags;
  
  // Calculate variance
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((sum, i) => sum + Math.pow(i - mean, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev < THRESHOLDS.CONSISTENT_TIMING_VARIANCE && mean < 10) {
    flags.push({
      type: 'critical',
      code: 'BOT_LIKE_TIMING',
      title: 'Pola Waktu Konsisten',
      description: `Interval jawaban sangat konsisten (rata-rata ${mean.toFixed(1)}s, deviasi ${stdDev.toFixed(2)}s)`,
      details: 'Pola ini tidak natural dan mungkin mengindikasikan penggunaan bot atau script',
    });
  }
  
  return flags;
}

/**
 * Detect pause-then-rapid pattern (looking up answers)
 */
function detectPauseThenRapid(events: NavigationEvent[]): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];
  
  // Sort chronologically
  const sorted = [...events].sort((a, b) => b.remainingTimeSeconds - a.remainingTimeSeconds);
  
  let suspiciousPatterns = 0;
  
  for (let i = 1; i < sorted.length - 1; i++) {
    const prevDuration = sorted[i - 1].remainingTimeSeconds - sorted[i].remainingTimeSeconds;
    const currDuration = sorted[i].remainingTimeSeconds - sorted[i + 1].remainingTimeSeconds;
    
    // Long pause followed by very fast answer
    if (prevDuration >= THRESHOLDS.LONG_PAUSE && currDuration < THRESHOLDS.VERY_FAST_ANSWER) {
      suspiciousPatterns++;
    }
  }
  
  if (suspiciousPatterns >= 3) {
    flags.push({
      type: 'warning',
      code: 'PAUSE_THEN_RAPID',
      title: 'Pola Jeda-Lalu-Cepat',
      description: `${suspiciousPatterns} kejadian jeda lama diikuti jawaban sangat cepat`,
      details: 'Pola ini mungkin mengindikasikan mencari jawaban saat jeda, lalu langsung menjawab',
      count: suspiciousPatterns,
    });
  }
  
  return flags;
}

/**
 * Calculate overall risk score based on flags
 */
function calculateRiskScore(flags: AnomalyFlag[]): number {
  let score = 0;
  
  flags.forEach(flag => {
    switch (flag.type) {
      case 'critical':
        score += 30;
        break;
      case 'warning':
        score += 15;
        break;
      case 'info':
        score += 5;
        break;
    }
  });
  
  return Math.min(100, score);
}

/**
 * Determine overall risk level
 */
function determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 70) return 'critical';
  if (score >= 45) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}

/**
 * Generate summary text
 */
function generateSummary(flags: AnomalyFlag[], riskLevel: string): string {
  if (flags.length === 0) {
    return 'Tidak ditemukan pola mencurigakan. Navigasi ujian terlihat normal.';
  }
  
  const criticalCount = flags.filter(f => f.type === 'critical').length;
  const warningCount = flags.filter(f => f.type === 'warning').length;
  
  if (riskLevel === 'critical') {
    return `Ditemukan ${criticalCount} anomali kritis dan ${warningCount} peringatan. Pola navigasi sangat mencurigakan dan memerlukan investigasi lebih lanjut.`;
  }
  
  if (riskLevel === 'high') {
    return `Ditemukan ${criticalCount + warningCount} anomali. Beberapa pola navigasi tidak wajar dan perlu diperhatikan.`;
  }
  
  if (riskLevel === 'medium') {
    return `Ditemukan ${flags.length} pola yang perlu diperhatikan, namun tidak selalu mengindikasikan kecurangan.`;
  }
  
  return `Ditemukan ${flags.length} catatan minor. Secara umum navigasi terlihat wajar.`;
}

/**
 * Main function to analyze navigation log for anomalies
 */
export function analyzeNavigationAnomalies(events: NavigationEvent[] | null): AnomalyAnalysis {
  if (!events || events.length < THRESHOLDS.MIN_QUESTIONS_FOR_ANALYSIS) {
    return {
      overallRisk: 'low',
      riskScore: 0,
      flags: [],
      summary: 'Data navigasi tidak cukup untuk analisis anomali.',
    };
  }
  
  // Run all detection functions
  const allFlags: AnomalyFlag[] = [
    ...detectFastAnswers(events),
    ...detectExcessiveJumping(events),
    ...detectLongPauses(events),
    ...detectRapidSequences(events),
    ...detectConsistentTiming(events),
    ...detectPauseThenRapid(events),
  ];
  
  // Sort flags by severity
  allFlags.sort((a, b) => {
    const typeOrder = { critical: 0, warning: 1, info: 2 };
    return typeOrder[a.type] - typeOrder[b.type];
  });
  
  const riskScore = calculateRiskScore(allFlags);
  const overallRisk = determineRiskLevel(riskScore);
  const summary = generateSummary(allFlags, overallRisk);
  
  return {
    overallRisk,
    riskScore,
    flags: allFlags,
    summary,
  };
}

export default analyzeNavigationAnomalies;
