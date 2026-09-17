'use client';

import React, { useState } from 'react';
import {
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured,
  isSupabaseOfflineMode,
  saveCustomSupabaseConfig,
  clearCustomSupabaseConfig,
  enableOfflineMode,
  disableOfflineMode,
  testSupabaseConnection,
} from '@/lib/supabaseClient';
import {
  Database,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  RefreshCw,
  Save,
  Trash2,
  Shield,
  HelpCircle,
} from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [url, setUrl] = useState(supabaseUrl || '');
  const [key, setKey] = useState(supabaseAnonKey || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(url, key);
      setTestResult(res);
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Error inesperado al probar conexión.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    let cleanUrl = url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
    if (!cleanUrl || !key.trim()) {
      alert('Por favor ingresa tanto la URL como la Anon Key de Supabase.');
      return;
    }
    saveCustomSupabaseConfig(cleanUrl, key.trim());
    if (onSuccess) onSuccess();
    onClose();
  };

  const handleUseOffline = () => {
    const confirmOffline = window.confirm(
      '¿Deseas activar el Modo Local?\n\nLa aplicación funcionará al 100% utilizando almacenamiento local en el navegador, sin intentar conectar a Supabase ni mostrar carteles de error.'
    );
    if (confirmOffline) {
      enableOfflineMode();
    }
  };

  const handleReset = () => {
    clearCustomSupabaseConfig();
  };

  return (
    <div className="fixed inset-0 bg-[#0B0F17]/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-white/10 relative shadow-2xl">
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-text-muted hover:text-white p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3.5 mb-5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg ${
              isSupabaseOfflineMode
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : isSupabaseConfigured
                ? 'bg-neon-emerald/20 border-neon-green/30 text-neon-green'
                : 'bg-status-error/15 border-status-error/30 text-status-error'
            }`}
          >
            {isSupabaseOfflineMode ? (
              <WifiOff size={24} />
            ) : isSupabaseConfigured ? (
              <Database size={24} />
            ) : (
              <AlertTriangle size={24} />
            )}
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Configuración de Supabase</h3>
            <p className="text-xs text-text-muted">
              {isSupabaseOfflineMode
                ? 'Modo Local (Offline) activo'
                : isSupabaseConfigured
                ? 'Credenciales de base de datos cargadas'
                : 'Base de datos no conectada o con error'}
            </p>
          </div>
        </div>

        {/* Estado actual / Ayuda */}
        <div className="mb-5 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-text-dim flex flex-col gap-2">
          <div className="flex items-start gap-2 text-text-muted">
            <HelpCircle size={15} className="text-neon-green shrink-0 mt-0.5" />
            <span>
              Para conectar tu base de datos de PostgreSQL en Supabase, copia las credenciales desde{' '}
              <strong className="text-white">Project Settings → API</strong> en tu panel de Supabase:
            </span>
          </div>
          <div className="text-[11px] text-text-dim bg-black/40 p-2 rounded-xl border border-white/5 font-mono">
            <div>URL: https://&lt;id-proyecto&gt;.supabase.co</div>
            <div>API Key: anon / public (JWT o sb_publishable_...)</div>
          </div>
        </div>

        {/* Formulario */}
        <div className="flex flex-col gap-4 text-xs">
          <div>
            <label className="text-text-main font-semibold block mb-1.5">
              Supabase Project URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTestResult(null);
              }}
              placeholder="https://xyzproject.supabase.co"
              className="w-full bg-surface/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none font-mono focus:border-neon-green/50 transition-colors"
            />
            <p className="text-[10px] text-text-dim mt-1">
              * No incluyas <code className="text-neon-green">/rest/v1</code> al final.
            </p>
          </div>

          <div>
            <label className="text-text-main font-semibold block mb-1.5">
              Supabase Anon / Publishable Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setTestResult(null);
              }}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              className="w-full bg-surface/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none font-mono focus:border-neon-green/50 transition-colors"
            />
          </div>

          {/* Resultado de la prueba en vivo */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                testResult.success
                  ? 'bg-status-success/15 border-status-success/30 text-status-success'
                  : 'bg-status-error/15 border-status-error/30 text-status-error'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">
                <div className="font-bold">
                  {testResult.success ? 'Conexión Exitosa' : 'Fallo de Conexión'}
                </div>
                <div>{testResult.message}</div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex flex-col gap-2.5 pt-2">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || !url.trim() || !key.trim()}
                className="py-2.5 px-3 rounded-xl bg-surface hover:bg-surface-hover border border-white/10 hover:border-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              >
                <RefreshCw size={14} className={isTesting ? 'animate-spin' : ''} />
                <span>{isTesting ? 'Probando...' : 'Probar Conexión'}</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!url.trim() || !key.trim()}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-neon-emerald to-neon-green hover:brightness-110 text-white font-bold text-xs shadow-neon flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              >
                <Save size={14} />
                <span>Guardar y Aplicar</span>
              </button>
            </div>

            {/* Alternativa: Modo Local Offline */}
            <div className="border-t border-white/10 pt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleUseOffline}
                className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5"
              >
                <WifiOff size={13} />
                <span>Activar Modo Local (Sin Supabase)</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] text-text-dim hover:text-rose-400 transition-colors flex items-center gap-1"
                title="Borrar credenciales guardadas en este navegador"
              >
                <Trash2 size={12} />
                <span>Restablecer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
