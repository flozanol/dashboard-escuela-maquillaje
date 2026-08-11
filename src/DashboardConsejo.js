import React, { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Building, Target, TrendingUp, TrendingDown, Globe, Award, Calendar, CheckSquare, Square, Zap, Activity, Users, ExternalLink, Wallet, AlertTriangle, Clock } from 'lucide-react';

// Colores institucionales IDIP
const IDIP_GREEN = "#86C332";
const IDIP_GRAY = "#6D6E71";
const IDIP_LIGHT_GRAY = "#F1F1F2";
const COLOR_RED = "#EF4444";
const COLOR_YELLOW = "#F59E0B";

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  
  const str = String(value).trim();
  const isNegative = str.startsWith('(') && str.endsWith(')');
  const cleaned = str.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  
  if (isNaN(num)) return 0;
  return isNegative ? -Math.abs(num) : num;
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  let str = dateStr.toString().trim();
  if (!str) return null;
  
  // Manejo de seriales numéricos de Excel en UTC para evitar desfases de zona horaria
  if (!isNaN(str) && str.length < 10) {
    const numDays = parseFloat(str);
    const utcDays = Math.floor(numDays - 25569);
    const date = new Date(utcDays * 86400000);
    if (isNaN(date.getTime())) return str;
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  
  str = str.replace(/\//g, '-');
  
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
  
  const parts = str.split('-');
  if (parts.length === 3) {
    if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  if (parts.length === 2 && parts[1].length === 4) {
    return `${parts[1]}-${parts[0].padStart(2, '0')}-01`;
  }
  
  const lower = str.toLowerCase();
  const monthMap = { 'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12' };
  for (let m in monthMap) {
    if (lower.includes(m)) {
      const yearMatch = lower.match(/\b(202\d)\b/);
      const yyyy = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
      return `${yyyy}-${monthMap[m]}-01`;
    }
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  
  return str;
}

async function fetchAllData() {
  try {
    const apiKey = process.env.REACT_APP_GSHEETS_API_KEY;
    const spreadsheetId = '1DHt8N8bEPElP4Stu1m2Wwb2brO3rLKOSuM8y_Ca3nVg';
    const ranges = ['Ventas Consolidadas!A:I', 'Objetivos!A:D', 'Registros 2026!A:K', 'Registros 2026 Qro!A:T', 'INSCRITOS!A:F'];
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?key=${apiKey}&` + ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google Sheets API Error: ${res.statusText}`);
    
    const data = await res.json();
    return {
      ventas: data.valueRanges?.[0]?.values || [],
      objetivos: data.valueRanges?.[1]?.values || [],
      registros: data.valueRanges?.[2]?.values || [],
      registrosQro: data.valueRanges?.[3]?.values || [],
      inscritos: data.valueRanges?.[4]?.values || []
    };
  } catch (error) {
    console.error("Error cargando los datos de Google Sheets:", error);
    return { ventas: [], objetivos: [], registros: [], registrosQro: [], inscritos: [] };
  }
}

function processVentas(rows) {
  const initializeData = () => ({ ventas: 0, cursos: 0, escuelas: {}, porMes: {}, porAno: {} });
  const data = { CDMX: initializeData(), QRO: initializeData(), ONLINE: initializeData() };

  if (!rows || rows.length < 2) return { cdmx: data.CDMX, qro: data.QRO, online: data.ONLINE };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || !row[1]) continue;

    let fecha = normalizeDate(row[0]);
    if (!fecha) continue;

    const mes = fecha.substring(0, 7);
    const ano = fecha.substring(0, 4);
    const mesNum = fecha.substring(5, 7);
    const sedeRaw = (row[8] || '').toString().trim().toUpperCase();

    let sede = null;
    if (sedeRaw === 'ONLINE') sede = 'ONLINE';
    else if (['QUERETARO', 'QRO'].includes(sedeRaw)) sede = 'QRO';
    else if (['POLANCO', 'CDMX', 'MEXICO'].includes(sedeRaw)) sede = 'CDMX';

    if (sede) {
      const v = parseNumber(row[4]);
      const c = parseNumber(row[5]) || 1;
      const esc = row[1];

      data[sede].ventas += v;
      data[sede].cursos += c;

      if (!data[sede].escuelas[esc]) data[sede].escuelas[esc] = { ventas: 0, cursos: 0 };
      data[sede].escuelas[esc].ventas += v;
      data[sede].escuelas[esc].cursos += c;

      if (!data[sede].porMes[mes]) data[sede].porMes[mes] = { ventas: 0, cursos: 0 };
      data[sede].porMes[mes].ventas += v;
      data[sede].porMes[mes].cursos += c;

      if (!data[sede].porAno[ano]) data[sede].porAno[ano] = {};
      if (!data[sede].porAno[ano][mesNum]) data[sede].porAno[ano][mesNum] = { ventas: 0, cursos: 0 };
      data[sede].porAno[ano][mesNum].ventas += v;
      data[sede].porAno[ano][mesNum].cursos += c;
    }
  }

  return { cdmx: data.CDMX, qro: data.QRO, online: data.ONLINE };
}

