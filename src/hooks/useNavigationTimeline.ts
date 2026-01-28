import { useCallback, useRef } from 'react';

/**
 * Navigation event types for timeline logging
 */
export type NavigationAction = 
  | 'next'           // Click Next button
  | 'prev'           // Click Previous button  
  | 'jump'           // Click question number in navigation grid
  | 'submit'         // Click Submit button
  | 'auto_submit'    // Auto-submit when timer reaches 0
  | 'start';         // Exam started

/**
 * Single navigation event structure
 */
export interface NavigationEvent {
  timestamp: string;           // ISO timestamp
  remainingTimeSeconds: number; // Remaining exam time in seconds
  questionNumber: number;       // Current question number (1-indexed)
  action: NavigationAction;     // Type of navigation action
  previousQuestion?: number;    // Previous question number (for jump detection)
}

/**
 * Hook to track participant navigation events during exam
 * 
 * ZERO NETWORK LAG: All events are stored in memory (array ref)
 * and only sent to server on submit (via getNavigationLog())
 */
export const useNavigationTimeline = () => {
  const eventsRef = useRef<NavigationEvent[]>([]);
  
  /**
   * Log a navigation event
   * @param action - Type of navigation (next, prev, jump, submit)
   * @param remainingTimeSeconds - Current remaining time in seconds
   * @param questionNumber - Current question number (1-indexed)
   * @param previousQuestion - Previous question number (optional, for jump detection)
   */
  const logNavigation = useCallback((
    action: NavigationAction,
    remainingTimeSeconds: number,
    questionNumber: number,
    previousQuestion?: number
  ) => {
    const event: NavigationEvent = {
      timestamp: new Date().toISOString(),
      remainingTimeSeconds,
      questionNumber,
      action,
    };
    
    // Only include previousQuestion for jump action
    if (action === 'jump' && previousQuestion !== undefined) {
      event.previousQuestion = previousQuestion;
    }
    
    eventsRef.current.push(event);
    
    // Debug log (can be removed in production)
    console.log('[Timeline] Event logged:', action, `Q${questionNumber}`, `${Math.floor(remainingTimeSeconds / 60)}:${String(remainingTimeSeconds % 60).padStart(2, '0')}`);
  }, []);
  
  /**
   * Get all navigation events for submission
   * Called only once when exam is submitted
   */
  const getNavigationLog = useCallback((): NavigationEvent[] => {
    return [...eventsRef.current];
  }, []);
  
  /**
   * Clear all events (for cleanup)
   */
  const clearNavigationLog = useCallback(() => {
    eventsRef.current = [];
  }, []);
  
  /**
   * Get event count (for debugging)
   */
  const getEventCount = useCallback(() => {
    return eventsRef.current.length;
  }, []);
  
  return {
    logNavigation,
    getNavigationLog,
    clearNavigationLog,
    getEventCount,
  };
};

export default useNavigationTimeline;
