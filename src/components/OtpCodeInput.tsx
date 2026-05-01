import React, { useEffect, useMemo, useRef } from 'react';
import { cn } from '../lib/utils';

type Props = {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  disabled?: boolean;
  className?: string;
};

function onlyDigits(s: string) {
  return (s || '').replace(/\D/g, '');
}

export function OtpCodeInput({ value, onChange, length = 6, disabled, className }: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = useMemo(() => {
    const v = onlyDigits(value).slice(0, length);
    return Array.from({ length }, (_, i) => v[i] || '');
  }, [length, value]);

  useEffect(() => {
    refs.current = refs.current.slice(0, length);
  }, [length]);

  const setAt = (idx: number, d: string) => {
    const next = digits.map((x, i) => (i === idx ? d : x)).join('');
    onChange(next);
  };

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {digits.map((d, idx) => (
        <input
          key={idx}
          ref={(el) => {
            refs.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={idx === 0 ? 'one-time-code' : 'off'}
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          className={cn(
            'w-12 h-12 rounded-xl border border-border bg-white/70 text-center text-lg font-extrabold text-navy outline-none',
            'focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all',
            disabled && 'opacity-60 cursor-not-allowed',
          )}
          aria-label={`OTP digit ${idx + 1}`}
          value={d}
          onChange={(e) => {
            const next = onlyDigits(e.target.value).slice(-1);
            setAt(idx, next);
            if (next && idx < length - 1) refs.current[idx + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              if (digits[idx]) {
                setAt(idx, '');
              } else if (idx > 0) {
                refs.current[idx - 1]?.focus();
                setAt(idx - 1, '');
              }
            }
            if (e.key === 'ArrowLeft' && idx > 0) refs.current[idx - 1]?.focus();
            if (e.key === 'ArrowRight' && idx < length - 1) refs.current[idx + 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = onlyDigits(e.clipboardData.getData('text')).slice(0, length);
            if (!pasted) return;
            onChange(pasted);
            const nextIndex = Math.min(pasted.length, length - 1);
            refs.current[nextIndex]?.focus();
          }}
        />
      ))}
    </div>
  );
}

