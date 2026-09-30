'use client';

import { useEffect, useId, useRef, useState, type InputHTMLAttributes } from 'react';
import type { Lang } from '@/lib/i18n';
import { phoneInputHint, validateAndNormalizePhone } from '@/lib/phone';

type PhoneInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'type' | 'lang'> & {
  value: string;
  lang: Lang;
  showError?: boolean;
};

/** Shared accessible field; rejects invalid input without altering typed/pasted text. */
export function PhoneInput({ value, lang, showError = false, id, required, onChange, onBlur, onInvalid, style, ...props }: PhoneInputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [touched, setTouched] = useState(false);
  const validation = validateAndNormalizePhone(value, lang);
  const message = !required && value === '' ? '' : validation.error || '';
  const error = (touched || showError) ? message : '';

  useEffect(() => {
    inputRef.current?.setCustomValidity(message);
  }, [message]);

  return (
    <>
      <input
        {...props}
        ref={inputRef}
        id={inputId}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required={required}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={[props['aria-describedby'], `${inputId}-help`].filter(Boolean).join(' ')}
        style={{ ...style, ...(error ? { borderColor: '#B42318' } : {}) }}
        onChange={event => {
          const next = validateAndNormalizePhone(event.target.value, lang);
          event.target.setCustomValidity(!required && event.target.value === '' ? '' : next.error || '');
          onChange?.(event);
        }}
        onBlur={event => {
          setTouched(true);
          onBlur?.(event);
        }}
        onInvalid={event => {
          setTouched(true);
          onInvalid?.(event);
        }}
      />
      <p id={`${inputId}-help`} aria-live="polite" className={`mt-1.5 text-[11px] leading-relaxed ${error ? 'text-[#B42318]' : 'text-[#64748B]'}`}>
        {error || phoneInputHint(lang)}
      </p>
    </>
  );
}
