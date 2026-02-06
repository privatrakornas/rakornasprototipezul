import type { Question } from '@/data/questions';

interface MaterialStats {
  name: string;
  correct: number;
  total: number;
  category: 'TWK' | 'TIU' | 'TKP';
}

// Material mapping based on question ID ranges
const getMaterialName = (questionId: number, code: string): string | null => {
  // TWK Materials (1-30)
  if (questionId >= 1 && questionId <= 8) return 'Pilar Negara';
  if (questionId >= 9 && questionId <= 13) return 'Nasionalisme';
  if (questionId >= 14 && questionId <= 18) return 'Bela Negara';
  if (questionId >= 19 && questionId <= 24) return 'Integritas';
  if (questionId >= 25 && questionId <= 30) return 'Bahasa Indonesia';
  
  // TIU Materials (31-65)
  if (questionId >= 31 && questionId <= 36) return 'Analogi';
  if (questionId >= 37 && questionId <= 40) return 'Deret Angka';
  if (questionId >= 41 && questionId <= 44) return 'Silogisme';
  if (questionId >= 45 && questionId <= 48) return 'Berhitung';
  if (questionId >= 49 && questionId <= 52) return 'Perbandingan Kuantitatif';
  if (questionId >= 53 && questionId <= 56) return 'Soal Cerita';
  if (questionId >= 57 && questionId <= 60) return 'Analitis';
  if (questionId >= 61 && questionId <= 65) return 'Figural';
  
  // TKP Materials (66-110)
  if (questionId >= 66 && questionId <= 73) return 'Profesionalisme';
  if (questionId >= 74 && questionId <= 79) return 'Pelayanan Publik';
  if (questionId >= 80 && questionId <= 89) return 'Jejaring Kerja';
  if (questionId >= 90 && questionId <= 96) return 'TIK';
  if (questionId >= 97 && questionId <= 104) return 'Sosio Kultural';
  if (questionId >= 105 && questionId <= 110) return 'Anti Radikalisme';
  
  return null;
};

const getCategoryFromId = (questionId: number): 'TWK' | 'TIU' | 'TKP' => {
  if (questionId <= 30) return 'TWK';
  if (questionId <= 65) return 'TIU';
  return 'TKP';
};

export const calculateMaterialStats = (answers: Record<number, string>, questionsData: Question[]): MaterialStats[] => {
  const materialMap = new Map<string, MaterialStats>();
  
  questionsData.forEach((q) => {
    const materialName = getMaterialName(q.id, q.code);
    if (!materialName) return;
    
    const category = getCategoryFromId(q.id);
    const userAnswer = answers[q.id];
    
    // Determine if answer is correct
    let isCorrect = false;
    if (category === 'TKP') {
      // For TKP: score of 5 = correct, otherwise incorrect
      const userScore = q.options.find(o => o.key === userAnswer)?.score || 0;
      isCorrect = userScore === 5;
    } else {
      // For TWK/TIU: check against correct answer
      isCorrect = userAnswer === q.correctAnswer;
    }
    
    if (!materialMap.has(materialName)) {
      materialMap.set(materialName, {
        name: materialName,
        correct: 0,
        total: 0,
        category,
      });
    }
    
    const stats = materialMap.get(materialName)!;
    stats.total += 1;
    if (isCorrect) stats.correct += 1;
  });
  
  return Array.from(materialMap.values());
};

interface MaterialAnalysisProps {
  answers: Record<number, string>;
  questions?: Question[];
}

const MaterialAnalysis = ({ answers, questions: questionsProp }: MaterialAnalysisProps) => {
  // Use provided questions or fallback to empty (caller should provide)
  const questionsData = questionsProp || [];
  const stats = calculateMaterialStats(answers, questionsData);
  
  // Group by category
  const twkStats = stats.filter(s => s.category === 'TWK');
  const tiuStats = stats.filter(s => s.category === 'TIU');
  const tkpStats = stats.filter(s => s.category === 'TKP');

  const renderBar = (stat: MaterialStats) => {
    const percentage = stat.total > 0 ? (stat.correct / stat.total) * 100 : 0;
    
    return (
      <div key={stat.name} className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs md:text-sm font-medium">{stat.name}</span>
          <span className="text-xs md:text-sm text-muted-foreground">
            {stat.correct}/{stat.total}
          </span>
        </div>
        <div className="h-4 md:h-5 w-full bg-destructive/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-success rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  const renderSection = (title: string, data: MaterialStats[], color: string) => (
    <div className="mb-4 last:mb-0">
      <h4 className={`text-sm md:text-base font-semibold mb-2 px-2 py-1 rounded ${color}`}>
        {title}
      </h4>
      <div className="space-y-2">
        {data.map(renderBar)}
      </div>
    </div>
  );

  return (
    <div className="bg-card border rounded-lg p-4 md:p-6">
      <h3 className="text-lg md:text-xl font-bold mb-4 text-center">
        📊 Analisis Kekuatan Materi
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div>
          {renderSection('TWK', twkStats, 'bg-blue-500/10 text-blue-600')}
        </div>
        <div>
          {renderSection('TIU', tiuStats, 'bg-purple-500/10 text-purple-600')}
        </div>
        <div>
          {renderSection('TKP', tkpStats, 'bg-orange-500/10 text-orange-600')}
        </div>
      </div>
      
      <div className="mt-4 pt-3 border-t flex justify-center gap-6 text-xs md:text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-success rounded" />
          <span>Benar</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-destructive/20 rounded" />
          <span>Salah</span>
        </div>
      </div>
    </div>
  );
};

export default MaterialAnalysis;
