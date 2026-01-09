import React from 'react';

const Watermark: React.FC = () => {
  const watermarkText = "PRIVAT RAKORNAS - DILARANG MENYEBAR";
  
  // Create multiple rows of watermark text
  const rows = Array.from({ length: 20 }, (_, i) => i);
  const cols = Array.from({ length: 8 }, (_, i) => i);

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
          transform: 'rotate(-30deg) scale(1.5)',
          transformOrigin: 'center center',
        }}
      >
        {rows.map((row) => (
          <div key={row} className="flex whitespace-nowrap my-8">
            {cols.map((col) => (
              <span
                key={`${row}-${col}`}
                className="mx-12 text-sm sm:text-base md:text-lg font-bold tracking-wider"
                style={{
                  color: 'rgba(128, 0, 32, 0.08)',
                  textShadow: '0 0 1px rgba(128, 0, 32, 0.05)',
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
