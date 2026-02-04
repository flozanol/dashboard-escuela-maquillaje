import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, Building, Target, TrendingUp, TrendingDown, Globe } from 'lucide-react';

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

  const dataCDMX = { ventas: 0, cursos: 0, escuelas: {}, porMes: {}, porAno: {} };
  const dataQRO = { ventas: 0, cursos: 0, escuelas: {}, porMes: {}, porAno: {} };
  const dataOnline = { ventas: 0, cursos: 0, escuelas: {}, porMes: {}, porAno: {} };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || !row[1]) continue;
    
    const fechaRaw = row[0].toString();
    let fecha = fechaRaw;
    if (!isNaN(fechaRaw) && fechaRaw.length < 10) {
      const dateNum = parseFloat(fechaRaw);
      const excelEpoch = new Date(1899, 11, 30);
      const jsDate = new Date(excelEpoch.getTime() + dateNum * 86400000);
      fecha = jsDate.toISOString().substring(0, 10);
    } else {
      fecha = fechaRaw.replace(/\//g, '-');
    }

    const mes = fecha.substring(0, 7);
    const ano = fecha.substring(0, 4);
    const mesNum = fecha.substring(5, 7);
    const escuela = row[1];
    const ventasNum = parseNumber(row[4]);
    const cursosNum = parseNumber(row[5]) || 1;
    const sede = (row[8] || '').toString().trim().toUpperCase();
    
    const isCDMX = sede === 'CDMX' || sede === 'POLANCO';
    const isQRO = sede === 'QUERÉTARO' || sede === 'QRO';
    const isOnline = sede === 'ONLINE';

    const target = isCDMX ? dataCDMX : isQRO ? dataQRO : isOnline ? dataOnline : null;

    if (target) {
      target.ventas += ventasNum;
      target.cursos += cursosNum;
      if (!target.escuelas[escuela]) target.escuelas[escuela] = { ventas: 0, cursos: 0 };
      target.escuelas[escuela].ventas += ventasNum;
      target.escuelas[escuela].cursos += cursosNum;
      if (!target.porMes[mes]) target.porMes[mes] = { ventas: 0, cursos: 0 };
      target.porMes[mes].ventas += ventasNum;
      target.porMes[mes].cursos += cursosNum;
      if (!target.porAno[ano]) target.porAno[ano] = {};
      if (!target.porAno[ano][mesNum]) target.porAno[ano][mesNum] = { ventas: 0, cursos: 0 };
      target.porAno[ano][mesNum].ventas += ventasNum;
      target.porAno[ano][mesNum].cursos += cursosNum;
    }
  }
  return { cdmx: dataCDMX, qro: dataQRO, online: dataOnline };
}

function processObjetivos(rows) {
  if (!rows || rows.length < 2) return {};
  const objetivos = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || !row[1]) continue;
    const mes = row[0];
    const sede = row[1].toString().trim().toUpperCase();
    const key = `${mes}-${sede}`;
    objetivos[key] = { ventas: parseNumber(row[2]), cursos: parseNumber(row[3]) };
  }
  return objetivos;
}

