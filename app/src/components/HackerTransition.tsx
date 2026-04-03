import { useEffect, useRef, useState } from 'react';

interface HackerTransitionProps {
  username: string;
  onComplete: () => void;
  duration?: number; // Duration in milliseconds, default 800ms
}

const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワ0123456789ABCDEF';

// Generate a column of characters
function generateColumn() {
  return Array.from({ length: 20 }, () => 
    MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
  );
}

export function HackerTransition({ username, onComplete, duration = 800 }: HackerTransitionProps) {
  const [columns, setColumns] = useState<Array<{
    id: number;
    chars: string[];
    x: number;
    y: number;
    speed: number;
  }>>([]);
  
  // Use ref to always have access to the latest callback
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Initialize columns - reduced from 30 to 15 for better performance
  useEffect(() => {
    const colCount = 15;
    const cols = Array.from({ length: colCount }, (_, i) => ({
      id: i,
      chars: generateColumn(),
      x: (i / colCount) * 100,
      y: Math.random() * -100,
      speed: 3 + Math.random() * 4, // Faster speed
    }));
    setColumns(cols);
  }, []);

  // Animation loop
  useEffect(() => {
    if (columns.length === 0) return;

    let animationId: number;
    let isRunning = true;

    const animate = () => {
      if (!isRunning) return;

      setColumns(prev => prev.map(col => {
        let newY = col.y + col.speed;
        // Reset when off screen
        if (newY > 120) {
          newY = -20;
          return { ...col, y: newY, chars: generateColumn() };
        }
        return { ...col, y: newY };
      }));

      animationId = requestAnimationFrame(animate);
    };

    animate();

    // Complete after specified duration - no fade, just unmount
    const completeTimer = setTimeout(() => {
      isRunning = false;
      cancelAnimationFrame(animationId);
      onCompleteRef.current();
    }, duration);

    return () => {
      isRunning = false;
      clearTimeout(completeTimer);
      cancelAnimationFrame(animationId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns.length]); // Only re-run when columns are initialized

  return (
    <div 
      className="fixed inset-0 bg-black z-50 overflow-hidden font-mono"
    >
      {/* Matrix rain columns */}
      {columns.map((col) => (
        <div
          key={col.id}
          className="absolute flex flex-col items-center text-green-500 text-lg leading-tight"
          style={{
            left: `${col.x}%`,
            top: `${col.y}%`,
            transform: 'translateX(-50%)',
            textShadow: '0 0 8px #0f0',
          }}
        >
          {col.chars.map((char, i) => (
            <span
              key={i}
              style={{
                opacity: i === 0 ? 1 : Math.max(0.1, 1 - i * 0.1),
                color: i === 0 ? '#fff' : '#0f0',
                textShadow: i === 0 ? '0 0 10px #fff' : '0 0 5px #0f0',
              }}
            >
              {char}
            </span>
          ))}
        </div>
      ))}

      {/* Center message */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-10">
        <div 
          className="text-white font-mono text-4xl md:text-6xl font-bold tracking-widest animate-pulse"
          style={{ textShadow: '0 0 30px #0f0, 0 0 60px #0f0' }}
        >
          ACCESS GRANTED
        </div>
        <div className="mt-4 text-green-400 font-mono text-lg">
          WELCOME, {username.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

export default HackerTransition;
