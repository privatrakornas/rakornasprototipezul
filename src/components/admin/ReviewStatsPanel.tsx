import { memo, useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, MinusCircle, Target } from 'lucide-react';
import { questions } from '@/data/questions';

interface ReviewStatsPanelProps {
  answers: Record<number, string>;
}

interface CategoryStats {
  category: string;
  label: string;
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  score: number;
  maxScore: number;
  passingGrade: number;
}

const PASSING_GRADES = { TWK: 65, TIU: 80, TKP: 166 };

const ReviewStatsPanel = memo(({ answers }: ReviewStatsPanelProps) => {
  const stats = useMemo(() => {
    // Categorize questions
    const twkQuestions = questions.filter(q => q.category === 'TWK');
    const tiuQuestions = questions.filter(q => q.category === 'TIU');
    const tkpQuestions = questions.filter(q => q.category === 'TKP');
    
    const calculateStats = (
      questionList: typeof questions, 
      category: string, 
      label: string,
      passingGrade: number
    ): CategoryStats => {
      let correct = 0;
      let wrong = 0;
      let score = 0;
      let maxScore = 0;
      
      const isTKP = category === 'TKP';
      
      questionList.forEach(q => {
        const answer = answers[q.id];
        
        if (isTKP) {
          // TKP: Each question has 5 options with 1-5 points
          maxScore += 5;
          if (answer) {
            const selectedOption = q.options.find(opt => opt.key === answer);
            const points = selectedOption?.score || 0;
            score += points;
            if (points === 5) {
              correct++;
            } else {
              // Not perfect for TKP isn't necessarily "wrong", but less optimal
              wrong++;
            }
          }
        } else {
          // TWK/TIU: Binary scoring (5 or 0)
          maxScore += 5;
          if (answer) {
            if (q.correctAnswer === answer) {
              correct++;
              score += 5;
            } else {
              wrong++;
            }
          }
        }
      });
      
      const unanswered = questionList.length - (correct + wrong);
      
      return {
        category,
        label,
        total: questionList.length,
        correct,
        wrong,
        unanswered,
        score,
        maxScore,
        passingGrade,
      };
    };
    
    return [
      calculateStats(twkQuestions, 'TWK', 'Tes Wawasan Kebangsaan', PASSING_GRADES.TWK),
      calculateStats(tiuQuestions, 'TIU', 'Tes Intelegensi Umum', PASSING_GRADES.TIU),
      calculateStats(tkpQuestions, 'TKP', 'Tes Karakteristik Pribadi', PASSING_GRADES.TKP),
    ];
  }, [answers]);
  
  const totalStats = useMemo(() => {
    return {
      correct: stats.reduce((acc, s) => acc + s.correct, 0),
      wrong: stats.reduce((acc, s) => acc + s.wrong, 0),
      unanswered: stats.reduce((acc, s) => acc + s.unanswered, 0),
      score: stats.reduce((acc, s) => acc + s.score, 0),
      maxScore: stats.reduce((acc, s) => acc + s.maxScore, 0),
      isLulus: stats.every(s => s.score >= s.passingGrade),
    };
  }, [stats]);

  return (
    <div className="border-t pt-3 mt-3 space-y-3">
      {/* Summary row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="font-semibold">{totalStats.correct}</span>
            <span className="text-muted-foreground">Benar</span>
          </span>
          <span className="flex items-center gap-1 text-red-600">
            <XCircle className="w-3.5 h-3.5" />
            <span className="font-semibold">{totalStats.wrong}</span>
            <span className="text-muted-foreground">Salah</span>
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <MinusCircle className="w-3.5 h-3.5" />
            <span className="font-semibold">{totalStats.unanswered}</span>
            <span>Kosong</span>
          </span>
        </div>
        <div className={`flex items-center gap-1 font-bold px-2 py-0.5 rounded ${
          totalStats.isLulus 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' 
            : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
        }`}>
          <Target className="w-3.5 h-3.5" />
          {totalStats.isLulus ? 'LULUS' : 'TIDAK LULUS'}
        </div>
      </div>
      
      {/* Category breakdown with progress bars */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map((cat) => {
          const isPassing = cat.score >= cat.passingGrade;
          const progressPercent = cat.maxScore > 0 ? (cat.score / cat.maxScore) * 100 : 0;
          const passingPercent = cat.maxScore > 0 ? (cat.passingGrade / cat.maxScore) * 100 : 0;
          
          return (
            <div key={cat.category} className="bg-muted/50 rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-muted-foreground">{cat.category}</span>
                <span className={`text-xs font-bold ${isPassing ? 'text-primary' : 'text-destructive'}`}>
                  {cat.score}
                  <span className="text-muted-foreground font-normal">/{cat.maxScore}</span>
                </span>
              </div>
              
              {/* Progress bar with passing grade marker */}
              <div className="relative">
                <Progress 
                  value={progressPercent} 
                  className="h-2"
                  indicatorClassName={isPassing ? 'bg-primary' : 'bg-destructive'}
                />
                {/* Passing grade marker */}
                <div 
                  className="absolute top-0 h-2 w-0.5 bg-yellow-500"
                  style={{ left: `${passingPercent}%` }}
                  title={`Passing Grade: ${cat.passingGrade}`}
                />
              </div>
              
              <div className="flex items-center justify-between mt-1 text-[9px] text-muted-foreground">
                <span>PG: {cat.passingGrade}</span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-2.5 h-2.5 text-green-500" />{cat.correct}
                  <XCircle className="w-2.5 h-2.5 text-red-500 ml-1" />{cat.wrong}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

ReviewStatsPanel.displayName = 'ReviewStatsPanel';

export default ReviewStatsPanel;
