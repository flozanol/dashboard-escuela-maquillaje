import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, Building, Target, ShoppingCart } from 'lucide-react';

function parseNumber(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const num = parseFloat(String(value).replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

async function fetchData() {
  const apiKey = process.env.REACT_APP_GSHEETS_API_KEY;
  const spreadsheetId = '1DHt8N8bEPElP4Stu1m2Wwb2brO3rLKOSuM8y_Ca3nVg';
  const range = 'Ventas Consolidadas!A:I';

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();
  return data.values;
}

function processData(rows) {
  if (!rows || rows.length < 2) return { 
    cdmx: { ventas: 0, cursos: 0, escuelas: {}, porMes: {} }, 
    qro: { ventas: 0, cursos: 0, escuelas: {}, porMes: {} } 
  };
  
  const dataCDMX = { ventas: 0, cursos: 0, escuelas: {}, porMes: {} };
  const dataQRO = { ventas: 0, cursos: 0, escuelas: {}, porMes: {} };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || !row[1]) continue;

    const fecha = row[0];
    const mes = fecha.substring(0, 7);
    const escuela = row[1];
    const ventasNum = parseNumber(row[4]);
    const cursosNum = parseNumber(row[5]) || 1;
    const sede = (row[8] || '').toString().trim().toUpperCase();

    const isCDMX = sede === 'CDMX' || sede === 'POLANCO';
    const isQRO = sede === 'QUERÉTARO' || sede === 'QRO';

    if (isCDMX) {
      dataCDMX.ventas += ventasNum;
      dataCDMX.cursos += cursosNum;
      
      if (!dataCDMX.escuelas[escuela]) dataCDMX.escuelas[escuela] = { ventas: 0, cursos: 0 };
      dataCDMX.escuelas[escuela].ventas += ventasNum;
      dataCDMX.escuelas[escuela].cursos += cursosNum;

      if (!dataCDMX.porMes[mes]) dataCDMX.porMes[mes] = { ventas: 0, cursos: 0 };
      dataCDMX.porMes[mes].ventas += ventasNum;
      dataCDMX.porMes[mes].cursos += cursosNum;

    } else if (isQRO) {
      dataQRO.ventas += ventasNum;
      dataQRO.cursos += cursosNum;
      
      if (!dataQRO.escuelas[escuela]) dataQRO.escuelas[escuela] = { ventas: 0, cursos: 0 };
      dataQRO.escuelas[escuela].ventas += ventasNum;
      dataQRO.escuelas[escuela].cursos += cursosNum;

      if (!dataQRO.porMes[mes]) dataQRO.porMes[mes] = { ventas: 0, cursos: 0 };
      dataQRO.porMes[mes].ventas += ventasNum;
      dataQRO.porMes[mes].cursos += cursosNum;
    }
  }

  return { cdmx: dataCDMX, qro: dataQRO };
}

export default function DashboardConsejo() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cdmx, setCdmx] = useState(null);
  const [qro, setQro] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const rows = await fetchData();
        const { cdmx, qro } = processData(rows);
        setCdmx(cdmx);
        setQro(qro);
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

  const total = (cdmx?.ventas || 0) + (qro?.ventas || 0);
  const totalCursos = (cdmx?.cursos || 0) + (qro?.cursos || 0);
  const ticket = totalCursos > 0 ? total / totalCursos : 0;

  const comparativoSedes = [
    { sede: 'CDMX', ventas: cdmx?.ventas || 0, cursos: cdmx?.cursos || 0 },
    { sede: 'Querétaro', ventas: qro?.ventas || 0, cursos: qro?.cursos || 0 }
  ];

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

  const todasEscuelas = [
    ...Object.entries(cdmx?.escuelas || {}).map(([nombre, data]) => ({
      nombre: nombre + ' (CDMX)',
      ventas: data.ventas,
      cursos: data.cursos
    })),
    ...Object.entries(qro?.escuelas || {}).map(([nombre, data]) => ({
      nombre: nombre + ' (QRO)',
      ventas: data.ventas,
      cursos: data.cursos
    }))
  ].sort((a, b) => b.ventas - a.ventas);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Consejo</h1>
          <p className="text-gray-600 mt-2">Vista consolidada CDMX + Querétaro</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">CDMX</p>
                <p className="text-3xl font-bold">${(cdmx?.ventas || 0).toLocaleString()}</p>
                <p className="text-blue-100 text-sm">{(cdmx?.cursos || 0)} cursos</p>
              </div>
              <Building className="w-8 h-8 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Querétaro</p>
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
            <h3 className="text-lg font-semibold mb-4">Cursos Vendidos por Mes</h3>
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
            <h3 className="text-lg font-semibold mb-4">Comparativo Ventas por Sede</h3>
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
            <h3 className="text-lg font-semibold mb-4">Comparativo Cursos por Sede</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparativoS
