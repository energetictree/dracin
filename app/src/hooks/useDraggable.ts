import { useState, useCallback, useRef, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface WindowState {
  position: Position;
  size: Size;
  isMaximized: boolean;
  previousState?: {
    position: Position;
    size: Size;
  };
}

export function useDraggable(
  initialPosition: Position = { x: 200, y: 80 },
  initialSize: Size = { width: 800, height: 600 }
) {
  const [state, setState] = useState<WindowState>({
    position: initialPosition,
    size: initialSize,
    isMaximized: false,
  });

  const isDragging = useRef(false);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const elementRef = useRef<HTMLElement | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only drag from title bar, not from buttons
    if ((e.target as HTMLElement).closest('button')) return;
    
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - state.position.x,
      y: e.clientY - state.position.y,
    };
    e.preventDefault();
  }, [state.position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || state.isMaximized) return;

    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;

    // Keep window within viewport bounds
    const maxX = window.innerWidth - state.size.width;
    const maxY = window.innerHeight - state.size.height;

    setState(prev => ({
      ...prev,
      position: {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      },
    }));
  }, [state.isMaximized, state.size]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const maximize = useCallback(() => {
    setState(prev => {
      if (prev.isMaximized) {
        // Restore to previous state
        return {
          ...prev,
          isMaximized: false,
          position: prev.previousState?.position || initialPosition,
          size: prev.previousState?.size || initialSize,
          previousState: undefined,
        };
      } else {
        // Maximize
        return {
          ...prev,
          isMaximized: true,
          previousState: {
            position: prev.position,
            size: prev.size,
          },
          position: { x: 0, y: 0 },
          size: { width: window.innerWidth, height: window.innerHeight - 40 }, // Account for taskbar
        };
      }
    });
  }, [initialPosition, initialSize]);

  const setElementRef = useCallback((el: HTMLElement | null) => {
    elementRef.current = el;
  }, []);

  return {
    position: state.position,
    size: state.size,
    isMaximized: state.isMaximized,
    handleMouseDown,
    maximize,
    setElementRef,
  };
}
