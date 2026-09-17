'use client';

import React, { useState, useMemo } from 'react';
import { Asistencia, Empleado, Turno } from '@/types/database';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  ShieldCheck,
  AlertTriangle,
  Award,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Sparkles,
  Flame,
  ArrowUpRight,
  PieChart as PieChartIcon,
  ChevronRight,
  Check,
} from 'lucide-react';

interface AdminStatsViewProps {
  asistencias: Asistencia[];
  empleados: Empleado[];
  turnos: Turno[];
}

type PeriodFilter = 'today' | '7days' | '30days' | 'all';

export const AdminStatsView: React.FC<AdminStatsViewProps> = ({
  asistencias,
  empleados,
  turnos,
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('7days');
  const [selectedTurnoId, setSelectedTurnoId] = useState<string>('all');
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<string>('all');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // 1. FILTRADO POR FECHA Y ATRIBUTOS
  const filteredData = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return asistencias.filter((asist) => {
      // Filtro de Fecha
      if (period === 'today') {
        if (asist.fecha !== todayStr) return false;
      } else if (period === '7days') {
        const d = new Date(asist.fecha + 'T00:00:00');
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 7 || diffDays < 0) return false;
      } else if (period === '30days') {
        const d = new Date(asist.fecha + 'T00:00:00');
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 30 || diffDays < 0) return false;
      }

      // Filtro de Turno
      const emp = asist.empleado || empleados.find((e) => e.id === asist.empleado_id);
      if (selectedTurnoId !== 'all') {
        if (!emp || emp.turno_id !== selectedTurnoId) return false;
      }

      // Filtro de Empleado
      if (selectedEmpleadoId !== 'all') {
        if (asist.empleado_id !== selectedEmpleadoId) return false;
      }

      return true;
    });
  }, [asistencias, empleados, period, selectedTurnoId, selectedEmpleadoId]);

  // Función auxiliar para determinar si una asistencia fue tardanza (>10 min tolerancia)
  const isTardanza = (asist: Asistencia): boolean => {
    try {
      const emp = asist.empleado || empleados.find((e) => e.id === asist.empleado_id);
      const turno = emp?.turno || turnos.find((t) => t.id === emp?.turno_id);
      if (!turno || !asist.hora_entrada) return false;

      const horaDate = new Date(asist.hora_entrada);
      const [tHour, tMin] = turno.hora_ingreso.split(':').map(Number);
      const entradaMinutes = horaDate.getHours() * 60 + horaDate.getMinutes();
      const turnoMinutes = tHour * 60 + tMin;
      return entradaMinutes > turnoMinutes + 10;
    } catch {
      return false;
    }
  };

  // 2. CÁLCULO DE KPIS GENERALES
  const kpis = useMemo(() => {
    const total = filteredData.length;
    let puntuales = 0;
    let tardanzas = 0;
    let totalHoras = 0;
    let totalExtras = 0;
    let normales = 0;
    let requierenAprobacion = 0;
    let rechazados = 0;

    filteredData.forEach((a) => {
      if (isTardanza(a)) {
        tardanzas++;
      } else {
        puntuales++;
      }

      if (a.horas_trabajadas) totalHoras += a.horas_trabajadas;
      if (a.horas_extras) totalExtras += a.horas_extras;

      if (a.estado_fichaje === 'Normal') normales++;
      else if (a.estado_fichaje === 'Requiere_Aprobacion') requierenAprobacion++;
      else if (a.estado_fichaje === 'Rechazado') rechazados++;
    });

    const puntualidadTasa = total > 0 ? Math.round((puntuales / total) * 100) : 100;
    const promedioHoras = total > 0 ? (totalHoras / total).toFixed(1) : '0.0';
    const biometriaSeguraTasa = total > 0 ? Math.round((normales / total) * 100) : 100;

    // Empleados únicos activos
    const empIdsUnicos = new Set(filteredData.map((a) => a.empleado_id));

    return {
      totalMarcaciones: total,
      empleadosPresentes: empIdsUnicos.size,
      puntuales,
      tardanzas,
      puntualidadTasa,
      promedioHoras,
      totalExtras: totalExtras.toFixed(1),
      normales,
      requierenAprobacion,
      rechazados,
      biometriaSeguraTasa,
    };
  }, [filteredData, empleados, turnos]);

  // 3. TENDENCIA DIARIA DE ASISTENCIAS Y TARDANZAS (Últimos días según período)
  const dailyTrend = useMemo(() => {
    const daysMap: Record<string, { date: string; puntuales: number; tardanzas: number; total: number }> = {};

    // Agrupar marcaciones por fecha
    filteredData.forEach((a) => {
      const d = a.fecha;
      if (!daysMap[d]) {
        daysMap[d] = { date: d, puntuales: 0, tardanzas: 0, total: 0 };
      }
      daysMap[d].total++;
      if (isTardanza(a)) {
        daysMap[d].tardanzas++;
      } else {
        daysMap[d].puntuales++;
      }
    });

    // Ordenar cronológicamente
    const sorted = Object.values(daysMap).sort((a, b) => a.date.localeCompare(b.date));

    // Si hay menos de 5 días o no hay datos, rellenar los últimos 7 días
    if (sorted.length === 0) {
      const fallback = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const str = d.toISOString().split('T')[0];
        fallback.push({ date: str, puntuales: 0, tardanzas: 0, total: 0 });
      }
      return fallback;
    }

    return sorted.slice(-14); // Mostrar máximo los últimos 14 puntos
  }, [filteredData, empleados, turnos]);

  const maxDayTotal = useMemo(() => {
    return Math.max(...dailyTrend.map((d) => d.total), 1);
  }, [dailyTrend]);

  // 4. MAPA DE HORAS PICO DE INGRESO (Franjas horarias 06:00 a 20:00)
  const hourlyArrivals = useMemo(() => {
    const hoursCount: Record<number, number> = {};
    for (let h = 6; h <= 20; h++) hoursCount[h] = 0;

    filteredData.forEach((a) => {
      if (a.hora_entrada) {
        const h = new Date(a.hora_entrada).getHours();
        if (h >= 6 && h <= 20) {
          hoursCount[h] = (hoursCount[h] || 0) + 1;
        }
      }
    });

    const maxCount = Math.max(...Object.values(hoursCount), 1);

    return Object.entries(hoursCount).map(([hour, count]) => ({
      hour: `${hour.padStart(2, '0')}:00`,
      count,
      percent: Math.round((count / maxCount) * 100),
    }));
  }, [filteredData]);

  // 5. RANKING DE EMPLEADOS (Puntualidad y Tardanzas)
  const employeeRankings = useMemo(() => {
    const stats: Record<
      string,
      {
        empleado: Empleado | undefined;
        total: number;
        puntuales: number;
        tardanzas: number;
        horasExtras: number;
        horasTrabajadas: number;
      }
    > = {};

    filteredData.forEach((a) => {
      const empId = a.empleado_id;
      if (!stats[empId]) {
        const emp = a.empleado || empleados.find((e) => e.id === empId);
        stats[empId] = {
          empleado: emp,
          total: 0,
          puntuales: 0,
          tardanzas: 0,
          horasExtras: 0,
          horasTrabajadas: 0,
        };
      }
      stats[empId].total++;
      if (isTardanza(a)) {
        stats[empId].tardanzas++;
      } else {
        stats[empId].puntuales++;
      }
      if (a.horas_extras) stats[empId].horasExtras += a.horas_extras;
      if (a.horas_trabajadas) stats[empId].horasTrabajadas += a.horas_trabajadas;
    });

    const list = Object.values(stats);

    // Más puntuales (con al menos 1 asistencia)
    const topPuntuales = [...list]
      .filter((x) => x.total > 0)
      .sort((a, b) => {
        const rateA = a.puntuales / a.total;
        const rateB = b.puntuales / b.total;
        if (rateB !== rateA) return rateB - rateA;
        return b.total - a.total;
      })
      .slice(0, 5);

    // Con más tardanzas (para alertar a RRHH)
    const topTardanzas = [...list]
      .filter((x) => x.tardanzas > 0)
      .sort((a, b) => b.tardanzas - a.tardanzas)
      .slice(0, 5);

    // Top horas extras
    const topExtras = [...list]
      .filter((x) => x.horasExtras > 0)
      .sort((a, b) => b.horasExtras - a.horasExtras)
      .slice(0, 5);

    return { topPuntuales, topTardanzas, topExtras };
  }, [filteredData, empleados, turnos]);

  // 6. DISTRIBUCIÓN POR TURNOS
  const turnosDistribution = useMemo(() => {
    const dist: Record<string, { turno: Turno; count: number; tardanzas: number }> = {};

    turnos.forEach((t) => {
      dist[t.id] = { turno: t, count: 0, tardanzas: 0 };
    });

    filteredData.forEach((a) => {
      const emp = a.empleado || empleados.find((e) => e.id === a.empleado_id);
      if (emp?.turno_id && dist[emp.turno_id]) {
        dist[emp.turno_id].count++;
        if (isTardanza(a)) dist[emp.turno_id].tardanzas++;
      }
    });

    return Object.values(dist);
  }, [filteredData, empleados, turnos]);

  // 7. EXPORTACIÓN A CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      alert('No hay datos en el período seleccionado para exportar.');
      return;
    }

    const headers = [
      'Fecha',
      'Empleado',
      'Documento',
      'Turno',
      'Hora Entrada',
      'Hora Salida',
      'Horas Trabajadas',
      'Horas Extras',
      'Puntualidad',
      'Estado Biométrico',
    ];

    const rows = filteredData.map((a) => {
      const emp = a.empleado || empleados.find((e) => e.id === a.empleado_id);
      const turno = emp?.turno || turnos.find((t) => t.id === emp?.turno_id);
      const horaIn = a.hora_entrada ? new Date(a.hora_entrada).toLocaleTimeString('es-AR') : '--';
      const horaOut = a.hora_salida ? new Date(a.hora_salida).toLocaleTimeString('es-AR') : '--';
      const puntualidadStr = isTardanza(a) ? 'Tardanza' : 'A tiempo';

      return [
        `"${a.fecha}"`,
        `"${emp?.nombre_completo || 'Desconocido'}"`,
        `"${emp?.documento || ''}"`,
        `"${turno?.nombre || 'Sin Turno'}"`,
        `"${horaIn}"`,
        `"${horaOut}"`,
        a.horas_trabajadas ?? 0,
        a.horas_extras ?? 0,
        `"${puntualidadStr}"`,
        `"${a.estado_fichaje}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_asistencias_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* HEADER & FILTROS SUPERIORES */}
      <div className="glass-card p-5 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 text-neon-green text-xs font-bold uppercase tracking-wider mb-1">
            <TrendingUp size={15} />
            Métricas de Asistencia & Desempeño
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Estadísticas & Reportes</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Analítica de puntualidad, horas trabajadas y cumplimiento biométrico.
          </p>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Selector de Período */}
          <div className="flex bg-surface/80 p-1 rounded-xl border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                period === 'today' ? 'bg-neon-green text-black shadow-neon' : 'text-text-muted hover:text-white'
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setPeriod('7days')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                period === '7days' ? 'bg-neon-green text-black shadow-neon' : 'text-text-muted hover:text-white'
              }`}
            >
              7 Días
            </button>
            <button
              type="button"
              onClick={() => setPeriod('30days')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                period === '30days' ? 'bg-neon-green text-black shadow-neon' : 'text-text-muted hover:text-white'
              }`}
            >
              30 Días
            </button>
            <button
              type="button"
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                period === 'all' ? 'bg-neon-green text-black shadow-neon' : 'text-text-muted hover:text-white'
              }`}
            >
              Histórico
            </button>
          </div>

          {/* Filtro por Turno */}
          <select
            value={selectedTurnoId}
            onChange={(e) => setSelectedTurnoId(e.target.value)}
            className="bg-surface/90 border border-white/10 text-xs text-white rounded-xl px-3 py-2 outline-none hover:border-neon-green/30 transition-colors"
          >
            <option value="all">Todos los Turnos</option>
            {turnos.map((t) => (
              <option key={t.id} value={t.id}>
                Turno {t.nombre}
              </option>
            ))}
          </select>

          {/* Filtro por Empleado */}
          <select
            value={selectedEmpleadoId}
            onChange={(e) => setSelectedEmpleadoId(e.target.value)}
            className="bg-surface/90 border border-white/10 text-xs text-white rounded-xl px-3 py-2 outline-none hover:border-neon-green/30 transition-colors max-w-[180px] truncate"
          >
            <option value="all">Todos los Empleados</option>
            {empleados.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.nombre_completo}
              </option>
            ))}
          </select>

          {/* Botón de Exportación CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-neon-emerald/20 hover:bg-neon-emerald/30 border border-neon-green/40 text-neon-green transition-all shadow-sm active:scale-95 ml-auto lg:ml-0"
            title="Descargar reporte en formato Excel / CSV"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* TARJETAS PRINCIPALES DE KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Fichajes / Presentismo */}
        <div className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-dim text-xs font-semibold">
            <span>Marcaciones</span>
            <div className="w-8 h-8 rounded-lg bg-neon-green/15 flex items-center justify-center text-neon-green">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white">{kpis.totalMarcaciones}</div>
            <div className="text-[11px] text-neon-green flex items-center gap-1 mt-0.5 font-medium">
              <CheckCircle2 size={12} /> {kpis.empleadosPresentes} empleados únicos
            </div>
          </div>
        </div>

        {/* Tasa de Puntualidad */}
        <div className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-dim text-xs font-semibold">
            <span>Índice Puntualidad</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                kpis.puntualidadTasa >= 85
                  ? 'bg-status-success/20 text-status-success'
                  : 'bg-status-warning/20 text-status-warning'
              }`}
            >
              <Award size={16} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white">{kpis.puntualidadTasa}%</div>
            <div className="text-[11px] text-text-muted mt-0.5">
              <span className="text-status-success font-bold">{kpis.puntuales} a tiempo</span> ·{' '}
              <span className="text-status-error font-bold">{kpis.tardanzas} tarde</span>
            </div>
          </div>
        </div>

        {/* Promedio Horas por Jornada */}
        <div className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-dim text-xs font-semibold">
            <span>Jornada Promedio</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-400">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white">{kpis.promedioHoras} hs</div>
            <div className="text-[11px] text-text-dim mt-0.5">Por marcación registrada</div>
          </div>
        </div>

        {/* Horas Extras Acumuladas */}
        <div className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-dim text-xs font-semibold">
            <span>Horas Extras</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
              <Flame size={16} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white">{kpis.totalExtras} hs</div>
            <div className="text-[11px] text-text-dim mt-0.5">En el rango seleccionado</div>
          </div>
        </div>

        {/* Cumplimiento Biométrico */}
        <div className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-dim text-xs font-semibold">
            <span>Seguridad Facial</span>
            <div className="w-8 h-8 rounded-lg bg-neon-emerald/15 flex items-center justify-center text-neon-emerald">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white">{kpis.biometriaSeguraTasa}%</div>
            <div className="text-[11px] text-text-muted mt-0.5">
              {kpis.requierenAprobacion > 0 ? (
                <span className="text-status-warning font-bold">
                  {kpis.requierenAprobacion} req. aprobación
                </span>
              ) : (
                <span className="text-neon-green">100% verificado sin incidentes</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE GRÁFICOS INTERACTIVOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRÁFICO 1: TENDENCIA DIARIA (BARRAS SVG APILADAS) */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 size={18} className="text-neon-green" />
                Asistencias vs Tardanzas Diarias
              </h3>
              <p className="text-xs text-text-dim mt-0.5">
                Volumen diario discriminado por puntualidad (últimas fechas registradas)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-neon-green" />
                A tiempo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                Tardanzas
              </span>
            </div>
          </div>

          {/* Área del Gráfico de Barras */}
          <div className="h-60 w-full flex items-end gap-2 sm:gap-3 pt-6 pb-2 border-b border-white/10 relative">
            {dailyTrend.map((d, index) => {
              const puntualHeight = d.total > 0 ? (d.puntuales / maxDayTotal) * 100 : 0;
              const tardanzaHeight = d.total > 0 ? (d.tardanzas / maxDayTotal) * 100 : 0;
              const isHovered = hoveredBarIndex === index;

              return (
                <div
                  key={d.date}
                  onMouseEnter={() => setHoveredBarIndex(index)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                >
                  {/* Tooltip flotante */}
                  {isHovered && (
                    <div className="absolute -top-14 bg-surface-hover/95 backdrop-blur-md border border-neon-green/40 p-2 rounded-xl shadow-2xl z-20 whitespace-nowrap text-[11px] pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                      <div className="font-bold text-white mb-0.5">{d.date}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-neon-green font-bold">{d.puntuales} a tiempo</span>
                        <span className="text-amber-400 font-bold">{d.tardanzas} tarde</span>
                      </div>
                    </div>
                  )}

                  {/* Barras Apiladas */}
                  <div className="w-full max-w-[28px] flex flex-col items-center justify-end rounded-t-md overflow-hidden transition-all duration-300 group-hover:brightness-125">
                    {/* Barra de Tardanzas (Arriba) */}
                    {d.tardanzas > 0 && (
                      <div
                        style={{ height: `${Math.max(tardanzaHeight, 6)}%` }}
                        className="w-full bg-amber-400/90 hover:bg-amber-400 transition-all rounded-t-sm"
                      />
                    )}
                    {/* Barra de Puntuales (Abajo) */}
                    {d.puntuales > 0 && (
                      <div
                        style={{ height: `${Math.max(puntualHeight, 6)}%` }}
                        className="w-full bg-neon-green/80 hover:bg-neon-green shadow-neon transition-all"
                      />
                    )}
                    {d.total === 0 && (
                      <div className="w-full h-1 bg-white/10 rounded-full" />
                    )}
                  </div>

                  {/* Etiqueta de Fecha */}
                  <span className="text-[10px] text-text-dim mt-2 tracking-tight truncate max-w-full font-mono">
                    {d.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-text-dim mt-3">
            <span>Pasa el cursor sobre las barras para ver detalles</span>
            <span className="text-neon-green font-semibold">Pico máximo: {maxDayTotal} fichajes/día</span>
          </div>
        </div>

        {/* GRÁFICO 2: SEGURIDAD BIOMÉTRICA (DONUT SVG) */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PieChartIcon size={18} className="text-neon-emerald" />
              Validación Biométrica
            </h3>
            <p className="text-xs text-text-dim mt-0.5">
              Estado de las capturas faciales y coincidencias
            </p>
          </div>

          {/* Gráfico Circular SVG */}
          <div className="flex items-center justify-center my-4 relative">
            <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
              {/* Fondo del círculo */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.07)"
                strokeWidth="12"
              />
              {/* Segmento Normal (Verde) */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#22c55e"
                strokeWidth="12"
                strokeDasharray={`${(kpis.normales / (kpis.totalMarcaciones || 1)) * 251.2} 251.2`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
              {/* Segmento Requiere Aprobación (Amarillo) */}
              {kpis.requierenAprobacion > 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#f59e0b"
                  strokeWidth="12"
                  strokeDasharray={`${(kpis.requierenAprobacion / (kpis.totalMarcaciones || 1)) * 251.2} 251.2`}
                  strokeDashoffset={`-${(kpis.normales / (kpis.totalMarcaciones || 1)) * 251.2}`}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              )}
            </svg>

            {/* Texto central del Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-white">{kpis.biometriaSeguraTasa}%</span>
              <span className="text-[10px] text-text-dim font-semibold uppercase tracking-wider">
                Normales
              </span>
            </div>
          </div>

          {/* Leyenda del Donut */}
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-neon-green" />
                Normales (Match facial)
              </span>
              <span className="font-bold text-white">{kpis.normales}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                Requiere Aprobación
              </span>
              <span className={`font-bold ${kpis.requierenAprobacion > 0 ? 'text-amber-400' : 'text-white'}`}>
                {kpis.requierenAprobacion}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Rechazados por Seguridad
              </span>
              <span className="font-bold text-white">{kpis.rechazados}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN SECUNDARIA: HORAS PICO Y COMPARATIVA POR TURNOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HISTOGRAMA DE HORAS PICO */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
          <div className="mb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock size={18} className="text-neon-green" />
              Horas Pico de Llegada
            </h3>
            <p className="text-xs text-text-dim mt-0.5">
              Distribución de ingresos por franja horaria durante el período
            </p>
          </div>

          <div className="flex flex-col gap-2 my-2">
            {hourlyArrivals.map((slot) => (
              <div key={slot.hour} className="flex items-center gap-3 text-xs">
                <span className="w-12 text-text-dim font-mono text-[11px]">{slot.hour}</span>
                <div className="flex-1 h-3.5 bg-white/5 rounded-full overflow-hidden p-0.5">
                  <div
                    style={{ width: `${slot.percent}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      slot.count > 0 ? 'bg-gradient-to-r from-neon-emerald to-neon-green' : ''
                    }`}
                  />
                </div>
                <span className="w-8 text-right font-bold text-text-main text-[11px]">
                  {slot.count}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-text-dim text-right mt-2">
            * Se destacan los horarios de mayor afluencia en los accesos
          </p>
        </div>

        {/* COMPARATIVA Y RENDIMIENTO POR TURNO */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
          <div className="mb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users size={18} className="text-blue-400" />
              Desempeño por Turno Laboral
            </h3>
            <p className="text-xs text-text-dim mt-0.5">
              Volumen de asistencias y porcentaje de puntualidad por turno
            </p>
          </div>

          <div className="flex flex-col gap-3.5 my-2">
            {turnosDistribution.map((td) => {
              const puntualTasaTurno =
                td.count > 0 ? Math.round(((td.count - td.tardanzas) / td.count) * 100) : 100;

              return (
                <div key={td.turno.id} className="p-3.5 rounded-xl bg-surface/80 border border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="font-bold text-sm text-white">{td.turno.nombre}</span>
                      <span className="text-xs text-text-dim font-mono ml-2">
                        ({td.turno.hora_ingreso} - {td.turno.hora_salida})
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        puntualTasaTurno >= 85
                          ? 'bg-neon-emerald/20 text-neon-green border border-neon-green/30'
                          : 'bg-status-warning/20 text-status-warning border border-status-warning/30'
                      }`}
                    >
                      {puntualTasaTurno}% puntual
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-text-muted mt-2">
                    <span>{td.count} marcaciones totales</span>
                    <span className="text-amber-400">{td.tardanzas} tardanzas</span>
                  </div>

                  {/* Barra de progreso de puntualidad */}
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mt-2">
                    <div
                      style={{ width: `${puntualTasaTurno}%` }}
                      className="h-full bg-gradient-to-r from-neon-emerald to-neon-green rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-text-muted flex items-center gap-2">
            <Sparkles size={16} className="text-neon-green shrink-0" />
            <span>
              Configura límites de horas extras y tolerancias en la pestaña{' '}
              <strong className="text-white">Turnos Laborales</strong>.
            </span>
          </div>
        </div>
      </div>

      {/* RANKINGS DE PERSONAL (CUADRO DE HONOR Y ALERTAS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CUADRO DE HONOR - MEJOR PUNTUALIDAD */}
        <div className="glass-card p-5 rounded-2xl border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Award size={18} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Cuadro de Honor (Puntualidad)
            </h3>
          </div>
          <p className="text-xs text-text-dim mb-3">
            Empleados con asistencia constante y mejor puntualidad
          </p>

          <div className="flex flex-col gap-2">
            {employeeRankings.topPuntuales.length === 0 ? (
              <div className="text-xs text-text-dim p-4 text-center">Sin registros suficientes</div>
            ) : (
              employeeRankings.topPuntuales.map((item, idx) => {
                const medals = ['🥇', '🥈', '🥉', '⭐', '⭐'];
                const rate = Math.round((item.puntuales / item.total) * 100);

                return (
                  <div
                    key={item.empleado?.id || idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-surface/70 hover:bg-surface border border-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{medals[idx]}</span>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-white truncate">
                          {item.empleado?.nombre_completo || 'Empleado'}
                        </div>
                        <div className="text-[10px] text-text-dim">
                          {item.puntuales} asistencias a tiempo
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-neon-green font-mono shrink-0 ml-2">
                      {rate}%
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ALERTA DE TARDANZAS REINCIDENTES */}
        <div className="glass-card p-5 rounded-2xl border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-status-warning" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Alerta de Tardanzas (RRHH)
            </h3>
          </div>
          <p className="text-xs text-text-dim mb-3">
            Mayor reincidencia de ingresos fuera de horario
          </p>

          <div className="flex flex-col gap-2">
            {employeeRankings.topTardanzas.length === 0 ? (
              <div className="text-xs text-neon-green p-4 text-center flex flex-col items-center gap-1">
                <CheckCircle2 size={20} />
                <span>Excelente: ¡Cero tardanzas en este período!</span>
              </div>
            ) : (
              employeeRankings.topTardanzas.map((item, idx) => (
                <div
                  key={item.empleado?.id || idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-status-warning/10 border border-status-warning/20"
                >
                  <div className="truncate min-w-0">
                    <div className="font-semibold text-xs text-white truncate">
                      {item.empleado?.nombre_completo || 'Empleado'}
                    </div>
                    <div className="text-[10px] text-text-dim">
                      DNI: {item.empleado?.documento || '--'}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-status-warning px-2 py-0.5 rounded-md bg-status-warning/20 shrink-0 ml-2">
                    {item.tardanzas} tarde
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MAYORES HORAS EXTRAS */}
        <div className="glass-card p-5 rounded-2xl border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Flame size={18} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Horas Extras Acumuladas
            </h3>
          </div>
          <p className="text-xs text-text-dim mb-3">
            Empleados con mayor cantidad de tiempo suplementario
          </p>

          <div className="flex flex-col gap-2">
            {employeeRankings.topExtras.length === 0 ? (
              <div className="text-xs text-text-dim p-4 text-center">
                Sin horas extras en este período
              </div>
            ) : (
              employeeRankings.topExtras.map((item, idx) => (
                <div
                  key={item.empleado?.id || idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-surface/70 border border-white/5"
                >
                  <div className="truncate min-w-0">
                    <div className="font-semibold text-xs text-white truncate">
                      {item.empleado?.nombre_completo || 'Empleado'}
                    </div>
                    <div className="text-[10px] text-text-dim">
                      {item.horasTrabajadas.toFixed(1)} hs totales
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-400 px-2 py-0.5 rounded-md bg-amber-400/15 shrink-0 ml-2 font-mono">
                    +{item.horasExtras.toFixed(1)} hs
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
