import { useEffect, useCallback, useState } from 'react';
import { toast } from 'sonner';

interface UseContentProtectionOptions {
  showWarning?: boolean;
  warningMessage?: string;
  onViolation?: () => void;
}

/**
 * This hook handles ONLY content protection (right-click, copy, keyboard shortcuts, etc.)
 * 
 * NOTE: Tab switch / focus detection is now handled separately in Exam.tsx
 * using the Page Visibility API for smarter detection that doesn't trigger
 * on browser pop-ups like "Save Password".
 * 
 * Respects admin config: security.contentProtectionEnabled
 */

const defaultWarningMessage = "⚠️ Aktivitas mencurigakan terdeteksi! Tindakan ini tercatat di sistem.";

// Check if content protection is enabled from admin config
const isProtectionEnabled = (): boolean => {
  const saved = localStorage.getItem('examConfig');
  if (saved) {
    try {
      const config = JSON.parse(saved);
      return config.security?.contentProtectionEnabled !== false;
    } catch {
      return true;
    }
  }
  return true;
};

export const useContentProtection = (options: UseContentProtectionOptions = {}) => {
  const { 
    showWarning = true, 
    warningMessage = defaultWarningMessage,
    onViolation 
  } = options;

  const [isEnabled, setIsEnabled] = useState(isProtectionEnabled);

  // Listen for config changes
  useEffect(() => {
    const checkConfig = () => setIsEnabled(isProtectionEnabled());
    window.addEventListener('storage', checkConfig);
    const interval = setInterval(checkConfig, 1000);
    return () => {
      window.removeEventListener('storage', checkConfig);
      clearInterval(interval);
    };
  }, []);

  const handleWarning = useCallback((action: string) => {
    console.log(`[CONTENT PROTECTION] Blocked action: ${action}`);
    
    if (showWarning) {
      toast.error(warningMessage, {
        duration: 3000,
        position: 'top-center',
      });
    }
    
    if (onViolation) {
      onViolation();
    }
  }, [showWarning, warningMessage, onViolation]);

  useEffect(() => {
    // Skip all protection if disabled by admin
    if (!isEnabled) {
      console.log('[CONTENT PROTECTION] Disabled by admin config');
      return;
    }

    // ============ MOUSE EVENTS ============
    
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleWarning('right-click');
      return false;
    };

    // Disable text selection
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Disable drag
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      handleWarning('drag');
      return false;
    };

    // ============ CLIPBOARD EVENTS ============
    
    // Disable copy
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      handleWarning('copy');
      return false;
    };

    // Disable cut
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      handleWarning('cut');
      return false;
    };

    // Disable paste
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      handleWarning('paste');
      return false;
    };

    // ============ KEYBOARD SHORTCUTS ============
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;

      // PrintScreen key
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        handleWarning('PrintScreen');
        // Clear clipboard
        navigator.clipboard.writeText('').catch(() => {});
        return false;
      }

      // F12 (Developer Tools)
      if (e.key === 'F12') {
        e.preventDefault();
        handleWarning('F12 - DevTools');
        return false;
      }

      // F1-F11 (Block all function keys for safety)
      if (e.key.match(/^F[1-9]$|^F1[01]$/)) {
        e.preventDefault();
        return false;
      }

      // Ctrl/Cmd based shortcuts
      if (isCtrl) {
        // Ctrl + C (Copy)
        if (key === 'c') {
          e.preventDefault();
          handleWarning('Ctrl+C - Copy');
          return false;
        }
        // Ctrl + V (Paste)
        if (key === 'v') {
          e.preventDefault();
          handleWarning('Ctrl+V - Paste');
          return false;
        }
        // Ctrl + X (Cut)
        if (key === 'x') {
          e.preventDefault();
          handleWarning('Ctrl+X - Cut');
          return false;
        }
        // Ctrl + P (Print)
        if (key === 'p') {
          e.preventDefault();
          handleWarning('Ctrl+P - Print');
          return false;
        }
        // Ctrl + S (Save)
        if (key === 's') {
          e.preventDefault();
          handleWarning('Ctrl+S - Save');
          return false;
        }
        // Ctrl + A (Select All)
        if (key === 'a') {
          e.preventDefault();
          handleWarning('Ctrl+A - Select All');
          return false;
        }
        // Ctrl + U (View Source)
        if (key === 'u') {
          e.preventDefault();
          handleWarning('Ctrl+U - View Source');
          return false;
        }
        // Ctrl + G (Find)
        if (key === 'g') {
          e.preventDefault();
          return false;
        }
        // Ctrl + F (Find)
        if (key === 'f') {
          e.preventDefault();
          return false;
        }
        // Ctrl + H (History/Replace)
        if (key === 'h') {
          e.preventDefault();
          return false;
        }
        // Ctrl + D (Bookmark)
        if (key === 'd') {
          e.preventDefault();
          return false;
        }
        // Ctrl + J (Downloads)
        if (key === 'j') {
          e.preventDefault();
          return false;
        }
        // Ctrl + K (Search)
        if (key === 'k') {
          e.preventDefault();
          return false;
        }

        // Ctrl + Shift combinations
        if (isShift) {
          // Ctrl + Shift + I (Inspect Element)
          if (key === 'i') {
            e.preventDefault();
            handleWarning('Ctrl+Shift+I - Inspect');
            return false;
          }
          // Ctrl + Shift + J (Console)
          if (key === 'j') {
            e.preventDefault();
            handleWarning('Ctrl+Shift+J - Console');
            return false;
          }
          // Ctrl + Shift + C (Inspect Element)
          if (key === 'c') {
            e.preventDefault();
            handleWarning('Ctrl+Shift+C - Inspect');
            return false;
          }
          // Ctrl + Shift + K (Console in Firefox)
          if (key === 'k') {
            e.preventDefault();
            handleWarning('Ctrl+Shift+K - Console');
            return false;
          }
          // Ctrl + Shift + M (Mobile view)
          if (key === 'm') {
            e.preventDefault();
            return false;
          }
          // Ctrl + Shift + S (Screenshot)
          if (key === 's') {
            e.preventDefault();
            handleWarning('Ctrl+Shift+S - Screenshot');
            return false;
          }
        }
      }

      // Alt combinations
      if (isAlt) {
        // Alt + Tab detection (window blur handles this, but block anyway)
        if (key === 'tab') {
          e.preventDefault();
          return false;
        }
        // Alt + F4 (Close window)
        if (e.key === 'F4') {
          e.preventDefault();
          handleWarning('Alt+F4 - Close');
          return false;
        }
      }

      // Windows + Shift + S (Windows screenshot)
      if (isShift && key === 's' && (e.metaKey || e.getModifierState('Meta'))) {
        e.preventDefault();
        handleWarning('Win+Shift+S - Screenshot');
        return false;
      }

      // Cmd + Shift + 3/4/5 (Mac screenshot)
      if (e.metaKey && isShift && ['3', '4', '5'].includes(key)) {
        e.preventDefault();
        handleWarning('Cmd+Shift+3/4/5 - Mac Screenshot');
        return false;
      }

      // Escape key - block to prevent closing dialogs
      if (e.key === 'Escape') {
        e.preventDefault();
        return false;
      }
    };

    // ============ BEFORE PRINT (additional protection) ============
    const handleBeforePrint = (e: Event) => {
      e.preventDefault();
      handleWarning('Print attempt');
      return false;
    };

    // ============ ADD ALL EVENT LISTENERS ============
    
    // Mouse events
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('selectstart', handleSelectStart, true);
    document.addEventListener('dragstart', handleDragStart, true);
    
    // Clipboard events
    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('cut', handleCut, true);
    document.addEventListener('paste', handlePaste, true);
    
    // Keyboard events
    document.addEventListener('keydown', handleKeyDown, true);
    
    // Print events
    window.addEventListener('beforeprint', handleBeforePrint);

    // ============ CSS PROTECTIONS ============
    
    // Disable text selection via CSS
    const originalUserSelect = document.body.style.userSelect;
    const originalWebkitUserSelect = document.body.style.webkitUserSelect;
    
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    (document.body.style as any).MozUserSelect = 'none';
    (document.body.style as any).msUserSelect = 'none';

    // Add a style to prevent image dragging
    const styleSheet = document.createElement('style');
    styleSheet.id = 'content-protection-styles';
    styleSheet.textContent = `
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }
      img {
        pointer-events: none !important;
        -webkit-user-drag: none !important;
        -khtml-user-drag: none !important;
        -moz-user-drag: none !important;
        -o-user-drag: none !important;
        user-drag: none !important;
      }
      @media print {
        body { display: none !important; }
      }
    `;
    document.head.appendChild(styleSheet);

    // ============ CLEANUP ============
    return () => {
      // Mouse events
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('selectstart', handleSelectStart, true);
      document.removeEventListener('dragstart', handleDragStart, true);
      
      // Clipboard events
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('cut', handleCut, true);
      document.removeEventListener('paste', handlePaste, true);
      
      // Keyboard events
      document.removeEventListener('keydown', handleKeyDown, true);
      
      // Print events
      window.removeEventListener('beforeprint', handleBeforePrint);

      // Restore original styles
      document.body.style.userSelect = originalUserSelect;
      document.body.style.webkitUserSelect = originalWebkitUserSelect;
      
      // Remove injected style sheet
      const existingStyle = document.getElementById('content-protection-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [handleWarning, isEnabled]);
};

export default useContentProtection;
