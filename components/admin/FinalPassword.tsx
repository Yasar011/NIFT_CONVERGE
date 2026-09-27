"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { Btn, inputCls } from "./kit";

// Held in memory only for this page visit — never written to storage.
let remembered: string | null = null;

interface Ctx {
  ask: () => Promise<string | null>;
  forget: () => void;
}
const FinalPasswordContext = createContext<Ctx | null>(null);

/** Prompts the main admin once for the final-selection password. */
export function FinalPasswordProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const resolver = useRef<((v: string | null) => void) | null>(null);

  const ask = useCallback(() => {
    if (remembered) return Promise.resolve(remembered);
    setValue("");
    setOpen(true);
    return new Promise<string | null>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const forget = useCallback(() => {
    remembered = null;
  }, []);

  function close(result: string | null) {
    if (result) remembered = result;
    setOpen(false);
    resolver.current?.(result);
    resolver.current = null;
  }

  return (
    <FinalPasswordContext.Provider value={{ ask, forget }}>
      {children}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4" role="dialog" aria-modal="true" aria-labelledby="fp-title">
          <form
            className="w-full max-w-sm border-2 border-ink bg-paper p-6 shadow-[6px_6px_0_var(--ink)]"
            onSubmit={(e) => {
              e.preventDefault();
              close(value || null);
            }}
          >
            <p id="fp-title" className="flex items-center gap-2 font-bold uppercase tracking-wide">
              <Lock size={16} /> Final selection
            </p>
            <p className="mt-2 text-sm text-ink-soft">Enter the main admin&apos;s final-selection password to confirm.</p>
            <input
              autoFocus
              type="password"
              autoComplete="off"
              className={`${inputCls} mt-4`}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-label="Final selection password"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Btn type="button" onClick={() => close(null)}>Cancel</Btn>
              <Btn type="submit" tone="ink" disabled={!value}>Confirm</Btn>
            </div>
          </form>
        </div>
      )}
    </FinalPasswordContext.Provider>
  );
}

export function useFinalPassword() {
  const ctx = useContext(FinalPasswordContext);
  if (!ctx) throw new Error("useFinalPassword needs <FinalPasswordProvider>");
  return ctx;
}
