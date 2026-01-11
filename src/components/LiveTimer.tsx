import { useState, useEffect } from 'react';
import { Clock, Timer } from 'lucide-react';

interface LiveTimerProps {
  startedAt: string | null | undefined;
  totalMinutes: number;
  status: 'ongoing' | 'finished';
  durationMinutes?: number | null;
}

export const LiveTimer = ({ startedAt, totalMinutes, status, durationMinutes }: LiveTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (status !== 'ongoing' || !startedAt) {
      return;
    }

    const calculateTimeLeft = () => {
      const startTime = new Date(startedAt).getTime();
      const now = Date.now();
      const elapsedMs = now - startTime;
      const totalMs = totalMinutes * 60 * 1000;
      const remainingMs = Math.max(0, totalMs - elapsedMs);
      return Math.floor(remainingMs / 1000); // seconds
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startedAt, totalMinutes, status]);

  // Finished exam - show final duration
  if (status === 'finished') {
    return (
      <span className="whitespace-nowrap">
        {durationMinutes != null 
          ? `${durationMinutes} menit / ${totalMinutes} menit` 
          : `- / ${totalMinutes} menit`}
      </span>
    );
  }

  // Ongoing exam - show countdown
  if (timeLeft === null || !startedAt) {
    return (
      <span className="text-yellow-600 dark:text-yellow-400 font-medium whitespace-nowrap flex items-center gap-1">
        <Timer className="w-3 h-3 animate-pulse" />
        Memulai...
      </span>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Urgent styling for low time
  const isUrgent = timeLeft < 300; // Less than 5 minutes
  const isWarning = timeLeft < 600; // Less than 10 minutes

  return (
    <span 
      className={`font-mono font-bold whitespace-nowrap flex items-center gap-1 ${
        isUrgent 
          ? 'text-red-600 dark:text-red-400 animate-pulse' 
          : isWarning 
            ? 'text-yellow-600 dark:text-yellow-400' 
            : 'text-blue-600 dark:text-blue-400'
      }`}
    >
      <Clock className={`w-3 h-3 ${isUrgent ? 'animate-bounce' : ''}`} />
      Sedang Ujian {formattedTime}
    </span>
  );
};
