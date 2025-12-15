import { useEffect } from 'react';
import { toast } from 'sonner';

const showWarning = () => {
  toast.error("Eeiits, ingat dosa!!!", {
    duration: 3000,
    position: 'top-center',
  });
};

export const useContentProtection = () => {
  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      showWarning();
      return false;
    };

    // Disable text selection
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Disable copy
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      showWarning();
      return false;
    };

    // Disable cut
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      showWarning();
      return false;
    };

    // Disable keyboard shortcuts for copy/paste/print/save/screenshot
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        showWarning();
        // Clear clipboard
        navigator.clipboard.writeText('').catch(() => {});
        return false;
      }
      // Ctrl/Cmd + C (Copy)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        showWarning();
        return false;
      }
      // Ctrl/Cmd + V (Paste)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        showWarning();
        return false;
      }
      // Ctrl/Cmd + X (Cut)
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        showWarning();
        return false;
      }
      // Ctrl/Cmd + P (Print)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        showWarning();
        return false;
      }
      // Ctrl/Cmd + S (Save)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        showWarning();
        return false;
      }
      // Ctrl/Cmd + A (Select All)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        showWarning();
        return false;
      }
      // F12 (Developer Tools)
      if (e.key === 'F12') {
        e.preventDefault();
        showWarning();
        return false;
      }
      // Ctrl/Cmd + Shift + I (Developer Tools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        showWarning();
        return false;
      }
      // Ctrl/Cmd + Shift + J (Console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        showWarning();
        return false;
      }
      // Ctrl/Cmd + U (View Source)
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        showWarning();
        return false;
      }
      // Windows + Shift + S (Windows screenshot)
      if (e.shiftKey && e.key === 'S' && (e.metaKey || e.getModifierState('Meta'))) {
        e.preventDefault();
        showWarning();
        return false;
      }
      // Cmd + Shift + 3/4/5 (Mac screenshot)
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        showWarning();
        return false;
      }
    };

    // Disable drag
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('dragstart', handleDragStart);

    // Apply CSS styles to disable text selection
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('dragstart', handleDragStart);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, []);
};
