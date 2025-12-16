import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { questions, calculateTWKScore, calculateTIUScore, calculateTKPScore, getPassingStatus } from '@/data/questions';
import { Trophy, BookOpen, CheckCircle, XCircle } from 'lucide-react';
import MaterialAnalysis from '@/components/MaterialAnalysis';

const Results = () => {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const userName = localStorage.getItem('userName') || 'Peserta';

  useEffect(() => {
    const saved = localStorage.getItem('examAnswers');
    if (saved) {
      setAnswers(JSON.parse(saved));
    }
  }, []);

  const twkScore = calculateTWKScore(answers);
  const tiuScore = calculateTIUScore(answers);
  const tkpScore = calculateTKPScore(answers);
  const totalScore = twkScore + tiuScore + tkpScore;
  const status = getPassingStatus(twkScore, tiuScore, tkpScore);

  const saveToLeaderboard = () => {
    const leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
    leaderboard.push({ name: userName, twk: twkScore, tiu: tiuScore, tkp: tkpScore, total: totalScore, date: new Date().toISOString() });
    localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
    navigate('/leaderboard');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="metallic-maroon py-3 md:py-4">
        <div className="container mx-auto text-center px-4">
          <h1 className="text-lg md:text-2xl font-bold text-white">HASIL UJIAN</h1>
        </div>
      </header>

      <main className="container mx-auto py-4 md:py-8 px-3 md:px-4">
        <Card className="max-w-2xl mx-auto p-4 md:p-8">
          <div className="text-center mb-6 md:mb-8">
            <Trophy className={`w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 ${status.passed ? 'text-success' : 'text-muted-foreground'}`} />
            <h2 className="text-xl md:text-2xl font-bold">{userName}</h2>
            <p className={`mt-2 font-semibold text-sm md:text-base ${status.passed ? 'text-success' : 'text-destructive'}`}>
              {status.message}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6 md:mb-8">
            <div className="text-center p-3 md:p-4 bg-secondary rounded-lg">
              <p className="text-xs md:text-sm text-muted-foreground">TWK</p>
              <p className="text-xl md:text-2xl font-bold">{twkScore}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">PG: 65</p>
            </div>
            <div className="text-center p-3 md:p-4 bg-secondary rounded-lg">
              <p className="text-xs md:text-sm text-muted-foreground">TIU</p>
              <p className="text-xl md:text-2xl font-bold">{tiuScore}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">PG: 80</p>
            </div>
            <div className="text-center p-3 md:p-4 bg-secondary rounded-lg">
              <p className="text-xs md:text-sm text-muted-foreground">TKP</p>
              <p className="text-xl md:text-2xl font-bold">{tkpScore}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">PG: 166</p>
            </div>
            <div className="text-center p-3 md:p-4 bg-primary text-primary-foreground rounded-lg">
              <p className="text-xs md:text-sm opacity-80">Total</p>
              <p className="text-xl md:text-2xl font-bold">{totalScore}</p>
            </div>
          </div>

          {/* Material Analysis Section */}
          <div className="mb-6 md:mb-8">
            <MaterialAnalysis answers={answers} />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 md:gap-4 justify-center">
            <Button onClick={saveToLeaderboard} className="w-full sm:w-auto text-sm">
              <Trophy className="w-4 h-4 mr-2" /> Lihat Leaderboard
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full sm:w-auto text-sm">
              Kembali
            </Button>
          </div>
        </Card>

        {/* Answer Key Section */}
        <Card className="max-w-4xl mx-auto mt-6 md:mt-8 p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 md:w-5 md:h-5" /> Kunci Jawaban & Pembahasan
          </h3>
          <div className="space-y-3 md:space-y-4 max-h-[500px] md:max-h-[600px] overflow-y-auto">
            {questions.map((q) => {
              const userAnswer = answers[q.id];
              const userOptionScore = q.options.find(o => o.key === userAnswer)?.score;
              const isCorrect = q.category === 'TKP' 
                ? userOptionScore === 5
                : userAnswer === q.correctAnswer;
              
              return (
                <div key={q.id} className="p-3 md:p-4 border rounded-lg">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-sm md:text-base">Soal {q.id}</span>
                    {isCorrect ? (
                      <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-success flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 md:w-5 md:h-5 text-destructive flex-shrink-0" />
                    )}
                  </div>
                  <div className="px-2 py-1 md:py-1.5 bg-accent/10 text-accent rounded text-[10px] md:text-xs font-medium leading-relaxed mb-2">
                    {q.category} - {q.code}
                  </div>
                  <p className="text-xs md:text-sm mb-2">{q.text.substring(0, 150)}...</p>
                  <p className="text-xs md:text-sm">
                    <strong>Jawaban Anda:</strong> {userAnswer || '-'} | 
                    <strong> Kunci:</strong> {q.correctAnswer || 'Skor bertingkat'}
                  </p>
                  
                  {/* Show TKP option scores */}
                  {q.category === 'TKP' && (
                    <div className="mt-2 p-2 bg-muted/50 rounded text-[10px] md:text-xs">
                      <strong>Skor per opsi:</strong>
                      <div className="flex flex-wrap gap-1.5 md:gap-2 mt-1">
                        {q.options.map(opt => (
                          <span 
                            key={opt.key} 
                            className={`px-1.5 md:px-2 py-0.5 rounded ${
                              opt.score === 5 
                                ? 'bg-success/20 text-success font-semibold' 
                                : 'bg-muted'
                            }`}
                          >
                            {opt.key}={opt.score}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1">{q.explanation}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Results;