export default function DashboardConsejo() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cdmx, setCdmx] = useState(null);
  const [qro, setQro] = useState(null);
  const [online, setOnline] = useState(null);
  const [objetivos, setObjetivos] = useState({});

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAllData();
        const processed = processVentas(data.ventas);
        setCdmx(processed.cdmx);
        setQro(processed.qro);
        setOnline(processed.online);
        setObjetivos(processObjetivos(data.objetivos));
      } catch (e) {
        setError('Error cargando datos');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-8 text-center">Cargando...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  const mesActual = new Date().toISOString().substring(0, 7);
  const anoActual = new Date().getFullYear().toString();
  const mesNumStr = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const anoAnterior = (parseInt(anoActual) - 1).toString();

  // KPIs CDMX
  const ventasCDMXActual = cdmx?.porAno[anoActual]?.[mesNumStr]?.ventas || 0;
  const cursosCDMXActual = cdmx?.porAno[anoActual]?.[mesNumStr]?.cursos || 0;
  const ventasCDMXAnterior = cdmx?.porAno[anoAnterior]?.[mesNumStr]?.ventas || 0;
  const crecimientoCDMX = ventasCDMXAnterior > 0 ? ((ventasCDMXActual - ventasCDMXAnterior) / ventasCDMXAnterior * 100) : 0;
  const objCDMX = objetivos[`${mesActual}-CDMX`] || { ventas: 0, cursos: 0 };

  // KPIs QRO
  const ventasQROActual = qro?.porAno[anoActual]?.[mesNumStr]?.ventas || 0;
  const cursosQROActual = qro?.porAno[anoActual]?.[mesNumStr]?.cursos || 0;
  const ventasQROAnterior = qro?.porAno[anoAnterior]?.[mesNumStr]?.ventas || 0;
  const crecimientoQRO = ventasQROAnterior > 0 ? ((ventasQROActual - ventasQROAnterior) / ventasQROAnterior * 100) : 0;
  const objQRO = objetivos[`${mesActual}-QUERÉTARO`] || objetivos[`${mesActual}-QRO`] || { ventas: 0, cursos: 0 };

  // KPIs ONLINE
  const ventasOnlineActual = online?.porAno[anoActual]?.[mesNumStr]?.ventas || 0;
  const cursosOnlineActual = online?.porAno[anoActual]?.[mesNumStr]?.cursos || 0;
  const ventasOnlineAnterior = online?.porAno[anoAnterior]?.[mesNumStr]?.ventas || 0;
  const crecimientoOnline = ventasOnlineAnterior > 0 ? ((ventasOnlineActual - ventasOnlineAnterior) / ventasOnlineAnterior * 100) : 0;
  const objOnline = objetivos[`${mesActual}-ONLINE`] || { ventas: 0, cursos: 0 };

  const totalVentas = (cdmx?.ventas || 0) + (qro?.ventas || 0) + (online?.ventas || 0);
  const totalCursos = (cdmx?.cursos || 0) + (qro?.cursos || 0) + (online?.cursos || 0);
  const ticketGral = totalCursos > 0 ? totalVentas / totalCursos : 0;

  const todosMeses = [...new Set([...Object.keys(cdmx?.porMes || {}), ...Object.keys(qro?.porMes || {}), ...Object.keys(online?.porMes || {})])].sort();
  const dataMensual = todosMeses.map(mes => ({
    mes: mes.substring(5),
    cdmxVentas: cdmx?.porMes[mes]?.ventas || 0,
    qroVentas: qro?.porMes[mes]?.ventas || 0,
    onlineVentas: online?.porMes[mes]?.ventas || 0,
    totalVentas: (cdmx?.porMes[mes]?.ventas || 0) + (qro?.porMes[mes]?.ventas || 0) + (online?.porMes[mes]?.ventas || 0)
  }));

  const CardSede = ({ titulo, actual, objetivo, cursos, cursosObj, crecimiento, color }) => {
    const avanceV = objetivo > 0 ? (actual / objetivo * 100) : 0;
    const avanceC = cursosObj > 0 ? (cursos / cursosObj * 100) : 0;
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border-t-4" style={{ borderColor: color }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{titulo}</h3>
          {crecimiento >= 0 ? <TrendingUp className="text-green-500" /> : <TrendingDown className="text-red-500" />}
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Ventas</span>
              <span className="font-medium">${actual.toLocaleString()} / ${objetivo.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="h-2 rounded-full bg-green-500" style={{ width: `${Math.min(avanceV, 100)}%` }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{avanceV.toFixed(1)}% del objetivo</p>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Cursos</span>
              <span className="font-medium">{cursos} / {cursosObj}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.min(avanceC, 100)}%` }}></div>
            </div>
          </div>
          {crecimiento !== 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500">vs Año Anterior</p>
              <p className={`text-sm font-bold ${crecimiento >= 0 ? 'text-green-600' : 'text-red-600'}`}>{crecimiento >= 0 ? '+' : ''}{crecimiento.toFixed(1)}%</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Dirección IDIP</h1>
          <p className="text-gray-600">Consolidado: CDMX, Querétaro y Online</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <CardSede titulo="CDMX" actual={ventasCDMXActual} objetivo={objCDMX.ventas} cursos={cursosCDMXActual} cursosObj={objCDMX.cursos} crecimiento={crecimientoCDMX} color="#3B82F6" />
          <CardSede titulo="Querétaro" actual={ventasQROActual} objetivo={objQRO.ventas} cursos={cursosQROActual} cursosObj={objQRO.cursos} crecimiento={crecimientoQRO} color="#A855F7" />
          <CardSede titulo="Online" actual={ventasOnlineActual} objetivo={objOnline.ventas} cursos={cursosOnlineActual} cursosObj={objOnline.cursos} crecimiento={crecimientoOnline} color="#EC4899" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-500">Ventas Totales Hist.</p>
            <p className="text-2xl font-bold text-blue-600">${totalVentas.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-500">Cursos Totales Hist.</p>
            <p className="text-2xl font-bold text-purple-600">{totalCursos.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-500">Ticket Promedio Hist.</p>
            <p className="text-2xl font-bold text-green-600">${Math.round(ticketGral).toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm text-gray-500">Sedes Activas</p>
            <p className="text-2xl font-bold text-orange-600">3</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Tendencia Mensual de Ventas</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataMensual}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="cdmxVentas" stroke="#3B82F6" name="CDMX" strokeWidth={2} />
                <Line type="monotone" dataKey="qroVentas" stroke="#A855F7" name="Querétaro" strokeWidth={2} />
                <Line type="monotone" dataKey="onlineVentas" stroke="#EC4899" name="Online" strokeWidth={2} />
                <Line type="monotone" dataKey="totalVentas" stroke="#22C55E" name="Total" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
