import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, Building, Target, TrendingUp, TrendingDown } from 'lucide-react';

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
  console.log('DEBUG - Total filas recibidas:', rows ? rows.length : 0);
  console.log('DEBUG - Fila 0 (headers):', rows[0]);
  console.log('DEBUG - Fila 1 (primera venta):', rows[1]);
  console.log('DEBUG - Fila 10 (ejemplo CDMX):', rows[10]);
  
  if (!rows || rows.length < 2) return { 
    cdmx: { ventas: 0, cursos: 0, escuelas: {}, porMes: {}, porAno: {} }, 
    qro: { ventas: 0, cursos: 0, escuelas: {}, porMes: {}, porAno: {} } 
  };
  if (!rows || rows.length < 2) return { cdmx: { ventas: 0, cursos: 0, escuelas: {}, porMes: {}, porAno: {} }, qro: { ventas: 0, cursos: 0, escuelas: {}, porMes: {}, porAno: {} } };
  const dataCDMX = { ventas: 0, cursos: 0, escuelas: {}, porMes: {}, porAno: {} };
  const dataQRO = { ventas: 0, cursos: 0, escuelas: {}, porMes: {}, porAno: {} };
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || !row[1]) continue;
    const fechaRaw = row[0].toString();
let fecha = fechaRaw;
// Convertir fechas seriales de Excel/Sheets (números como 44927) a texto
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
    
    if (mes === '2026-01' && isCDMX) {
  console.log('DEBUG CDMX Enero - Fecha:', fecha, 'Escuela:', escuela, 'Ventas:', ventasNum, 'Sede col I:', row[8]);
}
    if (isCDMX) {
      dataCDMX.ventas += ventasNum;
      dataCDMX.cursos += cursosNum;
      if (!dataCDMX.escuelas[escuela]) dataCDMX.escuelas[escuela] = { ventas: 0, cursos: 0 };
      dataCDMX.escuelas[escuela].ventas += ventasNum;
      dataCDMX.escuelas[escuela].cursos += cursosNum;
      if (!dataCDMX.porMes[mes]) dataCDMX.porMes[mes] = { ventas: 0, cursos: 0 };
      dataCDMX.porMes[mes].ventas += ventasNum;
      dataCDMX.porMes[mes].cursos += cursosNum;
      if (!dataCDMX.porAno[ano]) dataCDMX.porAno[ano] = {};
      if (!dataCDMX.porAno[ano][mesNum]) dataCDMX.porAno[ano][mesNum] = { ventas: 0, cursos: 0 };
      dataCDMX.porAno[ano][mesNum].ventas += ventasNum;
      dataCDMX.porAno[ano][mesNum].cursos += cursosNum;
    } else if (isQRO) {
      dataQRO.ventas += ventasNum;
      dataQRO.cursos += cursosNum;
      if (!dataQRO.escuelas[escuela]) dataQRO.escuelas[escuela] = { ventas: 0, cursos: 0 };
      dataQRO.escuelas[escuela].ventas += ventasNum;
      dataQRO.escuelas[escuela].cursos += cursosNum;
      if (!dataQRO.porMes[mes]) dataQRO.porMes[mes] = { ventas: 0, cursos: 0 };
      dataQRO.porMes[mes].ventas += ventasNum;
      dataQRO.porMes[mes].cursos += cursosNum;
      if (!dataQRO.porAno[ano]) dataQRO.porAno[ano] = {};
      if (!dataQRO.porAno[ano][mesNum]) dataQRO.porAno[ano][mesNum] = { ventas: 0, cursos: 0 };
      dataQRO.porAno[ano][mesNum].ventas += ventasNum;
      dataQRO.porAno[ano][mesNum].cursos += cursosNum;
    }
  }
  return { cdmx: dataCDMX, qro: dataQRO };
}

function processObjetivos(rows) {
  if (!rows || rows.length < 2) return {};
  const objetivos = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || !row[1]) continue;
    const mes = row[0];
    const sede = row[1].toString().trim().toUpperCase();
    const objVentas = parseNumber(row[2]);
    console.log(`DEBUG Objetivo ${mes} ${sede} - Raw ventas:`, row[2], '- Parsed:', objVentas);
    const objCursos = parseNumber(row[3]);
    const key = `${mes}-${sede}`;
    objetivos[key] = { ventas: objVentas, cursos: objCursos };
  }
  return objetivos;
}

