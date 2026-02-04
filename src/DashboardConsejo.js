import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, Building, Target, TrendingUp, TrendingDown, Globe, Award } from 'lucide-react';

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
  if (!rows || rows.length < 2) return { 
    cdmx: { ventas: 0, cursos: 0, escuelas: {}, porMes: {}, porAno: {} }, 
    qro: { ventas: 0, cursos: 0, escuelas: {}, porMes: {}, porAno: {} }, 
    online: { ventas: 0, cursos: 0, escuelas: {}, porMes: {}, porAno: {} } 
  };

  const initializeData = () => ({ ventas: 0, cursos: 0, escuelas: {}, porMes: {}, porAno: {} });
  const data = { CDMX: initializeData(), QRO: initializeData(), ONLINE: initializeData() };

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
    const sede = (sedeRaw === 'POLANCO' || sedeRaw === 'CDMX') ? 'CDMX' : (sedeRaw === 'QUERÉTARO' || sedeRaw === 'QRO') ? 'QRO' : (sedeRaw === 'ONLINE') ? 'ONLINE' : null;

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
        if (r[0] && r[1]) objs[`${r[0]}-${r[1].toUpperCase()}`] = { ventas: parseNumber(r[2]), cursos: parseNumber(r[3]) };
      });
      setObjetivos(objs);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-600 font-medium">Cargando datos estratégicos...</div>;

  const mesesDisponibles = [...new Set([...Object.keys(data.cdmx.porMes), ...Object.keys(data.qro.porMes), ...Object.keys(data.online.porMes)])].sort().reverse();
  
  const getSedeData = (sedeObj, sedeName, month) => {
    const actual = sedeObj.porMes[month] || { ventas: 0, cursos: 0 };
    const anoAnt = (parseInt(month.substring(0, 4)) - 1).toString() + month.substring(4);
    const ventasAnt = sedeObj.porMes[anoAnt]?.ventas || 0;
    const obj = objetivos[`${month}-${sedeName}`] || objetivos[`${month}-${sedeName === 'QRO' ? 'QUERÉTARO' : sedeName}`] || { ventas: 0, cursos: 0 };
    return { actual, obj, crecimiento: ventasAnt > 0 ? ((actual.ventas - ventasAnt) / ventasAnt * 100) : 0 };
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

  const CardSede = ({ titulo, info, color, icon: IconComponent }) => {
    const avanceV = info.obj.ventas > 0 ? (info.actual.ventas / info.obj.ventas * 100) : 0;
    const avanceC = info.obj.cursos > 0 ? (info.actual.cursos / info.obj.cursos * 100) : 0;
    
    return (
      <div className="bg-white rounded-xl shadow-md p-5 border-t-4" style={{ borderColor: color }}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <IconComponent size={20} className="text-gray-500" />
            <h3 className="font-bold text-gray-700">{titulo}</h3>
          </div>
          <div className="flex items-center gap-1">
            {info.crecimiento >= 0 ? <TrendingUp size={16} className="text-green-500" /> : <TrendingDown size={16} className="text-red-500" />}
            <span className={`text-sm font-bold ${info.crecimiento >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {info.crecimiento >= 0 ? '+' : ''}{info.crecimiento.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1"><span>Ventas</span><span>${info.actual.ventas.toLocaleString()} / ${info.obj.ventas.toLocaleString()}</span></div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: `${Math.min(avanceV, 100)}%` }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1"><span>Alumnos</span><span>{info.actual.cursos} / {info.obj.cursos}</span></div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${Math.min(avanceC, 100)}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">Dirección IDIP</h1>
            <p className="text-gray-500">Consolidado Estratégico Mensual</p>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border">
            <span className="text-sm font-medium text-gray-600">Periodo:</span>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent font-bold text-blue-600 outline-none cursor-pointer">
              {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSede titulo="CDMX" info={currentCDMX} color="#3B82F6" icon={Building} />
          <CardSede titulo="QUERÉTARO" info={currentQRO} color="#A855F7" icon={Target} />
          <CardSede titulo="ONLINE" info={currentOnline} color="#EC4899" icon={Globe} />
        </div>

        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="font-bold text-gray-700 flex items-center gap-2 text-lg"><DollarSign size={22} className="text-green-600"/> Acumulados de Ventas</h2>
            <select value={rangeMonths} onChange={e => setRangeMonths(e.target.value)} className="text-sm border rounded-lg px-3 py-1.5 outline-none bg-white shadow-sm cursor-pointer">
              <option value="all">Todo el Histórico</option>
              <option value="3">Últimos 3 meses</option>
              <option value="6">Últimos 6 meses</option>
              <option value="12">Últimos 12 meses</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-2xl text-white shadow-lg">
              <p className="text-xs opacity-80 uppercase font-bold tracking-wider">Ventas Totales</p>
              <p className="text-2xl font-black mt-1">${rangeData.total.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-400 to-blue-500 p-6 rounded-2xl text-white shadow-lg">
              <p className="text-xs opacity-80 uppercase font-bold tracking-wider">Ventas CDMX</p>
              <p className="text-2xl font-black mt-1">${rangeData.cdmx.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg">
              <p className="text-xs opacity-80 uppercase font-bold tracking-wider">Ventas QRO</p>
              <p className="text-2xl font-black mt-1">${rangeData.qro.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-6 rounded-2xl text-white shadow-lg">
              <p className="text-xs opacity-80 uppercase font-bold tracking-wider">Ventas Online</p>
              <p className="text-2xl font-black mt-1">${rangeData.online.toLocaleString()}</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="font-bold mb-6 text-gray-700">Tendencia de Ingresos ($)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataGraficas}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={v => `$${v/1000}k`} />
                  <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="CDMX" stroke="#3B82F6" strokeWidth={3} dot={false}/>
                  <Line type="monotone" dataKey="QRO" stroke="#A855F7" strokeWidth={3} dot={false}/>
                  <Line type="monotone" dataKey="Online" stroke="#EC4899" strokeWidth={3} dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="font-bold mb-6 text-gray-700">Tendencia de Alumnos (Inscritos)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataGraficas}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="CDMX_C" fill="#3B82F6" name="CDMX" />
                  <Bar dataKey="QRO_C" fill="#A855F7" name="QRO" />
                  <Bar dataKey="Online_C" fill="#EC4899" name="Online" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h3 className="font-bold mb-6 text-gray-700 flex items-center gap-2"><Award className="text-yellow-500"/> Ranking Global: Top 10 Escuelas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rankingEscuelas.map((e, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <span className="text-sm font-medium text-gray-600"><span className="font-bold text-blue-600 mr-2">#{i+1}</span> {e.n}</span>
                <span className="font-bold text-gray-800">${e.v.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
