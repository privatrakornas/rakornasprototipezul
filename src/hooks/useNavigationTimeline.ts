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
 * 
 * UPDATED: Now tracks both fromQuestion and toQuestion for complete navigation trail
 */
export interface NavigationEvent {
  timestamp: string;           // ISO timestamp
  remainingTimeSeconds: number; // Remaining exam time in seconds
  remainingTimeFormatted: string; // Human-readable format "MM:SS"
  action: NavigationAction;     // Type of navigation action
  fromQuestion: number;         // Question number BEFORE navigation (1-indexed)
  toQuestion: number;           // Question number AFTER navigation (1-indexed)
}

/**
 * Format seconds to MM:SS string
 */
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Hook to track participant navigation events during exam
 * 
 * ZERO NETWORK LAG: All events are stored in memory (array ref)
 * and only sent to server on submit (via getNavigationLog())
 */
export const useNavigationTimeline = () => {
  const eventsRef = useRef<NavigationEvent[]>([]);
  
  /**
   * Log a navigation event with complete from/to tracking
   * @param action - Type of navigation (next, prev, jump, submit, auto_submit, start)
   * @param remainingTimeSeconds - Current remaining time in seconds
   * @param fromQuestion - Question number BEFORE the action (1-indexed)
   * @param toQuestion - Question number AFTER the action (1-indexed)
   */
  const logNavigation = useCallback((
    action: NavigationAction,
    remainingTimeSeconds: number,
    fromQuestion: number,
    toQuestion: number
  ) => {
    const event: NavigationEvent = {
      timestamp: new Date().toISOString(),
      remainingTimeSeconds,
      remainingTimeFormatted: formatTime(remainingTimeSeconds),
      action,
      fromQuestion,
      toQuestion,
    };
    
    eventsRef.current.push(event);
    
    // Debug log with detailed info
    const actionLabel = action === 'submit' ? '🏁 SUBMIT' : 
                        action === 'auto_submit' ? '⏰ AUTO-SUBMIT' :
                        action === 'start' ? '🚀 START' : action.toUpperCase();
    console.log(`[Timeline] ${actionLabel}: Q${fromQuestion} → Q${toQuestion} @ ${formatTime(remainingTimeSeconds)}`);
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
