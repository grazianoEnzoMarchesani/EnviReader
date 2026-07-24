import { useEffect } from 'react';

// Binds Enter -> onEnter (the modal's primary/blue action) and Escape -> onEscape
// (dismiss) while the modal is open. Pass null/undefined for either to disable it.
export function useModalKeyboard(isOpen, onEnter, onEscape) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && onEnter) {
        e.preventDefault();
        onEnter();
      } else if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onEnter, onEscape]);
}
