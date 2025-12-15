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
  const userName = localStorage.getItem('userName') || 'Peserta';

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
          {/* Left: Title & Username */}
          <div className="text-left">
            <span className="text-white font-semibold block">CAT SKD - RAKORNAS</span>
            <span className="text-white/80 text-sm">{userName}</span>
          </div>
          
          {/* Right: Timer & Submit Button */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 text-white font-mono text-xl ${timeLeft < 300 ? 'timer-danger' : timeLeft < 600 ? 'timer-warning' : ''}`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
            <Button onClick={handleSubmit} variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700">
              Selesai & Submit
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">

        {/* Main Question Panel */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Card className="p-6 animate-fade-in">
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="text-muted-foreground text-sm whitespace-nowrap">Soal {question.id} / 110</span>
              </div>
              <div className="px-3 py-2 bg-accent/20 text-accent rounded-lg text-sm font-medium leading-relaxed">
                {question.category} - {question.code}
              </div>
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
                onClick={() => setCurrentQuestion(currentQuestion === 109 ? 0 : currentQuestion + 1)}
              >
                Selanjutnya <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </main>

        {/* Right Sidebar - Question Navigation */}
        <aside className="w-64 bg-card border-l flex flex-col h-[calc(100vh-56px)] sticky top-14">
          {/* Header with Title and Legend */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm">Navigasi Soal</h3>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-[hsl(var(--answered))]" />
                  <span>{Object.keys(answers).length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-[hsl(var(--unanswered))] border" />
                  <span>{110 - Object.keys(answers).length}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Scrollable Question Grid */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
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
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Exam;
