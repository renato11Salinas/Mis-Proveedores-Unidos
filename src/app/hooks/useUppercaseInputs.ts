import { useEffect } from 'react';

export function useUppercaseInputs() {
  useEffect(() => {
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;

      // Only apply to text-based inputs
      const textInputTypes = ['text', 'email', 'tel', 'search'];
      const isTextInput = target.tagName === 'INPUT' && textInputTypes.includes((target as HTMLInputElement).type);
      const isTextarea = target.tagName === 'TEXTAREA';

      if (isTextInput || isTextarea) {
        const start = target.selectionStart;
        const end = target.selectionEnd;

        // Convert to uppercase
        const uppercaseValue = target.value.toUpperCase();

        if (target.value !== uppercaseValue) {
          target.value = uppercaseValue;

          // Restore cursor position
          if (start !== null && end !== null) {
            target.setSelectionRange(start, end);
          }

          // Trigger change event for React controlled components
          const event = new Event('input', { bubbles: true });
          target.dispatchEvent(event);
        }
      }
    };

    // Add event listener to document
    document.addEventListener('input', handleInput, true);

    return () => {
      document.removeEventListener('input', handleInput, true);
    };
  }, []);
}
