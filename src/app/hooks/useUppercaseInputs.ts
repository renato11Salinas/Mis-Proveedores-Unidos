import { useEffect } from 'react';

/**
 * Convierte a MAYÚSCULAS el valor de los campos de texto.
 *
 * IMPORTANTE: no se modifica el valor mientras el usuario escribe.
 * En Android (Gboard, teclado Xiaomi, etc.) el teclado "compone" cada palabra
 * (sugerencias / autocorrector). Si se reescribe `input.value` en cada tecla,
 * se rompe la composición y React deja de recibir los cambios: el estado se
 * queda con la primera letra y el texto "se borra" al pasar a otro campo.
 *
 * Mientras se escribe, el CSS (`text-transform: uppercase` en theme.css) ya
 * muestra el texto en mayúsculas. El valor real se convierte al salir del campo.
 */

const TEXT_INPUT_TYPES = ['text', 'email', 'tel', 'search'];

function isTextField(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.tagName === 'TEXTAREA') return true;
  return el.tagName === 'INPUT' && TEXT_INPUT_TYPES.includes((el as HTMLInputElement).type);
}

// Asigna el valor usando el setter nativo para que React detecte el cambio
// (asignar `el.value = x` directamente engaña al rastreador de valor de React).
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

export function useUppercaseInputs() {
  useEffect(() => {
    const handleFocusOut = (e: Event) => {
      const target = e.target;
      if (!isTextField(target) || target.readOnly || target.disabled) return;
      const upper = target.value.toUpperCase();
      if (target.value !== upper) setNativeValue(target, upper);
    };

    document.addEventListener('focusout', handleFocusOut, true);
    return () => document.removeEventListener('focusout', handleFocusOut, true);
  }, []);
}
