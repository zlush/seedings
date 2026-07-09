"use client";

import { useState } from "react";

// Campo de contraseña con botón para mostrar/ocultar (ojito).
export function PasswordInput({
  value,
  onChange,
  placeholder = "Tu contraseña",
  minLength,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minLength?: number;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        required
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={
          className ??
          "w-full rounded-md border border-cream/35 bg-transparent px-4 py-3.5 pr-12 text-cream placeholder:text-cream/40 outline-none transition focus:border-cream"
        }
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/50 hover:text-cream"
      >
        {show ? "🙈" : "👁️"}
      </button>
    </div>
  );
}