function processPolancoIngresos(rows) {
  const result = { total: 0, porMes: {}, porConcepto: {}, porFormaPago: {}, registros: [] };
  if (!rows || rows.length < 2) return result;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    let fechaRaw = row[0];
    const beneficiario = (row[1] || '').toString().trim();
    const concepto = (row[2] || 'SIN CONCEPTO').toString().trim().toUpperCase();
    const ingreso = parseNumber(row[3]);
    const formaPago = (row[5] || 'SIN ESPECIFICAR').toString().trim().toUpperCase();

    let fecha = normalizeDate(fechaRaw);
    if (!fecha || ingreso <= 0) continue;

    const mes = fecha.substring(0, 7);
    result.total += ingreso;

    if (!result.porMes[mes]) result.porMes[mes] = { total: 0, registros: 0 };
    result.porMes[mes].total += ingreso;
    result.porMes[mes].registros += 1;

    if (!result.porConcepto[concepto]) result.porConcepto[concepto] = 0;
    result.porConcepto[concepto] += ingreso;

    if (!result.porFormaPago[formaPago]) result.porFormaPago[formaPago] = 0;
    result.porFormaPago[formaPago] += ingreso;

    result.registros.push({ fecha, beneficiario, concepto, ingreso, formaPago });
  }

  return result;
}

function processQroIngresos(rows) {
  const result = { total: 0, porMes: {}, porConcepto: {}, porFormaPago: {}, registros: [] };
  if (!rows || rows.length < 2) return result;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    let fechaRaw = row[0];
    const beneficiario = (row[1] || '').toString().trim();
    const concepto = (row[2] || 'SIN CONCEPTO').toString().trim().toUpperCase();
    const ingreso = parseNumber(row[8]);
    const formaPago = (row[10] || 'SIN ESPECIFICAR').toString().trim().toUpperCase();
    const campus = (row[19] || '').toString().trim().toUpperCase();

    let fecha = normalizeDate(fechaRaw);
    if (!fecha || ingreso <= 0) continue;

    const mes = fecha.substring(0, 7);
    result.total += ingreso;

    if (!result.porMes[mes]) result.porMes[mes] = { total: 0, registros: 0 };
    result.porMes[mes].total += ingreso;
    result.porMes[mes].registros += 1;

    if (!result.porConcepto[concepto]) result.porConcepto[concepto] = 0;
    result.porConcepto[concepto] += ingreso;

    if (!result.porFormaPago[formaPago]) result.porFormaPago[formaPago] = 0;
    result.porFormaPago[formaPago] += ingreso;

    result.registros.push({ fecha, beneficiario, concepto, ingreso, formaPago, campus });
  }

  return result;
}

function processInscritos(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return [];

  return rows
    .slice(1)
    .filter(row => Array.isArray(row) && String(row[0] ?? '').trim() !== '')
    .map((row, index) => {
      const inscritos = parseNumber(row[4]);
      const cupo = parseNumber(row[5]);
      const disponibles = cupo - inscritos;
      const ocupacion = cupo > 0 ? (inscritos / cupo) * 100 : 0;

      let fechaInicio = 'POR DEFINIR';
      if (row[1]) {
        const norm = normalizeDate(row[1]);
        fechaInicio = norm ? norm : String(row[1]).trim();
      }

      const horarioRaw = String(row[2] ?? '').trim().toUpperCase();

      return {
        id: `${String(row[0] ?? 'curso').trim()}-${index}`,
        curso: String(row[0] ?? '').trim(),
        fechaInicio,
        horario: horarioRaw || 'GENERAL',
        sede: String(row[3] ?? '').trim().toUpperCase() || 'SIN SEDE',
        inscritos,
        cupo,
        disponibles,
        ocupacion
      };
    });
}

function getStatusInscritos(ocupacion, cupo) {
  if (cupo <= 0) return { label: 'Sin cupo', className: 'bg-gray-100 text-gray-600', color: IDIP_GRAY };
  if (ocupacion >= 100) return { label: ocupacion > 100 ? 'Sobrecupo' : 'Lleno', className: 'bg-red-100 text-red-700', color: COLOR_RED };
  if (ocupacion >= 80) return { label: 'Casi lleno', className: 'bg-yellow-100 text-yellow-700', color: COLOR_YELLOW };
  if (ocupacion < 40) return { label: 'Baja Ocupación', className: 'bg-rose-100 text-rose-800 font-bold', color: COLOR_RED };
  return { label: 'Disponible', className: 'bg-green-100 text-green-700', color: IDIP_GREEN };
}

function getProgressColor(percent) {
  if (percent >= 100) return IDIP_GREEN;
  if (percent >= 80) return COLOR_YELLOW;
  return COLOR_RED;
}

function MetricCard({ icon: Icon, label, value, color }) {
  return (
    <div className="p-5 rounded-2xl text-white shadow-lg" style={{ backgroundColor: color }}>
      <p className="text-[9px] opacity-80 uppercase font-black tracking-widest">{label}</p>
      <p className="text-2xl font-black mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <Icon size={18} className="mt-2 opacity-80" />
    </div>
  );
}

