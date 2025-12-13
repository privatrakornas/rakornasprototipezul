import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { questions } from '@/data/questions';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const EXAM_TIME = 100 * 60; // 100 minutes in seconds

const Exam = () => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(EXAM_TIME);

  // Anti-cheat: detect tab switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        alert('Anda terdeteksi meninggalkan halaman ujian!');
        localStorage.removeItem('userName');
        navigate('/');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [navigate]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (key: string) => {
    setAnswers(prev => ({ ...prev, [questions[currentQuestion].id]: key }));
  };

  const handleSubmit = useCallback(() => {
    const unanswered = questions.filter(q => !answers[q.id]).length;
    if (unanswered > 0 && timeLeft > 0) {
      alert(`Seluruh soal harus dijawab terlebih dahulu. Masih ada ${unanswered} soal belum dijawab.`);
      return;
    }
    localStorage.setItem('examAnswers', JSON.stringify(answers));
    navigate('/results');
  }, [answers, navigate, timeLeft]);

  const question = questions[currentQuestion];
  const isAnswered = (id: number) => answers[id] !== undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed Header */}
      <header className="metallic-maroon py-3 sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center px-4">
          <span className="text-white font-semibold">CAT SKD - RAKORNAS</span>
          <div className={`flex items-center gap-2 text-white font-mono text-xl ${timeLeft < 300 ? 'timer-danger' : timeLeft < 600 ? 'timer-warning' : ''}`}>
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Navigation Panel */}
        <aside className="w-64 bg-card border-r p-4 overflow-y-auto scrollbar-thin">
          <h3 className="font-semibold mb-3 text-sm">Navigasi Soal</h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestion(idx)}
                className={`w-10 h-10 rounded text-xs font-medium border transition-all flex flex-col items-center justify-center ${
                  currentQuestion === idx
                    ? 'nav-btn-current'
                    : isAnswered(q.id)
                    ? 'nav-btn-answered'
                    : 'nav-btn-unanswered'
                }`}
              >
                <span className="leading-none">{q.id}</span>
                {answers[q.id] && (
                  <span className="text-[10px] font-bold leading-none mt-0.5">{answers[q.id]}</span>
                )}
              </button>
            ))}
          </div>
          
          <div className="mt-6 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-answered" />
              <span>Terjawab ({Object.keys(answers).length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-unanswered border" />
              <span>Belum dijawab ({110 - Object.keys(answers).length})</span>
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full mt-6" variant="destructive">
            Selesai & Submit
          </Button>
        </aside>

        {/* Question Panel */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Card className="p-6 animate-fade-in">
            <div className="flex justify-between items-start mb-4">
              <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm font-medium">
                {question.category} - {question.code}
              </span>
              <span className="text-muted-foreground">Soal {question.id} / 110</span>
            </div>

            <p className="text-lg leading-relaxed mb-6 whitespace-pre-line">{question.text}</p>

            {question.hasImage && (
              <p className="text-muted-foreground italic mb-4">[Soal bergambar - Gambar ditampilkan di sini]</p>
            )}

            <div className="space-y-3">
              {question.options.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleAnswer(opt.key)}
                  className={`answer-option w-full text-left flex gap-3 ${
                    answers[question.id] === opt.key ? 'answer-option-selected' : ''
                  }`}
                >
                  <span className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-semibold flex-shrink-0">
                    {opt.key}
                  </span>
                  <span>{opt.text}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Sebelumnya
              </Button>
              <Button
                onClick={() => setCurrentQuestion(Math.min(109, currentQuestion + 1))}
                disabled={currentQuestion === 109}
              >
                Selanjutnya <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Exam;
