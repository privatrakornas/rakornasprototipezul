import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { questions as hardcodedQuestions, calculateTWKScore, calculateTIUScore, calculateTKPScore, getPassingStatus } from '@/data/questions';
import { Trophy, BookOpen, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import MaterialAnalysis from '@/components/MaterialAnalysis';
import LatexText from '@/components/LatexText';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { useContentProtection } from '@/hooks/useContentProtection';
import Watermark from '@/components/Watermark';
import { useActivePackageQuestions } from '@/hooks/useActivePackageQuestions';
import SocialMediaWidget from '@/components/SocialMediaWidget';
import { usePageConfig } from '@/hooks/useEditableConfig';

// Sanitize name by removing dangerous Unicode characters
const sanitizeName = (name: string): string => {
  let cleaned = name;
  // Remove control characters
  cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  // Remove zero-width characters
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
  // Remove right-to-left and left-to-right marks (prevent display manipulation)
  cleaned = cleaned.replace(/[\u202A-\u202E\u2066-\u2069]/g, '');
  // Normalize unicode (prevent homograph attacks)
  cleaned = cleaned.normalize('NFKC');
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s{3,}/g, ' ');
  // Trim and limit length
  return cleaned.trim().slice(0, 100);
};

// Validation schema for exam results with enhanced security
const examResultSchema = z.object({
  name: z.string()
    .min(2, 'Nama minimal 2 karakter')
    .max(100, 'Nama maksimal 100 karakter')
    // Only allow letters (any script), numbers, spaces, and basic punctuation
    .regex(/^[\p{L}\p{N}\s\p{P}]+$/u, 'Nama mengandung karakter tidak valid')
    .refine(val => !/[\u200B-\u200D\uFEFF]/.test(val), 'Nama mengandung karakter tersembunyi')
    .refine(val => !/\s{3,}/.test(val), 'Nama mengandung terlalu banyak spasi')
    .transform(sanitizeName),
  twk_score: z.number().int().min(0).max(150), // Max: 30 questions * 5 points = 150
  tiu_score: z.number().int().min(0).max(175), // Max: 35 questions * 5 points = 175
  tkp_score: z.number().int().min(0).max(225), // Max: 45 questions * 5 points = 225
  total_score: z.number().int().min(0).max(550),
  ip_address: z.string().max(45).optional(),
  device_fingerprint: z.string().uuid().optional(),
});

