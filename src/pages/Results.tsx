import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { questions, calculateTWKScore, calculateTIUScore, calculateTKPScore, getPassingStatus } from '@/data/questions';
import { Trophy, BookOpen, CheckCircle, XCircle } from 'lucide-react';

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
      <header className="metallic-maroon py-4">
        <div className="container mx-auto text-center">
          <h1 className="text-2xl font-bold text-white">HASIL UJIAN</h1>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto p-8">
          <div className="text-center mb-8">
            <Trophy className={`w-16 h-16 mx-auto mb-4 ${status.passed ? 'text-success' : 'text-muted-foreground'}`} />
            <h2 className="text-2xl font-bold">{userName}</h2>
            <p className={`mt-2 font-semibold ${status.passed ? 'text-success' : 'text-destructive'}`}>
              {status.message}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="text-center p-4 bg-secondary rounded-lg">
              <p className="text-sm text-muted-foreground">TWK</p>
              <p className="text-2xl font-bold">{twkScore}</p>
              <p className="text-xs text-muted-foreground">PG: 65</p>
            </div>
            <div className="text-center p-4 bg-secondary rounded-lg">
              <p className="text-sm text-muted-foreground">TIU</p>
              <p className="text-2xl font-bold">{tiuScore}</p>
              <p className="text-xs text-muted-foreground">PG: 80</p>
            </div>
            <div className="text-center p-4 bg-secondary rounded-lg">
              <p className="text-sm text-muted-foreground">TKP</p>
              <p className="text-2xl font-bold">{tkpScore}</p>
              <p className="text-xs text-muted-foreground">PG: 166</p>
            </div>
            <div className="text-center p-4 bg-primary text-primary-foreground rounded-lg">
              <p className="text-sm opacity-80">Total</p>
              <p className="text-2xl font-bold">{totalScore}</p>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Button onClick={saveToLeaderboard}>
              <Trophy className="w-4 h-4 mr-2" /> Lihat Leaderboard
            </Button>
            <Button variant="outline" onClick={() => navigate('/')}>
              Kembali
            </Button>
          </div>
        </Card>

        {/* Answer Key Section */}
        <Card className="max-w-4xl mx-auto mt-8 p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" /> Kunci Jawaban & Pembahasan
          </h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {questions.map((q) => {
              const userAnswer = answers[q.id];
              const isCorrect = q.category === 'TKP' 
                ? q.options.find(o => o.key === userAnswer)?.score === 5
                : userAnswer === q.correctAnswer;
              
              return (
                <div key={q.id} className="p-4 border rounded-lg">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                    <div className="flex-1">
                      <span className="font-semibold block">Soal {q.id}</span>
                      <span className="text-sm text-muted-foreground break-words">{q.category} - {q.code}</span>
                    </div>
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm mb-2">{q.text.substring(0, 150)}...</p>
                  <p className="text-sm">
                    <strong>Jawaban Anda:</strong> {userAnswer || '-'} | 
                    <strong> Kunci:</strong> {q.correctAnswer || 'Skor bertingkat'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{q.explanation}</p>
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
