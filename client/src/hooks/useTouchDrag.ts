import { useState, useRef, useCallback, useEffect } from 'react';

interface TouchDragOptions {
  holdDelay?: number; // ms to hold before drag activates (default: 300)
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

/**
 * Hook for touch-friendly dragging with hold-to-drag mechanism.
 * On touch devices, user must hold for `holdDelay` ms before drag activates.
 * This prevents accidental drags while scrolling.
 */
export function useTouchDrag(options: TouchDragOptions = {}) {
  const { holdDelay = 300, onDragStart, onDragEnd } = options;
  
  const [isDragEnabled, setIsDragEnabled] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isTouchDeviceRef = useRef(false);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isTouchDeviceRef.current = true;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    setIsHolding(true);
    
    // Start hold timer
    holdTimerRef.current = setTimeout(() => {
      setIsDragEnabled(true);
      onDragStart?.();
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, holdDelay);
  }, [holdDelay, onDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);
    
    // If user moved more than 10px before hold completed, cancel the drag
    // This allows normal scrolling
    if (!isDragEnabled && (deltaX > 10 || deltaY > 10)) {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      setIsHolding(false);
      touchStartPosRef.current = null;
    }
  }, [isDragEnabled]);

  const handleTouchEnd = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
    if (isDragEnabled) {
      setIsDragEnabled(false);
      onDragEnd?.();
    }
    touchStartPosRef.current = null;
  }, [isDragEnabled, onDragEnd]);

  const handleMouseDown = useCallback(() => {
    // On mouse devices, enable drag immediately
    if (!isTouchDeviceRef.current) {
      setIsDragEnabled(true);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!isTouchDeviceRef.current) {
      setIsDragEnabled(false);
    }
  }, []);

  // Reset touch device flag on mouse interaction
  const handleMouseMove = useCallback(() => {
    isTouchDeviceRef.current = false;
  }, []);

  return {
    isDragEnabled,
    isHolding,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
    },
    mouseHandlers: {
      onMouseDown: handleMouseDown,
      onMouseUp: handleMouseUp,
      onMouseMove: handleMouseMove,
    },
  };
}

/**
 * Check if the current device is touch-based
 */
export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
