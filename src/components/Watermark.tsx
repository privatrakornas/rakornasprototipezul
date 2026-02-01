import React from 'react';

interface WatermarkProps {
  userName?: string;
}

const Watermark: React.FC<WatermarkProps> = ({ userName }) => {
  // Show user name if provided, otherwise default text
  const watermarkText = userName 
    ? `PRIVAT RAKORNAS • ${userName.toUpperCase()} • DILARANG MENYEBAR`
    : "PRIVAT RAKORNAS - DILARANG MENYEBAR";
  
  // Create multiple rows of watermark text
  const rows = Array.from({ length: 15 }, (_, i) => i);
  const cols = Array.from({ length: 6 }, (_, i) => i);

  return (
    <div 
      className="fixed inset-0 z-[9999] overflow-hidden select-none"
      style={{ 
        pointerEvents: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      aria-hidden="true"
    >
      <div 
        className="absolute inset-0 flex flex-col justify-center items-center"
        style={{
          transform: 'rotate(-25deg) scale(1.4)',
          transformOrigin: 'center center',
        }}
      >
        {rows.map((row) => (
          <div key={row} className="flex whitespace-nowrap my-10">
            {cols.map((col) => (
              <span
                key={`${row}-${col}`}
                className="mx-16 text-xs sm:text-sm md:text-base font-bold tracking-wider"
                style={{
                  color: 'rgba(128, 0, 32, 0.06)',
                  textShadow: '0 0 1px rgba(128, 0, 32, 0.03)',
                }}
              >
                {watermarkText}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Watermark;