// Generate or get device fingerprint from localStorage
const getDeviceFingerprint = (): string => {
  const storedFingerprint = localStorage.getItem('device_fingerprint');
  if (storedFingerprint) {
    return storedFingerprint;
  }
  // Generate new UUID (with fallback for older browsers)
  const newFingerprint =
    globalThis.crypto?.randomUUID?.() ??
    `fp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem('device_fingerprint', newFingerprint);
  return newFingerprint;
};

// Get client IP address via edge function
const getClientIp = async (): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('get-ip');
    if (error) {
      console.error('Error getting IP:', error);
      return 'unknown';
    }
    return data?.ip || 'unknown';
  } catch (error) {
    console.error('Error calling get-ip function:', error);
    return 'unknown';
  }
};

const Results = () => {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const userName = sessionStorage.getItem('userName') || 'Peserta';
  const { questions: activeQuestions, isLoading: isLoadingQuestions, activePackageName } = useActivePackageQuestions();
  const { get } = usePageConfig(['results_title', 'results_subtitle', 'branding_logo_url']);
  
  // Use active package questions if available, otherwise hardcoded
  const questions = activeQuestions.length > 0 ? activeQuestions : hardcodedQuestions;

  // ============ CONTENT PROTECTION - PROTECT EXAM RESULTS ============
  // Disable right-click, copy-paste, keyboard shortcuts, etc.
  useContentProtection({
    showWarning: true,
    warningMessage: '⚠️ Konten dilindungi! Tidak diperbolehkan menyalin materi pembahasan.',
  });

  // Get exam timing data from localStorage (stored by Exam.tsx on submit)
  const examDuration = parseInt(localStorage.getItem('examDuration') || '0', 10);
  const examStartedAt = localStorage.getItem('examStartedAt') || null;
  const examFinishedAt = localStorage.getItem('examFinishedAt') || null;

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

  const saveToLeaderboard = async () => {
    setIsSaving(true);
    try {
      // Get device fingerprint and IP address
      const deviceFingerprint = getDeviceFingerprint();
      const ipAddress = await getClientIp();

      // Check if this device/IP has already submitted (First Attempt Only)
      const { data: alreadySubmitted, error: checkError } = await supabase.rpc(
        'check_existing_submission',
        {
          p_device_fingerprint: deviceFingerprint,
          p_ip_address: ipAddress !== 'unknown' ? ipAddress : null,
        }
      );

      if (checkError) {
        console.error('Error checking existing submission:', checkError);
      }

      // If already submitted, show practice mode notification and navigate
      if (alreadySubmitted === true) {
        toast.warning('Skor Anda tercatat sebagai latihan!', {
          description: 'IP Address/Perangkat Anda sudah pernah mengerjakan sebelumnya. Skor ini tidak akan mengubah posisi Anda di Leaderboard.',
          duration: 8000,
        });
        navigate('/leaderboard');
        return;
      }

      // Validate data before submission
      const validatedData = examResultSchema.safeParse({
        name: userName,
        twk_score: twkScore,
        tiu_score: tiuScore,
        tkp_score: tkpScore,
        total_score: totalScore,
        ip_address: ipAddress !== 'unknown' ? ipAddress : undefined,
        device_fingerprint: deviceFingerprint,
      });

      if (!validatedData.success) {
        const errorMsg = validatedData.error.errors[0]?.message || 'Data tidak valid';
        toast.error(errorMsg);
        setIsSaving(false);
        return;
      }

      // Save to Supabase with validated data (First Attempt)
      const { error } = await supabase.from('exam_results').insert({
        name: validatedData.data.name,
        twk_score: validatedData.data.twk_score,
        tiu_score: validatedData.data.tiu_score,
        tkp_score: validatedData.data.tkp_score,
        total_score: validatedData.data.total_score,
        ip_address: validatedData.data.ip_address || null,
        device_fingerprint: validatedData.data.device_fingerprint || null,
        duration_minutes: examDuration > 0 ? examDuration : null,
        started_at: examStartedAt,
        finished_at: examFinishedAt,
      });

      if (error) {
        console.error('Error saving to leaderboard:', error);
        toast.error('Gagal menyimpan ke leaderboard');
        // Fallback to localStorage
        const leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
        leaderboard.push({ name: userName, twk: twkScore, tiu: tiuScore, tkp: tkpScore, total: totalScore, date: new Date().toISOString() });
        localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
      } else {
        toast.success('Hasil percobaan pertama berhasil disimpan ke leaderboard');
      }

      navigate('/leaderboard');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan');
      navigate('/leaderboard');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-secondary">
      <header className="metallic-maroon py-3 md:py-4">
        <div className="container mx-auto text-center px-4 flex flex-col items-center">
          {get('branding_logo_url') && (
            <img src={get('branding_logo_url')} alt="Logo" className="w-10 h-10 md:w-14 md:h-14 object-contain mb-2 rounded" />
          )}
          <h1 className="text-lg md:text-2xl font-bold text-white">{get('results_title')}</h1>
          <p className="text-white/80 text-xs md:text-sm">{get('results_subtitle')}</p>
        </div>
      </header>

      <main className="container mx-auto py-4 md:py-8 px-3 md:px-4">
        <Card className="max-w-2xl mx-auto p-4 md:p-8 shadow-xl card-gold-border">
          <div className="text-center mb-6 md:mb-8">
            <Trophy className={`w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 ${status.passed ? 'text-accent' : 'text-muted-foreground'}`} />
            <h2 className="text-xl md:text-2xl font-bold text-primary">{userName}</h2>
            <p className={`mt-2 font-semibold text-sm md:text-base ${status.passed ? 'text-success' : 'text-destructive'}`}>
              {status.message}
            </p>
          </div>

          {/* Total Score Card - Gold Gradient */}
          <div className="mb-6 md:mb-8 rounded-xl p-4 md:p-6 score-card-gold text-center">
            <p className="text-sm md:text-base font-medium opacity-90">Skor Total</p>
            <p className="text-4xl md:text-5xl font-bold mt-1">{totalScore}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
            <div className="text-center p-3 md:p-4 bg-secondary rounded-lg border border-border">
              <p className="text-xs md:text-sm text-muted-foreground font-medium">TWK</p>
              <p className={`text-xl md:text-2xl font-bold ${twkScore >= 65 ? 'text-success' : 'text-destructive'}`}>{twkScore}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">PG: 65</p>
            </div>
            <div className="text-center p-3 md:p-4 bg-secondary rounded-lg border border-border">
              <p className="text-xs md:text-sm text-muted-foreground font-medium">TIU</p>
              <p className={`text-xl md:text-2xl font-bold ${tiuScore >= 80 ? 'text-success' : 'text-destructive'}`}>{tiuScore}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">PG: 80</p>
            </div>
            <div className="text-center p-3 md:p-4 bg-secondary rounded-lg border border-border">
              <p className="text-xs md:text-sm text-muted-foreground font-medium">TKP</p>
              <p className={`text-xl md:text-2xl font-bold ${tkpScore >= 166 ? 'text-success' : 'text-destructive'}`}>{tkpScore}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">PG: 166</p>
            </div>
          </div>

          {/* Material Analysis Section */}
          <div className="mb-6 md:mb-8">
            <MaterialAnalysis answers={answers} questions={questions} />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 md:gap-4 justify-center">
            <Button onClick={saveToLeaderboard} disabled={isSaving} className="w-full sm:w-auto text-sm">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4 mr-2" /> Lihat Leaderboard
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full sm:w-auto text-sm">
              Kembali
            </Button>
          </div>

          {/* Social Media Widget */}
          <div className="mt-4">
            <SocialMediaWidget />
          </div>
        </Card>

        {/* Answer Key Section */}
        <Card className="max-w-4xl mx-auto mt-6 md:mt-8 p-4 md:p-6 shadow-lg">
          <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 flex items-center gap-2 text-primary">
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
                  <div className="text-xs md:text-sm mb-2">
                    <LatexText>{`${q.text.substring(0, 150)}...`}</LatexText>
                  </div>
                  
                  {/* Gambar Soal untuk soal figural */}
                  {q.imageUrl && (
                    <div className="mb-3">
                      <img 
                        src={q.imageUrl} 
                        alt={`Gambar soal ${q.id}`}
                        className="max-w-full md:max-w-md h-auto rounded-lg border shadow-sm"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const fallback = document.createElement('div');
                          fallback.className = 'bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-200 dark:border-red-800 text-xs';
                          
                          const errorText = document.createElement('p');
                          errorText.className = 'text-red-600 dark:text-red-400 font-medium';
                          errorText.textContent = '⚠️ Gambar gagal dimuat';
                          
                          const urlText = document.createElement('p');
                          urlText.className = 'text-muted-foreground text-[10px] break-all mt-1';
                          urlText.textContent = 'URL: ';
                          
                          const link = document.createElement('a');
                          link.href = q.imageUrl || '';
                          link.textContent = q.imageUrl || '';
                          link.target = '_blank';
                          link.rel = 'noopener noreferrer';
                          link.className = 'underline';
                          
                          urlText.appendChild(link);
                          fallback.appendChild(errorText);
                          fallback.appendChild(urlText);
                          target.parentNode?.appendChild(fallback);
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Gambar Pilihan untuk soal figural */}
                  {q.optionImageUrls && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                      {q.options.map((opt) => {
                        const optionImage = q.optionImageUrls?.[opt.key as 'A' | 'B' | 'C' | 'D' | 'E'];
                        const isUserAnswer = userAnswer === opt.key;
                        const isCorrectAnswer = q.correctAnswer === opt.key;
                        return (
                          <div
                            key={opt.key}
                            className={`relative p-1.5 md:p-2 rounded-lg border-2 ${
                              isCorrectAnswer 
                                ? 'border-success bg-success/10' 
                                : isUserAnswer 
                                ? 'border-destructive bg-destructive/10' 
                                : 'border-border'
                            }`}
                          >
                            <span className="absolute top-0.5 left-0.5 w-4 h-4 md:w-5 md:h-5 rounded-full bg-secondary flex items-center justify-center font-semibold text-[8px] md:text-[10px]">
                              {opt.key}
                            </span>
                            {optionImage ? (
                              <img 
                                src={optionImage} 
                                alt={`Pilihan ${opt.key}`}
                                className="w-full h-auto rounded mt-3"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  target.style.display = 'none';
                                  const fallback = document.createElement('div');
                                  fallback.className = 'w-full aspect-square bg-red-50 dark:bg-red-900/20 rounded flex items-center justify-center mt-3';
                                  const errorSpan = document.createElement('span');
                                  errorSpan.className = 'text-red-500 text-[8px]';
                                  errorSpan.textContent = 'Gagal';
                                  fallback.appendChild(errorSpan);
                                  target.parentNode?.appendChild(fallback);
                                }}
                              />
                            ) : (
                              <div className="w-full aspect-square bg-muted rounded flex items-center justify-center mt-3">
                                <span className="text-muted-foreground text-[8px] md:text-[10px]">{opt.key}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
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
                  
                  <div className="text-[10px] md:text-xs text-muted-foreground mt-1">
                    <LatexText>{q.explanation}</LatexText>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </main>
      
      {/* Watermark overlay for protected page */}
      <Watermark userName={userName} />
    </div>
  );
};

export default Results;