export default function DashboardConsejo() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cdmx, setCdmx] = useState(null);
  const [qro, setQro] = useState(null);
  const [objetivos, setObjetivos] = useState({});
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAllData();
        const { cdmx, qro } = processVentas(data.ventas);
        const obj = processObjetivos(data.objetivos);
        setCdmx(cdmx);
        setQro(qro);
        setObjetivos(obj);
      } catch (e) {
        console.error(e);
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
  const mesNumActual = new Date().getMonth() + 1;
  const mesNumStr = mesNumActual.toString().padStart(2, '0');
  const anoAnterior = (parseInt(anoActual) - 1).toString();
  const ventasCDMXActual = cdmx?.porAno[anoActual]?.[mesNumStr]?.ventas || 0;
  const cursosCDMXActual = cdmx?.porAno[anoActual]?.[mesNumStr]?.cursos || 0;
  const ventasCDMXAnterior = cdmx?.porAno[anoAnterior]?.[mesNumStr]?.ventas || 0;
  const ventasQROActual = qro?.porAno[anoActual]?.[mesNumStr]?.ventas || 0;
  const cursosQROActual = qro?.porAno[anoActual]?.[mesNumStr]?.cursos || 0;
  const ventasQROAnterior = qro?.porAno[anoAnterior]?.[mesNumStr]?.ventas || 0;
  const crecimientoCDMXVentas = ventasCDMXAnterior > 0 ? ((ventasCDMXActual - ventasCDMXAnterior) / ventasCDMXAnterior * 100) : 0;
  const crecimientoQROVentas = ventasQROAnterior > 0 ? ((ventasQROActual - ventasQROAnterior) / ventasQROAnterior * 100) : 0;
  const objCDMX = objetivos[`${mesActual}-CDMX`] || { ventas: 0, cursos: 0 };
  const objQRO = objetivos[`${mesActual}-QUERÉTARO`] || objetivos[`${mesActual}-QRO`] || { ventas: 0, cursos: 0 };
  const avanceCDMXVentas = objCDMX.ventas > 0 ? (ventasCDMXActual / objCDMX.ventas * 100) : 0;
  const avanceCDMXCursos = objCDMX.cursos > 0 ? (cursosCDMXActual / objCDMX.cursos * 100) : 0;
  const avanceQROVentas = objQRO.ventas > 0 ? (ventasQROActual / objQRO.ventas * 100) : 0;
  const avanceQROCursos = objQRO.cursos > 0 ? (cursosQROActual / objQRO.cursos * 100) : 0;
  const total = (cdmx?.ventas || 0) + (qro?.ventas || 0);
  const totalCursos = (cdmx?.cursos || 0) + (qro?.cursos || 0);
  const ticket = totalCursos > 0 ? total / totalCursos : 0;
  const comparativoSedes = [{ sede: 'CDMX', ventas: cdmx?.ventas || 0, cursos: cdmx?.cursos || 0 }, { sede: 'Querétaro', ventas: qro?.ventas || 0, cursos: qro?.cursos || 0 }];
  const mesesCDMX = Object.keys(cdmx?.porMes || {}).sort();
  const mesesQRO = Object.keys(qro?.porMes || {}).sort();
  const todosMeses = [...new Set([...mesesCDMX, ...mesesQRO])].sort();
  const dataMensual = todosMeses.map(mes => ({
  mes: mes.substring(5),
  cdmxVentas: cdmx?.porMes[mes]?.ventas || 0,
  cdmxCursos: cdmx?.porMes[mes]?.cursos || 0,
  qroVentas: qro?.porMes[mes]?.ventas || 0,
  qroCursos: qro?.porMes[mes]?.cursos || 0,
  totalVentas: (cdmx?.porMes[mes]?.ventas || 0) + (qro?.porMes[mes]?.ventas || 0),
  totalCursos: (cdmx?.porMes[mes]?.cursos || 0) + (qro?.porMes[mes]?.cursos || 0)
}));

  const todasEscuelas = [...Object.entries(cdmx?.escuelas || {}).map(([nombre, data]) => ({ nombre: nombre + ' (CDMX)', ventas: data.ventas, cursos: data.cursos })), ...Object.entries(qro?.escuelas || {}).map(([nombre, data]) => ({ nombre: nombre + ' (QRO)', ventas: data.ventas, cursos: data.cursos }))].sort((a, b) => b.ventas - a.ventas);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Consejo</h1>
          <p className="text-gray-600 mt-2">Vista consolidada CDMX + Querétaro</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">CDMX - Mes Actual</h3>
              {crecimientoCDMXVentas >= 0 ? <TrendingUp className="w-6 h-6 text-green-500" /> : <TrendingDown className="w-6 h-6 text-red-500" />}
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Ventas</span>
                  <span className="text-sm font-medium">${ventasCDMXActual.toLocaleString()} / ${objCDMX.ventas.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className={`h-3 rounded-full ${avanceCDMXVentas >= 100 ? 'bg-green-500' : avanceCDMXVentas >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(avanceCDMXVentas, 100)}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{avanceCDMXVentas.toFixed(1)}% del objetivo</p>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Cursos</span>
                  <span className="text-sm font-medium">{cursosCDMXActual} / {objCDMX.cursos}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className={`h-3 rounded-full ${avanceCDMXCursos >= 100 ? 'bg-green-500' : avanceCDMXCursos >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(avanceCDMXCursos, 100)}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{avanceCDMXCursos.toFixed(1)}% del objetivo</p>
              </div>
              {ventasCDMXAnterior > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-gray-600">vs Año Anterior</p>
                  <p className={`text-lg font-bold ${crecimientoCDMXVentas >= 0 ? 'text-green-600' : 'text-red-600'}`}>{crecimientoCDMXVentas >= 0 ? '+' : ''}{crecimientoCDMXVentas.toFixed(1)}%</p>
                </div>
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Querétaro - Mes Actual</h3>
              {crecimientoQROVentas >= 0 ? <TrendingUp className="w-6 h-6 text-green-500" /> : <TrendingDown className="w-6 h-6 text-red-500" />}
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Ventas</span>
                  <span className="text-sm font-medium">${ventasQROActual.toLocaleString()} / ${objQRO.ventas.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className={`h-3 rounded-full ${avanceQROVentas >= 100 ? 'bg-green-500' : avanceQROVentas >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(avanceQROVentas, 100)}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{avanceQROVentas.toFixed(1)}% del objetivo</p>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Cursos</span>
                  <span className="text-sm font-medium">{cursosQROActual} / {objQRO.cursos}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className={`h-3 rounded-full ${avanceQROCursos >= 100 ? 'bg-green-500' : avanceQROCursos >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(avanceQROCursos, 100)}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{avanceQROCursos.toFixed(1)}% del objetivo</p>
              </div>
              {ventasQROAnterior > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-gray-600">vs Año Anterior</p>
                  <p className={`text-lg font-bold ${crecimientoQROVentas >= 0 ? 'text-green-600' : 'text-red-600'}`}>{crecimientoQROVentas >= 0 ? '+' : ''}{crecimientoQROVentas.toFixed(1)}%</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">CDMX Total</p>
                <p className="text-3xl font-bold">${(cdmx?.ventas || 0).toLocaleString()}</p>
                <p className="text-blue-100 text-sm">{(cdmx?.cursos || 0)} cursos</p>
              </div>
              <Building className="w-8 h-8 text-blue-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Querétaro Total</p>
                <p className="text-3xl font-bold">${(qro?.ventas || 0).toLocaleString()}</p>
                <p className="text-purple-100 text-sm">{(qro?.cursos || 0)} cursos</p>
              </div>
              <Building className="w-8 h-8 text-purple-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total General</p>
                <p className="text-3xl font-bold">${total.toLocaleString()}</p>
                <p className="text-green-100 text-sm">{totalCursos} cursos</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Ticket Promedio</p>
                <p className="text-3xl font-bold">${Math.round(ticket).toLocaleString()}</p>
                <p className="text-orange-100 text-sm">Por curso</p>
              </div>
              <Target className="w-8 h-8 text-orange-200" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Tendencia Mensual de Ventas</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataMensual}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="cdmxVentas" stroke="#3B82F6" strokeWidth={3} name="CDMX" />
                  <Line type="monotone" dataKey="qroVentas" stroke="#A855F7" strokeWidth={3} name="Querétaro" />
                <Line type="monotone" dataKey="totalVentas" stroke="#22C55E" strokeWidth={2} strokeDasharray="5 5" name="Total" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Tendencia Mensual de Cursos</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataMensual}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="cdmxCursos" stroke="#3B82F6" strokeWidth={3} name="CDMX" />
                  <Line type="monotone" dataKey="qroCursos" stroke="#A855F7" strokeWidth={3} name="Querétaro" />
                <Line type="monotone" dataKey="totalCursos" stroke="#22C55E" strokeWidth={2} strokeDasharray="5 5" name="Total" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Comparativo Ventas</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparativoSedes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sede" />
                  <YAxis tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="ventas" fill="#22C55E" name="Ventas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Comparativo Cursos</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparativoSedes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sede" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cursos" fill="#3B82F6" name="Cursos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Ranking de Escuelas</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Escuela</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ventas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cursos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {todasEscuelas.map((escuela, index) => {
                  const ticketEsc = escuela.cursos > 0 ? escuela.ventas / escuela.cursos : 0;
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{escuela.nombre}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${escuela.ventas.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{escuela.cursos}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${Math.round(ticketEsc).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
