'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Delete, ArrowRight, Keyboard } from 'lucide-react';
import { sounds } from '@/lib/sound';

interface NumpadPadProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export const NumpadPad: React.FC<NumpadPadProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
}) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  // Referencias a los últimos valores para evitar cierres obsoletos en los event listeners
  const valueRef = useRef(value);
  valueRef.current = value;

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const handleDigit = useCallback((digit: string) => {
    if (disabledRef.current || valueRef.current.length >= 15) return;
    sounds.playKeypress();
    onChangeRef.current(valueRef.current + digit);
  }, []);

  const handleBackspace = useCallback(() => {
    if (disabledRef.current || valueRef.current.length === 0) return;
    sounds.playKeypress();
    onChangeRef.current(valueRef.current.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    if (disabledRef.current || valueRef.current.length === 0) return;
    sounds.playKeypress();
    onChangeRef.current('');
  }, []);

  // Soporte para teclado físico y Numpad de la PC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario tiene el foco en un input de texto o elemento editable
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || target?.isContentEditable) {
        return;
      }

      if (disabledRef.current) return;

      let pressedDigit: string | null = null;

      // Detecta números estándar (0-9) y teclas del bloque numérico físico (Numpad0-Numpad9)
      if (e.key >= '0' && e.key <= '9') {
        pressedDigit = e.key;
      } else if (/^Numpad[0-9]$/.test(e.code)) {
        pressedDigit = e.code.replace('Numpad', '');
      }

      if (pressedDigit !== null) {
        e.preventDefault();
        handleDigit(pressedDigit);
        setActiveKey(pressedDigit);
        setTimeout(() => setActiveKey((curr) => (curr === pressedDigit ? null : curr)), 150);
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
        setActiveKey('backspace');
        setTimeout(() => setActiveKey((curr) => (curr === 'backspace' ? null : curr)), 150);
        return;
      }

      if (e.key === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault();
        if (valueRef.current.trim().length > 0) {
          setActiveKey('enter');
          setTimeout(() => setActiveKey((curr) => (curr === 'enter' ? null : curr)), 150);
          onSubmitRef.current();
        }
        return;
      }

      if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        handleClear();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleDigit, handleBackspace, handleClear]);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="flex flex-col gap-3 w-full max-w-[340px]">
      {/* Display Pantalla DNI */}
      <div className="bg-surface/80 border border-neon-emerald/30 rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-inner">
        <span
          className={`font-mono text-xl sm:text-2xl font-bold tracking-widest ${
            value ? 'text-text-main' : 'text-text-dim text-base font-normal tracking-normal'
          }`}
        >
          {value || 'Ingresa DNI / Cédula'}
        </span>

        {value.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-text-muted hover:text-text-main px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Grid del Teclado Táctil */}
      <div className="grid grid-cols-3 gap-2.5">
        {digits.map((digit) => {
          const isDigitActive = activeKey === digit;
          return (
            <button
              key={digit}
              type="button"
              disabled={disabled}
              onClick={() => handleDigit(digit)}
              className={`h-14 sm:h-16 bg-surface/70 hover:bg-surface/90 active:scale-95 border border-white/10 hover:border-neon-green/40 rounded-xl text-white font-mono text-xl font-bold transition-all shadow-md flex items-center justify-center disabled:opacity-50 ${
                isDigitActive ? 'scale-95 bg-neon-emerald/30 border-neon-green text-neon-green shadow-neon' : ''
              }`}
            >
              {digit}
            </button>
          );
        })}

        {/* Tecla Borrar */}
        <button
          type="button"
          disabled={disabled || value.length === 0}
          onClick={handleBackspace}
          className={`h-14 sm:h-16 bg-status-error/10 hover:bg-status-error/20 active:scale-95 border border-status-error/30 rounded-xl text-status-error flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none ${
            activeKey === 'backspace' ? 'scale-95 bg-status-error/30 border-status-error shadow-[0_0_12px_rgba(239,68,68,0.4)]' : ''
          }`}
          title="Borrar dígito (Backspace)"
        >
          <Delete size={22} />
        </button>

        {/* Tecla 0 */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleDigit('0')}
          className={`h-14 sm:h-16 bg-surface/70 hover:bg-surface/90 active:scale-95 border border-white/10 hover:border-neon-green/40 rounded-xl text-white font-mono text-xl font-bold transition-all shadow-md flex items-center justify-center disabled:opacity-50 ${
            activeKey === '0' ? 'scale-95 bg-neon-emerald/30 border-neon-green text-neon-green shadow-neon' : ''
          }`}
        >
          0
        </button>

        {/* Tecla Fichar / Confirmar */}
        <button
          type="button"
          disabled={disabled || value.trim().length === 0}
          onClick={onSubmit}
          className={`h-14 sm:h-16 rounded-xl flex items-center justify-center transition-all text-white font-semibold active:scale-95 ${
            value.trim().length > 0
              ? 'bg-gradient-to-r from-neon-emerald to-neon-green shadow-neon hover:brightness-110'
              : 'bg-surface/40 text-text-dim border border-white/5 opacity-40 cursor-not-allowed'
          } ${activeKey === 'enter' ? 'scale-95 brightness-125 ring-2 ring-neon-green' : ''}`}
          title="Registrar Marcación (Enter)"
        >
          <ArrowRight size={26} />
        </button>
      </div>

      {/* Indicador de soporte de teclado PC / Numpad */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-dim mt-0.5 select-none">
        <Keyboard size={13} className="text-neon-green/70" />
        <span>Teclado físico o numérico habilitado (<kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-text-muted">Enter</kbd> para fichar)</span>
      </div>
    </div>
  );
};