function CardSede({ titulo, info, color, icon: IconComponent, isCurrentMonthSelected, timeElapsedPercent, dayOfMonth, daysInMonth }) {
  const avanceV = info.obj.ventas > 0 ? (info.actual.ventas / info.obj.ventas * 100) : 0;
  const avanceC = info.obj.cursos > 0 ? (info.actual.cursos / info.obj.cursos * 100) : 0;
  const alcanceAnual = info.ventasAnt > 0 ? (info.actual.ventas / info.ventasAnt * 100) : 0;

  const pace = avanceV - timeElapsedPercent;
  const forecast = dayOfMonth > 0 ? (info.actual.ventas / dayOfMonth) * daysInMonth : 0;
  const forecastPercent = info.obj.ventas > 0 ? (forecast / info.obj.ventas * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg p-5 border-t-4" style={{ borderColor: color }}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <IconComponent size={20} style={{ color: IDIP_GRAY }} />
          <h3 className="font-extrabold uppercase tracking-tight text-sm" style={{ color: IDIP_GRAY }}>{titulo}</h3>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1">
            {info.crecimiento >= 0 ? <TrendingUp size={16} color={IDIP_GREEN} /> : <TrendingDown size={16} color={COLOR_RED} />}
            <span className="text-sm font-bold" style={{ color: info.crecimiento >= 0 ? IDIP_GREEN : COLOR_RED }}>
              {info.crecimiento >= 0 ? '+' : ''}{info.crecimiento.toFixed(1)}%
            </span>
          </div>
          <span className="text-[9px] font-bold text-gray-400">vs {info.anoAnteriorLabel}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-[10px] mb-1 font-bold text-gray-500 uppercase">
            <span>Ventas: ${info.actual.ventas.toLocaleString()}</span>
            <span>Meta: ${info.obj.ventas.toLocaleString()}</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: IDIP_LIGHT_GRAY }}>
            <div className="h-full transition-all duration-700" style={{ width: `${Math.min(avanceV, 100)}%`, backgroundColor: getProgressColor(avanceV) }}></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[10px] mb-1 font-bold text-gray-500 uppercase">
            <div className="flex items-center gap-1"><Users size={10}/><span>Alumnos: {info.actual.cursos}</span></div>
            <span>Meta: {info.obj.cursos}</span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: IDIP_LIGHT_GRAY }}>
            <div className="h-full transition-all duration-700" style={{ width: `${Math.min(avanceC, 100)}%`, backgroundColor: IDIP_GRAY }}></div>
          </div>
        </div>

        {isCurrentMonthSelected && (
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <Activity size={14} style={{ color: pace >= 0 ? IDIP_GREEN : COLOR_RED }} />
                <span className="text-[10px] font-black text-gray-600 uppercase">Ritmo (Pace)</span>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${pace >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {pace >= 0 ? 'A Tiempo' : 'Critico'} ({pace >= 0 ? '+' : ''}{pace.toFixed(1)}%)
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <Zap size={14} className="text-yellow-500" />
                <span className="text-[10px] font-black text-gray-600 uppercase">Pronostico</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-gray-800">${Math.round(forecast).toLocaleString()}</p>
                <p className="text-[9px] font-bold text-gray-400">Proj: {forecastPercent.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
          <span className="text-[9px] font-bold text-gray-400 uppercase">Alcance vs Ano Anterior</span>
          <div className="text-right">
            <p className="text-[9px] font-bold" style={{ color: alcanceAnual >= 100 ? IDIP_GREEN : IDIP_GRAY }}>
              {alcanceAnual.toFixed(1)}% Logrado
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InscritosSection({ rows = [] }) {
  const [selectedSede, setSelectedSede] = useState('TODAS');
  const [selectedHorario, setSelectedHorario] = useState('TODOS');
  const [search, setSearch] = useState('');

  const sedes = useMemo(() => {
    const registros = Array.isArray(rows) ? rows : [];
    return ['TODAS', ...new Set(registros.map(item => item.sede).filter(Boolean))];
  }, [rows]);

  const horarios = useMemo(() => {
    const registros = Array.isArray(rows) ? rows : [];
    return ['TODOS', ...new Set(registros.map(item => item.horario).filter(Boolean))];
  }, [rows]);

  const filtered = useMemo(() => {
    const registros = Array.isArray(rows) ? rows : [];
    return registros.filter(item => {
      const matchesSede = selectedSede === 'TODAS' || item.sede === selectedSede;
      const matchesHorario = selectedHorario === 'TODOS' || item.horario === selectedHorario;
      const term = search.trim().toLowerCase();
      const matchesSearch =
        !term ||
        [item.curso, item.sede, item.horario, item.fechaInicio].some(
          value => String(value || '').toLowerCase().includes(term)
        );
      return matchesSede && matchesHorario && matchesSearch;
    });
  }, [rows, selectedSede, selectedHorario, search]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (result, item) => ({
        inscritos: result.inscritos + item.inscritos,
        cupo: result.cupo + item.cupo,
        disponibles: result.disponibles + item.disponibles
      }),
      { inscritos: 0, cupo: 0, disponibles: 0 }
    );
  }, [filtered]);

  const ocupacionGeneral = totals.cupo > 0 ? (totals.inscritos / totals.cupo) * 100 : 0;

  const cursosEnRiesgo = useMemo(() => {
    return filtered.filter(item => item.cupo > 0 && item.ocupacion < 40);
  }, [filtered]);

  const porHorario = useMemo(() => {
    return Object.values(
      filtered.reduce((result, item) => {
        const key = item.horario || 'GENERAL';
        if (!result[key]) {
          result[key] = { horario: key, inscritos: 0, cupo: 0 };
        }
        result[key].inscritos += item.inscritos;
        result[key].cupo += item.cupo;
        return result;
      }, {})
    );
  }, [filtered]);

  const porSede = useMemo(() => {
    return Object.values(
      filtered.reduce((result, item) => {
        if (!result[item.sede]) {
          result[item.sede] = { sede: item.sede, inscritos: 0, cupo: 0 };
        }
        result[item.sede].inscritos += item.inscritos;
        result[item.sede].cupo += item.cupo;
        return result;
      }, {})
    );
  }, [filtered]);

  return (
    <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
        <div className="flex items-center gap-3">
          <Users size={26} color={IDIP_GREEN} />
          <div>
            <h2 className="font-black text-xl uppercase tracking-tight" style={{ color: IDIP_GRAY }}>
              Control de Inscritos y Ocupación
            </h2>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Análisis operativo por grupo, fecha de apertura y turno
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-2 py-1">
            <Building size={14} className="text-gray-400 mr-1" />
            <select
              value={selectedSede}
              onChange={e => setSelectedSede(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-700 outline-none pr-2 py-1 cursor-pointer"
            >
              {sedes.map(s => <option key={s} value={s}>Sede: {s}</option>)}
            </select>
          </div>

          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-2 py-1">
            <Clock size={14} className="text-gray-400 mr-1" />
            <select
              value={selectedHorario}
              onChange={e => setSelectedHorario(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-700 outline-none pr-2 py-1 cursor-pointer"
            >
              {horarios.map(h => <option key={h} value={h}>Turno: {h}</option>)}
            </select>
          </div>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por curso o fecha..."
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-green-500 w-full sm:w-auto"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Users} label="Total Inscritos" value={totals.inscritos} color={IDIP_GRAY} />
        <MetricCard icon={Target} label="Cupo Total Abierto" value={totals.cupo} color={IDIP_GREEN} />
        <MetricCard icon={Building} label="Lugares Disponibles" value={totals.disponibles} color={IDIP_GRAY} />
        <MetricCard
          icon={TrendingUp}
          label="Ocupación Promedio"
          value={`${ocupacionGeneral.toFixed(1)}%`}
          color={getStatusInscritos(ocupacionGeneral, totals.cupo).color}
        />
      </div>

      {cursosEnRiesgo.length > 0 && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-rose-600 w-5 h-5" />
              <h3 className="font-extrabold text-rose-900 text-sm uppercase">
                Alerta de Dirección: {cursosEnRiesgo.length} Grupos con Baja Ocupación (&lt;40%)
              </h3>
            </div>
            <span className="text-[10px] font-bold bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full">
              Atención Inmediata
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {cursosEnRiesgo.slice(0, 6).map(c => (
              <span key={c.id} className="bg-white border border-rose-200 text-rose-900 text-xs px-2.5 py-1 rounded-lg font-medium shadow-sm">
                <strong>{c.curso}</strong> ({c.sede} - {c.horario}) — Inicia: {c.fechaInicio} — 
                <span className="font-bold text-rose-600"> {c.inscritos}/{c.cupo} ({c.ocupacion.toFixed(0)}%)</span>
              </span>
            ))}
            {cursosEnRiesgo.length > 6 && (
              <span className="text-xs text-rose-700 font-bold self-center">
                + {cursosEnRiesgo.length - 6} grupos más
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 min-w-0">
          <h3 className="font-black mb-1 uppercase text-sm tracking-widest text-gray-600">
            Llenado por Turno / Horario
          </h3>
          <p className="text-[10px] text-gray-400 font-bold mb-4">
            Compara la demanda entre Matutino, Vespertino, Sabatino, etc.
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porHorario} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={IDIP_LIGHT_GRAY} />
                <XAxis dataKey="horario" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar name="Inscritos" dataKey="inscritos" fill={IDIP_GREEN} radius={[5, 5, 0, 0]} />
                <Bar name="Cupo Total" dataKey="cupo" fill={IDIP_GRAY} radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 min-w-0">
          <h3 className="font-black mb-1 uppercase text-sm tracking-widest text-gray-600">
            Resumen General por Sede
          </h3>
          <p className="text-[10px] text-gray-400 font-bold mb-4">
            Comparativa consolidada de capacidad entre planteles
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porSede} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={IDIP_LIGHT_GRAY} />
                <XAxis dataKey="sede" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar name="Inscritos" dataKey="inscritos" fill={IDIP_GREEN} radius={[5, 5, 0, 0]} />
                <Bar name="Cupo Total" dataKey="cupo" fill={IDIP_GRAY} radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-black text-sm uppercase tracking-wider text-gray-700">
            Detalle de Grupos Abiertos ({filtered.length})
          </h3>
          <span className="text-xs text-gray-400 font-semibold">
            Mostrando horario y fecha exacta por cada grupo
          </span>
        </div>
        <div className="overflow-x-auto border border-gray-100 rounded-xl">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-500 font-black">
                <th className="p-3">Curso / Taller</th>
                <th className="p-3">Sede</th>
                <th className="p-3">Turno / Horario</th>
                <th className="p-3">Fecha Inicio</th>
                <th className="p-3 text-center">Avance Ocupación</th>
                <th className="p-3 text-right">Inscritos / Cupo</th>
                <th className="p-3 text-right">Lugares Libres</th>
                <th className="p-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(item => {
                const status = getStatusInscritos(item.ocupacion, item.cupo);
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-bold text-gray-800">{item.curso}</td>
                    <td className="p-3 font-semibold text-gray-600">{item.sede}</td>
                    <td className="p-3">
                      <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded font-bold">
                        {item.horario}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600 font-medium">{item.fechaInicio}</td>
                    
                    <td className="p-3 w-36">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(item.ocupacion, 100)}%`,
                              backgroundColor: status.color
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 min-w-[32px]">
                          {item.ocupacion.toFixed(0)}%
                        </span>
                      </div>
                    </td>

                    <td className="p-3 text-right font-bold text-gray-900">
                      {item.inscritos} <span className="text-gray-400 font-normal">/ {item.cupo}</span>
                    </td>
                    <td className={`p-3 text-right font-bold ${item.disponibles < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                      {item.disponibles}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="py-8 text-center text-gray-400 text-xs italic">
              No se encontraron cursos con los filtros seleccionados.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default function DashboardConsejo() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [objetivos, setObjetivos] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedRangeMonths, setSelectedRangeMonths] = useState([]);
  const [polancoData, setPolancoData] = useState(null);
  const [qroData, setQroData] = useState(null);
  const [inscritosData, setInscritosData] = useState([]);

  useEffect(() => {
    fetchAllData().then(res => {
      const processedVentas = processVentas(res.ventas);
      const processedPolanco = processPolancoIngresos(res.registros);
      const processedQro = processQroIngresos(res.registrosQro);
      const processedInscritos = processInscritos(res.inscritos);

      setData(processedVentas);
      setPolancoData(processedPolanco);
      setQroData(processedQro);
      setInscritosData(processedInscritos);

      const objs = {};
      res.objetivos?.forEach(r => {
        if (r[0] && r[1]) {
          objs[`${r[0]}-${r[1].toString().trim().toUpperCase()}`] = {
            ventas: parseNumber(r[2]),
            cursos: parseNumber(r[3])
          };
        }
      });

      setObjetivos(objs);

      const available = [
        ...new Set([
          ...Object.keys(processedVentas.cdmx.porMes),
          ...Object.keys(processedVentas.qro.porMes),
          ...Object.keys(processedVentas.online.porMes)
        ])
      ].sort().reverse();

      if (available.length > 0) {
        if (!available.includes(selectedMonth)) {
          setSelectedMonth(available[0]);
        }
        setSelectedRangeMonths(available.slice(0, 3));
      }
      setLoading(false);
    });
  }, []);

  const mesesDisponibles = useMemo(() => {
    if (!data) return [];
    return [
      ...new Set([
        ...Object.keys(data.cdmx.porMes),
        ...Object.keys(data.qro.porMes),
        ...Object.keys(data.online.porMes)
      ])
    ].sort().reverse();
  }, [data]);

  const toggleMonth = (mes) => {
    setSelectedRangeMonths(prev =>
      prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes]
    );
  };

  const getSedeData = (sedeObj, sedeName, month) => {
    if (!sedeObj) return { actual: { ventas: 0, cursos: 0 }, obj: { ventas: 0, cursos: 0 }, crecimiento: 0, ventasAnt: 0, anoAnteriorLabel: '' };
    
    const actual = sedeObj.porMes[month] || { ventas: 0, cursos: 0 };
    const dateParts = month.split('-');
    const prevYearNum = parseInt(dateParts[0]) - 1;
    const anoAnt = `${prevYearNum}-${dateParts[1]}`;
    const ventasAnt = sedeObj.porMes[anoAnt]?.ventas || 0;
    const obj = objetivos[`${month}-${sedeName}`] || objetivos[`${month}-${sedeName === 'QRO' ? 'QUERETARO' : sedeName}`] || { ventas: 0, cursos: 0 };

    return {
      actual,
      obj,
      crecimiento: ventasAnt > 0 ? ((actual.ventas - ventasAnt) / ventasAnt * 100) : 0,
      ventasAnt,
      anoAnteriorLabel: prevYearNum
    };
  };

  const rangeData = useMemo(() => {
    const totals = { total: 0, cdmx: 0, qro: 0, online: 0 };
    if (!data) return totals;

    selectedRangeMonths.forEach(m => {
      totals.cdmx += data.cdmx.porMes[m]?.ventas || 0;
      totals.qro += data.qro.porMes[m]?.ventas || 0;
      totals.online += data.online.porMes[m]?.ventas || 0;
    });

    totals.total = totals.cdmx + totals.qro + totals.online;
    return totals;
  }, [data, selectedRangeMonths]);

  const now = new Date();
  const currentMonthStr = now.toISOString().substring(0, 7);
  const isCurrentMonthSelected = selectedMonth === currentMonthStr;
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const timeElapsedPercent = (dayOfMonth / daysInMonth) * 100;

  const currentCDMX = useMemo(() => data ? getSedeData(data.cdmx, 'CDMX', selectedMonth) : null, [data, selectedMonth, objetivos]);
  const currentQRO = useMemo(() => data ? getSedeData(data.qro, 'QRO', selectedMonth) : null, [data, selectedMonth, objetivos]);
  const currentOnline = useMemo(() => data ? getSedeData(data.online, 'ONLINE', selectedMonth) : null, [data, selectedMonth, objetivos]);

  const currentPolanco = polancoData?.porMes?.[selectedMonth]?.total || 0;
  const polancoRangeTotal = useMemo(() => selectedRangeMonths.reduce((sum, mes) => sum + (polancoData?.porMes?.[mes]?.total || 0), 0), [selectedRangeMonths, polancoData]);
  const polancoRangeRegs = useMemo(() => selectedRangeMonths.reduce((sum, mes) => sum + (polancoData?.porMes?.[mes]?.registros || 0), 0), [selectedRangeMonths, polancoData]);
  const polancoVsCDMX = rangeData.cdmx > 0 ? (polancoRangeTotal / rangeData.cdmx) * 100 : 0;
  const polancoTicketPromedio = polancoRangeRegs > 0 ? polancoRangeTotal / polancoRangeRegs : 0;

  const polancoTrendData = useMemo(() => {
    return Object.keys(polancoData?.porMes || {})
      .sort()
      .map(mes => ({
        mes: mes.substring(5),
        total: polancoData.porMes[mes].total
      }));
  }, [polancoData]);

  const polancoConceptData = useMemo(() => {
    return Object.entries(polancoData?.porConcepto || {})
      .map(([concepto, total]) => ({ concepto, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [polancoData]);

  const currentQroIngresos = qroData?.porMes?.[selectedMonth]?.total || 0;
  const qroRangeTotal = useMemo(() => selectedRangeMonths.reduce((sum, mes) => sum + (qroData?.porMes?.[mes]?.total || 0), 0), [selectedRangeMonths, qroData]);
  const qroRangeRegs = useMemo(() => selectedRangeMonths.reduce((sum, mes) => sum + (qroData?.porMes?.[mes]?.registros || 0), 0), [selectedRangeMonths, qroData]);
  const qroVsQro = rangeData.qro > 0 ? (qroRangeTotal / rangeData.qro) * 100 : 0;
  const qroTicketPromedio = qroRangeRegs > 0 ? qroRangeTotal / qroRangeRegs : 0;

  const qroTrendData = useMemo(() => {
    return Object.keys(qroData?.porMes || {})
      .sort()
      .map(mes => ({
        mes: mes.substring(5),
        total: qroData.porMes[mes].total
      }));
  }, [qroData]);

  const qroConceptData = useMemo(() => {
    return Object.entries(qroData?.porConcepto || {})
      .map(([concepto, total]) => ({ concepto, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [qroData]);

  const dataGraficas = useMemo(() => {
    if (!data) return [];
    return mesesDisponibles.slice().reverse().map(m => ({
      mes: m.substring(5),
      CDMX: data.cdmx.porMes[m]?.ventas || 0,
      QRO: data.qro.porMes[m]?.ventas || 0,
      Online: data.online.porMes[m]?.ventas || 0,
      CDMX_C: data.cdmx.porMes[m]?.cursos || 0,
      QRO_C: data.qro.porMes[m]?.cursos || 0,
      Online_C: data.online.porMes[m]?.cursos || 0
    }));
  }, [data, mesesDisponibles]);

  const rankingEscuelas = useMemo(() => {
    if (!data) return [];
    return [
      ...Object.entries(data.cdmx.escuelas).map(([n, d]) => ({ n: n + ' (CDMX)', v: d.ventas })),
      ...Object.entries(data.qro.escuelas).map(([n, d]) => ({ n: n + ' (QRO)', v: d.ventas })),
      ...Object.entries(data.online.escuelas).map(([n, d]) => ({ n: n + ' (Online)', v: d.ventas }))
    ].sort((a, b) => b.v - a.v).slice(0, 10);
  }, [data]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-medium italic">Actualizando visión estratégica IDIP...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm gap-4 border-b-2" style={{ borderBottomColor: IDIP_GREEN }}>
          <div className="flex items-center gap-4">
            <img src="https://idip.com.mx/wp-content/uploads/2024/08/logos-IDIP-sin-fondo-1-2.png" alt="IDIP Logo" className="h-12 md:h-16 w-auto" />
            <div className="h-10 w-[1px] bg-gray-200 hidden md:block"></div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight" style={{ color: IDIP_GRAY }}>DIRECCIÓN ESTRATÉGICA</h1>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: IDIP_GREEN }}>IDIP • Business Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://idip-dashboard.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-xs uppercase transition-all hover:shadow-md"
              style={{ borderColor: IDIP_GREEN, color: IDIP_GREEN, backgroundColor: '#f0f9e8' }}
            >
              <ExternalLink size={14} />
              Dashboard Marketing
            </a>
            <div className="flex items-center gap-3 bg-gray-50 p-2 px-4 rounded-xl border border-gray-100">
              <Calendar size={18} style={{ color: IDIP_GRAY }} />
              <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent font-bold outline-none cursor-pointer text-sm" style={{ color: IDIP_GRAY }}>
                {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </header>

        {currentCDMX && currentQRO && currentOnline && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CardSede titulo="CDMX" info={currentCDMX} color={IDIP_GRAY} icon={Building} isCurrentMonthSelected={isCurrentMonthSelected} timeElapsedPercent={timeElapsedPercent} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth} />
            <CardSede titulo="QUERETARO" info={currentQRO} color={IDIP_GREEN} icon={Target} isCurrentMonthSelected={isCurrentMonthSelected} timeElapsedPercent={timeElapsedPercent} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth} />
            <CardSede titulo="ONLINE" info={currentOnline} color={IDIP_GRAY} icon={Globe} isCurrentMonthSelected={isCurrentMonthSelected} timeElapsedPercent={timeElapsedPercent} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth} />
          </div>
        )}

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckSquare size={22} color={IDIP_GREEN} />
              <h2 className="font-black text-lg uppercase tracking-tight" style={{ color: IDIP_GRAY }}>Acumulado Multi-Mes</h2>
            </div>
            <div className="text-[10px] font-bold text-gray-400 uppercase">{selectedRangeMonths.length} meses seleccionados</div>
          </div>

          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 border-b border-gray-50 pb-4">
            {mesesDisponibles.map(mes => (
              <button
                key={mes}
                onClick={() => toggleMonth(mes)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-black uppercase ${selectedRangeMonths.includes(mes) ? "bg-green-50 border-green-200 text-green-700 shadow-sm" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"}`}
              >
                {selectedRangeMonths.includes(mes) ? <CheckSquare size={14} /> : <Square size={14} />} {mes}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-2xl text-white shadow-lg" style={{ backgroundColor: IDIP_GRAY }}>
              <p className="text-[9px] opacity-80 uppercase font-black tracking-widest">Suma Ventas</p>
              <p className="text-2xl font-black mt-1">${rangeData.total.toLocaleString()}</p>
            </div>
            <div className="p-6 rounded-2xl text-white shadow-lg" style={{ backgroundColor: IDIP_GREEN }}>
              <p className="text-[9px] opacity-80 uppercase font-black tracking-widest">Suma CDMX</p>
              <p className="text-2xl font-black mt-1">${rangeData.cdmx.toLocaleString()}</p>
            </div>
            <div className="p-6 rounded-2xl text-white shadow-lg" style={{ backgroundColor: IDIP_GRAY }}>
              <p className="text-[9px] opacity-80 uppercase font-black tracking-widest">Suma QRO</p>
              <p className="text-2xl font-black mt-1">${rangeData.qro.toLocaleString()}</p>
            </div>
            <div className="p-6 rounded-2xl text-white shadow-lg" style={{ backgroundColor: IDIP_GREEN }}>
              <p className="text-[9px] opacity-80 uppercase font-black tracking-widest">Suma Online</p>
              <p className="text-2xl font-black mt-1">${rangeData.online.toLocaleString()}</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-w-0">
            <h3 className="font-black mb-6 uppercase text-sm tracking-widest" style={{ color: IDIP_GRAY }}>Tendencia Historica ($)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataGraficas}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={IDIP_LIGHT_GRAY} />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis tickFormatter={v => `$${v / 1000}k`} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Legend iconType="circle" />
                  <Line name="CDMX" type="monotone" dataKey="CDMX" stroke={IDIP_GRAY} strokeWidth={4} dot={false} />
                  <Line name="QRO" type="monotone" dataKey="QRO" stroke={IDIP_GREEN} strokeWidth={4} dot={false} />
                  <Line name="Online" type="monotone" dataKey="Online" stroke="#A6A8AB" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-w-0">
            <h3 className="font-black mb-6 uppercase text-sm tracking-widest" style={{ color: IDIP_GRAY }}>Inscritos por Sede</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataGraficas}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={IDIP_LIGHT_GRAY} />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip cursor={{ fill: IDIP_LIGHT_GRAY }} contentStyle={{ borderRadius: '15px' }} />
                  <Legend iconType="rect" />
                  <Bar name="CDMX" dataKey="CDMX_C" fill={IDIP_GRAY} radius={[4, 4, 0, 0]} />
                  <Bar name="QRO" dataKey="QRO_C" fill={IDIP_GREEN} radius={[4, 4, 0, 0]} />
                  <Bar name="Online" dataKey="Online_C" fill="#A6A8AB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
              <Wallet size={22} color={IDIP_GREEN} />
              <div>
                <h2 className="font-black text-lg uppercase tracking-tight" style={{ color: IDIP_GRAY }}>Ingresos complementarios Polanco</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: IDIP_GREEN }}>Resumen ejecutivo para Dirección</p>
              </div>
            </div>
            <div className="text-[10px] font-bold text-gray-400 uppercase">Hoja: Registros 2026</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl text-white shadow-lg" style={{ backgroundColor: IDIP_GRAY }}>
              <p className="text-[9px] opacity-80 uppercase font-black tracking-widest">Mes seleccionado</p>
              <p className="text-2xl font-black mt-1">${currentPolanco.toLocaleString()}</p>
            </div>

            <div className="p-5 rounded-2xl text-white shadow-lg" style={{ backgroundColor: IDIP_GREEN }}>
              <p className="text-[9px] opacity-80 uppercase font-black tracking-widest">Acumulado rango</p>
              <p className="text-2xl font-black mt-1">${polancoRangeTotal.toLocaleString()}</p>
            </div>

            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
              <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Participación vs CDMX</p>
              <p className="text-2xl font-black mt-1" style={{ color: IDIP_GRAY }}>{polancoVsCDMX.toFixed(1)}%</p>
            </div>

            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
              <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Ticket promedio</p>
              <p className="text-2xl font-black mt-1" style={{ color: IDIP_GRAY }}>${Math.round(polancoTicketPromedio).toLocaleString()}</p>
              <p className="text-[10px] text-gray-400 font-bold mt-1">{polancoRangeRegs.toLocaleString()} registros</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 min-w-0">
              <h3 className="font-black mb-4 uppercase text-sm tracking-widest" style={{ color: IDIP_GRAY }}>Tendencia mensual</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={polancoTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={IDIP_LIGHT_GRAY} />
                    <XAxis dataKey="mes" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis tickFormatter={v => `$${v / 1000}k`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Ingreso']} />
                    <Line type="monotone" dataKey="total" stroke={IDIP_GREEN} strokeWidth={4} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 min-w-0">
              <h3 className="font-black mb-4 uppercase text-sm tracking-widest" style={{ color: IDIP_GRAY }}>Top conceptos</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={polancoConceptData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={IDIP_LIGHT_GRAY} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="concepto" type="category" tick={{ fontSize: 10, fontWeight: 'bold' }} width={110} />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Ingreso']} />
                    <Bar dataKey="total" fill={IDIP_GRAY} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
              <Wallet size={22} color={IDIP_GREEN} />
              <div>
                <h2 className="font-black text-lg uppercase tracking-tight" style={{ color: IDIP_GRAY }}>Ingresos complementarios Querétaro</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: IDIP_GREEN }}>Resumen ejecutivo para Dirección</p>
              </div>
            </div>
            <div className="text-[10px] font-bold text-gray-400 uppercase">Hoja: Registros 2026 Qro</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl text-white shadow-lg" style={{ backgroundColor: IDIP_GRAY }}>
              <p className="text-[9px] opacity-80 uppercase font-black tracking-widest">Mes seleccionado</p>
              <p className="text-2xl font-black mt-1">${currentQroIngresos.toLocaleString()}</p>
            </div>

            <div className="p-5 rounded-2xl text-white shadow-lg" style={{ backgroundColor: IDIP_GREEN }}>
              <p className="text-[9px] opacity-80 uppercase font-black tracking-widest">Acumulado rango</p>
              <p className="text-2xl font-black mt-1">${qroRangeTotal.toLocaleString()}</p>
            </div>

            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
              <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Participación vs QRO</p>
              <p className="text-2xl font-black mt-1" style={{ color: IDIP_GRAY }}>{qroVsQro.toFixed(1)}%</p>
            </div>

            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
              <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Ticket promedio</p>
              <p className="text-2xl font-black mt-1" style={{ color: IDIP_GRAY }}>${Math.round(qroTicketPromedio).toLocaleString()}</p>
              <p className="text-[10px] text-gray-400 font-bold mt-1">{qroRangeRegs.toLocaleString()} registros</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 min-w-0">
              <h3 className="font-black mb-4 uppercase text-sm tracking-widest" style={{ color: IDIP_GRAY }}>Tendencia mensual</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={qroTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={IDIP_LIGHT_GRAY} />
                    <XAxis dataKey="mes" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis tickFormatter={v => `$${v / 1000}k`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Ingreso']} />
                    <Line type="monotone" dataKey="total" stroke={IDIP_GREEN} strokeWidth={4} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 min-w-0">
              <h3 className="font-black mb-4 uppercase text-sm tracking-widest" style={{ color: IDIP_GRAY }}>Top conceptos</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={qroConceptData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={IDIP_LIGHT_GRAY} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="concepto" type="category" tick={{ fontSize: 10, fontWeight: 'bold' }} width={110} />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Ingreso']} />
                    <Bar dataKey="total" fill={IDIP_GRAY} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        <InscritosSection rows={inscritosData} />

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <Award size={24} color={IDIP_GREEN} />
            <h3 className="font-black uppercase text-sm tracking-widest" style={{ color: IDIP_GRAY }}>Top 10: Ranking Global Escuelas</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rankingEscuelas.map((e, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100 group">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black text-white" style={{ backgroundColor: i < 3 ? IDIP_GREEN : IDIP_GRAY }}>{i + 1}</span>
                  <span className="text-xs font-bold text-gray-600 group-hover:text-black">{e.n}</span>
                </div>
                <span className="font-black text-sm" style={{ color: IDIP_GRAY }}>${e.v.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
