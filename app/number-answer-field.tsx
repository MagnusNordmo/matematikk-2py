"use client";

import { useRef, type RefObject } from "react";
import { toggleAnswerSign } from "./answer-engine";

export function NumberAnswerField({
  id, label, value, onChange, disabled, placeholder, unit, className, inputRef,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  placeholder: string;
  unit: string | null | undefined;
  className: string;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const localRef = useRef<HTMLInputElement | null>(null);
  const ref = inputRef ?? localRef;
  return (
    <div className="numeric-answer">
      <label htmlFor={id}>{label}</label>
      <div className={className}>
        <input
          id={id}
          ref={ref}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          disabled={disabled}
        />
        {unit && <span className="answer-unit">{unit}</span>}
      </div>
      <details className="answer-sign-help">
        <summary>Mangler minustegn?</summary>
        <button
          type="button"
          className="answer-sign-button"
          aria-label={`Bytt fortegn for ${label.toLocaleLowerCase("nb-NO")}`}
          title="Bytt mellom positivt og negativt tall"
          disabled={disabled}
          onClick={() => {
            onChange(toggleAnswerSign(value));
            ref.current?.focus();
          }}
        >±</button>
      </details>
    </div>
  );
}
