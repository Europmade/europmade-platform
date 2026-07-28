"use client";

import * as React from "react";
import { cn } from "@europmade/utils";

/**
 * Code Input (OTP) — CMP-040 uit het EuropMade Design System.
 *
 * Gesegmenteerde numerieke code-invoer met auto-doorspringen, terugspringen bij
 * backspace op een leeg vak, en plak-ondersteuning — exact de interacties die
 * components.md (CMP-040) voorschrijft. Eerst toegepast in de Authenticatie-flow
 * (2FA-login-stap, S3-01-05).
 */
export interface CodeInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  legend?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export function CodeInput({
  length = 6,
  value,
  onChange,
  legend = "Verificatiecode",
  disabled,
  autoFocus,
  className,
}: CodeInputProps) {
  const digits = React.useMemo(() => {
    const chars = value.split("").slice(0, length);
    return Array.from({ length }, (_, i) => chars[i] ?? "");
  }, [value, length]);

  const inputRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  const applyChars = (startIndex: number, chars: string[]) => {
    const next = digits.slice();
    const remaining = chars.slice();
    let lastIndex = startIndex;
    for (let i = startIndex; i < length && remaining.length; i++) {
      next[i] = remaining.shift() as string;
      lastIndex = i;
    }
    onChange(next.join(""));
    return lastIndex;
  };

  const handleChange = (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.replace(/[^0-9]/g, "");
    if (!raw) {
      const next = digits.slice();
      next[index] = "";
      onChange(next.join(""));
      return;
    }
    const lastIndex = applyChars(index, raw.split(""));
    const nextIndex = Math.min(lastIndex + 1, length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleKeyDown = (index: number) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (index: number) => (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/[^0-9]/g, "");
    if (!pasted) return;
    event.preventDefault();
    const lastIndex = applyChars(index, pasted.split(""));
    inputRefs.current[Math.min(lastIndex + 1, length - 1)]?.focus();
  };

  return (
    <fieldset className={cn("flex justify-center gap-2", className)} disabled={disabled}>
      <legend className="sr-only">{legend}</legend>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          autoFocus={autoFocus && index === 0}
          value={digit}
          onChange={handleChange(index)}
          onKeyDown={handleKeyDown(index)}
          onPaste={handlePaste(index)}
          aria-label={`Cijfer ${index + 1} van ${length}`}
          className={cn(
            "h-[50px] w-[42px] rounded-md border-[1.5px] text-center text-lg font-bold text-wf-800",
            "focus:outline-none focus:ring-2 focus:ring-wf-900 focus:ring-offset-1",
            digit ? "border-wf-800" : "border-wf-400",
          )}
        />
      ))}
    </fieldset>
  );
}
