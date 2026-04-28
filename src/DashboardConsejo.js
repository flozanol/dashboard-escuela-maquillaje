import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Building, Target, TrendingUp, TrendingDown, Globe, Award, Calendar, CheckSquare, Square, Zap, Activity, Users, ExternalLink, Wallet } from 'lucide-react';

// Colores institucionales IDIP
const IDIP_GREEN = "#86C332";
const IDIP_GRAY = "#6D6E71";
const IDIP_LIGHT_GRAY = "#F1F1F2";
const COLOR_RED = "#EF4444";
const COLOR_YELLOW = "#F59E0B";

function parseNumber(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const num = parseFloat(String(value).replace(/,/g, '').replace(/\$/g, ''));
  return isNaN(num) ? 0 : num;
}

async function fetchAllData() {
  const apiKey = process.env.REACT_APP_GSHEETS_API_KEY;
  const spreadsheetId = '1DHt8N8bEPElP4Stu1m2Wwb2brO3rLKOSuM8y_Ca3nVg';
  const ranges = ['Ventas Consolidadas!A:I', 'Objetivos!A:D', 'Registros 2026!A:K', 'Registros 2026 Qro!A:T'];
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?key=${apiKey}&` + ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
  const res = await fetch(url);
  const data = await res.json();
  return {
    ventas: data.valueRanges[0]?.values || [],
    objetivos: data.valueRanges[1]?.values || [],
    registros: data.valueRanges[2]?.values || [],
    registrosQro: data.valueRanges[3]?.values || []
  };
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  dateStr = dateStr.toString().trim();
  
  if (!isNaN(dateStr) && dateStr.length < 10) {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + parseFloat(dateStr) * 86400000).toISOString().substring(0, 10);
  }
  
  dateStr = dateStr.replace(/\//g, '-');
  
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.substring(0, 10);
  
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  if (parts.length === 2 && parts[1].length === 4) {
    return `${parts[1]}-${parts[0].padStart(2, '0')}-01`;
  }
  
  const lower = dateStr.toLowerCase();
  const monthMap = { 'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12' };
  for (let m in monthMap) {
    if (lower.includes(m)) {
      const yearMatch = lower.match(/\b(202\d)\b/);
      const yyyy = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
      return `${yyyy}-${monthMap[m]}-01`;
    }
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString().substring(0, 10);
  
  return dateStr;
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
    else if (['QUERÉTARO', 'QRO', 'QUERETARO'].includes(sedeRaw)) sede = 'QRO';
    else if (['POLANCO', 'CDMX', 'MÉXICO', 'MEXICO'].includes(sedeRaw)) sede = 'CDMX';

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
  const result = {
    total: 0,
    porMes: {},
    porConcepto: {},
    porFormaPago: {},
    registros: []
  };

  if (!rows || rows.length < 2) return result;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    let fechaRaw = row[0];
    const beneficiario = (row[1] || '').toString().trim();
    const concepto = (row[2] || 'SIN CONCEPTO').toString().trim().toUpperCase();
    const ingreso = parseNumber((row[3] || '').toString().replace(/\$/g, '').replace(/,/g, ''));
    const formaPago = (row[5] || 'SIN ESPECIFICAR').toString().trim().toUpperCase();
    // CAMPUS está en columna K = índice 10 (A=0,B=1,C=2,D=3,E=4,F=5,G=6,H=7,I=8,J=9,K=10)
    const campus = (row[10] || '').toString().trim().toUpperCase();

    let fecha = normalizeDate(fechaRaw);
    if (!fecha || campus !== 'POLANCO' || ingreso <= 0) continue;

    const mes = fecha.substring(0, 7);

    result.total += ingreso;

    if (!result.porMes[mes]) result.porMes[mes] = { total: 0, registros: 0 };
    result.porMes[mes].total += ingreso;
    result.porMes[mes].registros += 1;

    if (!result.porConcepto[concepto]) result.porConcepto[concepto] = 0;
    result.porConcepto[concepto] += ingreso;

    if (!result.porFormaPago[formaPago]) result.porFormaPago[formaPago] = 0;
    result.porFormaPago[formaPago] += ingreso;

    result.registros.push({
      fecha,
      beneficiario,
      concepto,
      ingreso,
      formaPago
    });
  }

  return result;
}

function processQroIngresos(rows) {
  const result = {
    total: 0,
    porMes: {},
    porConcepto: {},
    porFormaPago: {},
    registros: []
  };

  if (!rows || rows.length < 2) return result;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    let fechaRaw = row[0];
    const beneficiario = (row[1] || '').toString().trim();
    const concepto = (row[2] || 'SIN CONCEPTO').toString().trim().toUpperCase();
    // Ingreso en Columna I (índice 8)
    const ingreso = parseNumber((row[8] || '').toString().replace(/\$/g, '').replace(/,/g, ''));
    // Forma de pago en Columna K (índice 10)
    const formaPago = (row[10] || 'SIN ESPECIFICAR').toString().trim().toUpperCase();
    // Campus en Columna T (índice 19)
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

    result.registros.push({
      fecha,
      beneficiario,
      concepto,
      ingreso,
      formaPago,
      campus
    });
  }

  return result;
}

export default function DashboardConsejo() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [objetivos, setObjetivos] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedRangeMonths, setSelectedRangeMonths] = useState([]);
  const [polancoData, setPolancoData] = useState(null);
  const [qroData, setQroData] = useState(null);

  useEffect(() => {
    fetchAllData().then(res => {
      const processedVentas = processVentas(res.ventas);
      const processedPolanco = processPolancoIngresos(res.registros);
      const processedQro = processQroIngresos(res.registrosQro);

      setData(processedVentas);
      setPolancoData(processedPolanco);
      setQroData(processedQro);

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

      setSelectedRangeMonths(available.slice(0, 3));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-medium italic">Actualizando visión estratégica IDIP...</div>;
  }

  const mesesDisponibles = [
    ...new Set([
      ...Object.keys(data.cdmx.porMes),
      ...Object.keys(data.qro.porMes),
      ...Object.keys(data.online.porMes)
    ])
  ].sort().reverse();

  const toggleMonth = (mes) => {
    setSelectedRangeMonths(prev =>
      prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes]
    );
  };

  const getSedeData = (sedeObj, sedeName, month) => {
    const actual = sedeObj.porMes[month] || { ventas: 0, cursos: 0 };
    const dateParts = month.split('-');
    const prevYearNum = parseInt(dateParts[0]) - 1;
    const anoAnt = `${prevYearNum}-${dateParts[1]}`;
    const ventasAnt = sedeObj.porMes[anoAnt]?.ventas || 0;
    const obj = objetivos[`${month}-${sedeName}`] || objetivos[`${month}-${sedeName === 'QRO' ? 'QUERÉTARO' : sedeName}`] || { ventas: 0, cursos: 0 };

    return {
      actual,
      obj,
      crecimiento: ventasAnt > 0 ? ((actual.ventas - ventasAnt) / ventasAnt * 100) : 0,
      ventasAnt,
      anoAnteriorLabel: prevYearNum
    };
  };

  const getCustomRangeTotals = () => {
    const totals = { total: 0, cdmx: 0, qro: 0, online: 0 };

    selectedRangeMonths.forEach(m => {
      totals.cdmx += data.cdmx.porMes[m]?.ventas || 0;
      totals.qro += data.qro.porMes[m]?.ventas || 0;
      totals.online += data.online.porMes[m]?.ventas || 0;
    });

    totals.total = totals.cdmx + totals.qro + totals.online;
    return totals;
  };

  const now = new Date();
  const currentMonthStr = now.toISOString().substring(0, 7);
  const isCurrentMonthSelected = selectedMonth === currentMonthStr;
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const timeElapsedPercent = (dayOfMonth / daysInMonth) * 100;

  const currentCDMX = getSedeData(data.cdmx, 'CDMX', selectedMonth);
  const currentQRO = getSedeData(data.qro, 'QRO', selectedMonth);
  const currentOnline = getSedeData(data.online, 'ONLINE', selectedMonth);
  const rangeData = getCustomRangeTotals();

  const currentPolanco = polancoData?.porMes?.[selectedMonth]?.total || 0;
  const polancoRangeTotal = selectedRangeMonths.reduce((sum, mes) => sum + (polancoData?.porMes?.[mes]?.total || 0), 0);
  const polancoRangeRegs = selectedRangeMonths.reduce((sum, mes) => sum + (polancoData?.porMes?.[mes]?.registros || 0), 0);
  const polancoVsCDMX = rangeData.cdmx > 0 ? (polancoRangeTotal / rangeData.cdmx) * 100 : 0;
  const polancoTicketPromedio = polancoRangeRegs > 0 ? polancoRangeTotal / polancoRangeRegs : 0;

  const polancoTrendData = Object.keys(polancoData?.porMes || {})
    .sort()
    .map(mes => ({
      mes: mes.substring(5),
      total: polancoData.porMes[mes].total
    }));

  const polancoConceptData = Object.entries(polancoData?.porConcepto || {})
    .map(([concepto, total]) => ({ concepto, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const currentQroIngresos = qroData?.porMes?.[selectedMonth]?.total || 0;
  const qroRangeTotal = selectedRangeMonths.reduce((sum, mes) => sum + (qroData?.porMes?.[mes]?.total || 0), 0);
  const qroRangeRegs = selectedRangeMonths.reduce((sum, mes) => sum + (qroData?.porMes?.[mes]?.registros || 0), 0);
  const qroVsQro = rangeData.qro > 0 ? (qroRangeTotal / rangeData.qro) * 100 : 0;
  const qroTicketPromedio = qroRangeRegs > 0 ? qroRangeTotal / qroRangeRegs : 0;

  const qroTrendData = Object.keys(qroData?.porMes || {})
    .sort()
    .map(mes => ({
      mes: mes.substring(5),
      total: qroData.porMes[mes].total
    }));

  const qroConceptData = Object.entries(qroData?.porConcepto || {})
    .map(([concepto, total]) => ({ concepto, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const dataGraficas = mesesDisponibles.slice().reverse().map(m => ({
    mes: m.substring(5),
    CDMX: data.cdmx.porMes[m]?.ventas || 0,
    QRO: data.qro.porMes[m]?.ventas || 0,
    Online: data.online.porMes[m]?.ventas || 0,
    CDMX_C: data.cdmx.porMes[m]?.cursos || 0,
    QRO_C: data.qro.porMes[m]?.cursos || 0,
    Online_C: data.online.porMes[m]?.cursos || 0
  }));

  const rankingEscuelas = [
    ...Object.entries(data.cdmx.escuelas).map(([n, d]) => ({ n: n + ' (CDMX)', v: d.ventas })),
    ...Object.entries(data.qro.escuelas).map(([n, d]) => ({ n: n + ' (QRO)', v: d.ventas })),
    ...Object.entries(data.online.escuelas).map(([n, d]) => ({ n: n + ' (Online)', v: d.ventas }))
  ].sort((a, b) => b.v - a.v).slice(0, 10);

  const getProgressColor = (percent) => {
    if (percent >= 100) return IDIP_GREEN;
    if (percent >= 80) return COLOR_YELLOW;
    return COLOR_RED;
  };

  const CardSede = ({ titulo, info, color, icon: IconComponent }) => {
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
                  {pace >= 0 ? 'A Tiempo' : 'Crítico'} ({pace >= 0 ? '+' : ''}{pace.toFixed(1)}%)
                </span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Zap size={14} className="text-yellow-500" />
                  <span className="text-[10px] font-black text-gray-600 uppercase">Pronóstico</span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-gray-800">${Math.round(forecast).toLocaleString()}</p>
                  <p className="text-[9px] font-bold text-gray-400">Proj: {forecastPercent.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
            <span className="text-[9px] font-bold text-gray-400 uppercase">Alcance vs Año Anterior</span>
            <div className="text-right">
              <p className="text-[9px] font-bold" style={{ color: alcanceAnual >= 100 ? IDIP_GREEN : IDIP_GRAY }}>
                {alcanceAnual.toFixed(1)}% Logrado
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSede titulo="CDMX" info={currentCDMX} color={IDIP_GRAY} icon={Building} />
          <CardSede titulo="QUERÉTARO" info={currentQRO} color={IDIP_GREEN} icon={Target} />
          <CardSede titulo="ONLINE" info={currentOnline} color={IDIP_GRAY} icon={Globe} />
        </div>

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
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-black mb-6 uppercase text-sm tracking-widest" style={{ color: IDIP_GRAY }}>Tendencia Histórica ($)</h3>
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

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
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
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
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

            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
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
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
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

            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
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
