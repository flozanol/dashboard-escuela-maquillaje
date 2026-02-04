import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, Building, Target, TrendingUp, TrendingDown, Globe, Award, Calendar } from 'lucide-react';

// Colores institucionales IDIP basados en el logotipo
const IDIP_GREEN = "#86C332";
const IDIP_GRAY = "#6D6E71";
const IDIP_LIGHT_GRAY = "#F1F1F2";

function parseNumber(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const num = parseFloat(String(value).replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

async function fetchAllData() {
  const apiKey = process.env.REACT_APP_GSHEETS_API_KEY;
  const spreadsheetId = '1DHt8N8bEPElP4Stu1m2Wwb2brO3rLKOSuM8y_Ca3nVg';
  const ranges = ['Ventas Consolidadas!A:I', 'Objetivos!A:D'];
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?key=${apiKey}&` + ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
  const res = await fetch(url);
  const data = await res.json();
  return { ventas: data.valueRanges[0].values, objetivos: data.valueRanges[1].values };
}

function processVentas(rows) {
  const initializeData = () => ({ ventas: 0, cursos: 0, escuelas: {}, porMes: {}, porAno: {} });
  const data = { CDMX: initializeData(), QRO: initializeData(), ONLINE: initializeData() };

  if (!rows || rows.length < 2) return { cdmx: data.CDMX, qro: data.QRO, online: data.ONLINE };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || !row[1]) continue;
    
    let fecha = row[0].toString();
    if (!isNaN(fecha) && fecha.length < 10) {
      const excelEpoch = new Date(1899, 11, 30);
      fecha = new Date(excelEpoch.getTime() + parseFloat(fecha) * 86400000).toISOString().substring(0, 10);
    } else {
      fecha = fecha.replace(/\//g, '-');
    }

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

export default function DashboardConsejo() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [objetivos, setObjetivos] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [rangeMonths, setRangeMonths] = useState('all');

  useEffect(() => {
    fetchAllData().then(res => {
      setData(processVentas(res.ventas));
      const objs = {};
      res.objetivos?.forEach(r => {
        if (r[0] && r[1]) objs[`${r[0]}-${r[1].toString().trim().toUpperCase()}`] = { ventas: parseNumber(r[2]), cursos: parseNumber(r[3]) };
      });
      setObjetivos(objs);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Cargando identidad IDIP...</div>;

  const mesesDisponibles = [...new Set([...Object.keys(data.cdmx.porMes), ...Object.keys(data.qro.porMes), ...Object.keys(data.online.porMes)])].sort().reverse();
  
  const getSedeData = (sedeObj, sedeName, month) => {
    const actual = sedeObj.porMes[month] || { ventas: 0, cursos: 0 };
    const dateParts = month.split('-');
    const prevYear = (parseInt(dateParts[0]) - 1).toString();
    const anoAnt = `${prevYear}-${dateParts[1]}`;
    const ventasAnt = sedeObj.porMes[anoAnt]?.ventas || 0;
    const obj = objetivos[`${month}-${sedeName}`] || objetivos[`${month}-${sedeName === 'QRO' ? 'QUERÉTARO' : sedeName}`] || { ventas: 0, cursos: 0 };
    return { actual, obj, crecimiento: ventasAnt > 0 ? ((actual.ventas - ventasAnt) / ventasAnt * 100) : 0, ventasAnt };
  };

  const getRangeTotals = (range) => {
    const targetMonths = range === 'all' ? mesesDisponibles : mesesDisponibles.slice(0, parseInt(range));
    const totals = { total: 0, cdmx: 0, qro: 0, online: 0 };
    targetMonths.forEach(m => {
      totals.cdmx += data.cdmx.porMes[m]?.ventas || 0;
      totals.qro += data.qro.porMes[m]?.ventas || 0;
      totals.online += data.online.porMes[m]?.ventas || 0;
    });
    totals.total = totals.cdmx + totals.qro + totals.online;
    return totals;
  };

  const currentCDMX = getSedeData(data.cdmx, 'CDMX', selectedMonth);
  const currentQRO = getSedeData(data.qro, 'QRO', selectedMonth);
  const currentOnline = getSedeData(data.online, 'ONLINE', selectedMonth);
  const rangeData = getRangeTotals(rangeMonths);

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

  const CardSede = ({ titulo, info, color, icon: IconComponent }) => (
    <div className="bg-white rounded-xl shadow-lg p-5 border-t-4" style={{ borderColor: color }}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <IconComponent size={20} style={{ color: IDIP_GRAY }} />
          <h3 className="font-extrabold" style={{ color: IDIP_GRAY }}>{titulo}</h3>
        </div>
        <div className="flex items-center gap-1">
          {info.crecimiento >= 0 ? <TrendingUp size={18} color={IDIP_GREEN} /> : <TrendingDown size={18} color="#EF4444" />}
          <span className="text-sm font-bold" style={{ color: info.crecimiento >= 0 ? IDIP_GREEN : "#EF4444" }}>
            {info.crecimiento >= 0 ? '+' : ''}{info.crecimiento.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs mb-1 font-medium text-gray-500">
            <span>VENTAS</span>
            <span>${info.actual.ventas.toLocaleString()} / ${info.obj.ventas.toLocaleString()}</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: IDIP_LIGHT_GRAY }}>
            <div className="h-full transition-all duration-500" style={{ 
              width: `${Math.min((info.actual.ventas / (info.obj.ventas || 1)) * 100, 100)}%`,
              backgroundColor: IDIP_GREEN 
            }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1 font-medium text-gray-500">
            <span>ALUMNOS</span>
            <span>{info.actual.cursos} / {info.obj.cursos}</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: IDIP_LIGHT_GRAY }}>
            <div className="h-full transition-all duration-500" style={{ 
              width: `${Math.min((info.actual.cursos / (info.obj.cursos || 1)) * 100, 100)}%`,
              backgroundColor: IDIP_GRAY 
            }}></div>
          </div>
        </div>
        <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase">vs Año Anterior</span>
            <span className="text-xs font-bold text-gray-600">${info.ventasAnt.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER CON LOGOTIPO */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm gap-4 border-b-2" style={{ borderBottomColor: IDIP_GREEN }}>
          <div className="flex items-center gap-4">
            <img 
              src="https://idip.com.mx/wp-content/uploads/2024/08/logos-IDIP-sin-fondo-1-2.png" 
              alt="IDIP Logo" 
              className="h-12 md:h-16 w-auto"
            />
            <div className="h-10 w-[1px] bg-gray-200 hidden md:block"></div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight" style={{ color: IDIP_GRAY }}>DASHBOARD DIRECCIÓN</h1>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: IDIP_GREEN }}>Maquillaje • Imagen</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-gray-50 p-2 px-4 rounded-xl border border-gray-100">
            <Calendar size={18} style={{ color: IDIP_GRAY }} />
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)} 
              className="bg-transparent font-bold outline-none cursor-pointer text-sm"
              style={{ color: IDIP_GRAY }}
            >
              {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </header>

        {/* TARJETAS DE SEDE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSede titulo="CDMX" info={currentCDMX} color={IDIP_GRAY} icon={Building} />
          <CardSede titulo="QUERÉTARO" info={currentQRO} color={IDIP_GREEN} icon={Target} />
          <CardSede titulo="ONLINE" info={currentOnline} color={IDIP_GRAY} icon={Globe} />
        </div>

        {/* ACUMULADOS */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="font-black flex items-center gap-2 text-lg" style={{ color: IDIP_GRAY }}>
              <DollarSign size={22} color={IDIP_GREEN} /> 
              ACUMULADOS ESTRATÉGICOS
            </h2>
            <select 
              value={rangeMonths} 
              onChange={e => setRangeMonths(e.target.value)} 
              className="text-xs font-bold border rounded-lg px-3 py-2 outline-none bg-white shadow-sm cursor-pointer uppercase tracking-tighter"
              style={{ color: IDIP_GRAY }}
            >
              <option value="all">Histórico Total</option>
              <option value="3">Último Trimestre</option>
              <option value="6">Último Semestre</option>
              <option value="12">Último Año</option>
            </select>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Ventas Totales', val: rangeData.total, bg: IDIP_GRAY },
              { label: 'Ventas CDMX', val: rangeData.cdmx, bg: IDIP_GREEN },
              { label: 'Ventas QRO', val: rangeData.qro, bg: IDIP_GRAY },
              { label: 'Ventas Online', val: rangeData.online, bg: IDIP_GREEN }
            ].map((k, i) => (
              <div key={i} className="p-6 rounded-2xl text-white shadow-lg transition-transform hover:scale-[1.02]" style={{ backgroundColor: k.bg }}>
                <p className="text-[10px] opacity-80 uppercase font-black tracking-widest">{k.label}</p>
                <p className="text-2xl font-black mt-1">${k.val.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>

        {/* GRÁFICAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-black mb-6 uppercase text-sm tracking-widest" style={{ color: IDIP_GRAY }}>Tendencia de Ingresos</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataGraficas}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={IDIP_LIGHT_GRAY} />
                  <XAxis dataKey="mes" tick={{fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis tickFormatter={v => `$${v/1000}k`} tick={{fontSize: 10}} />
                  <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Legend iconType="circle" />
                  <Line name="CDMX" type="monotone" dataKey="CDMX" stroke={IDIP_GRAY} strokeWidth={4} dot={false}/>
                  <Line name="QRO" type="monotone" dataKey="QRO" stroke={IDIP_GREEN} strokeWidth={4} dot={false}/>
                  <Line name="Online" type="monotone" dataKey="Online" stroke="#A6A8AB" strokeWidth={2} strokeDasharray="5 5" dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-black mb-6 uppercase text-sm tracking-widest" style={{ color: IDIP_GRAY }}>Volumen de Alumnos</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataGraficas}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={IDIP_LIGHT_GRAY} />
                  <XAxis dataKey="mes" tick={{fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis tick={{fontSize: 10}} />
                  <Tooltip cursor={{fill: IDIP_LIGHT_GRAY}} contentStyle={{ borderRadius: '15px' }} />
                  <Legend iconType="rect" />
                  <Bar name="CDMX" dataKey="CDMX_C" fill={IDIP_GRAY} radius={[4, 4, 0, 0]} />
                  <Bar name="QRO" dataKey="QRO_C" fill={IDIP_GREEN} radius={[4, 4, 0, 0]} />
                  <Bar name="Online" dataKey="Online_C" fill="#A6A8AB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RANKING */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <Award size={24} color={IDIP_GREEN} />
            <h3 className="font-black uppercase text-sm tracking-widest" style={{ color: IDIP_GRAY }}>Ranking Global de Escuelas</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rankingEscuelas.map((e, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100 group">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black text-white" style={{ backgroundColor: i < 3 ? IDIP_GREEN : IDIP_GRAY }}>
                    {i+1}
                  </span>
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
