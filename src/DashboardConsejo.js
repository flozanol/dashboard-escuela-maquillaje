import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, TrendingUp, Building, Target } from 'lucide-react';

function parseNumberFromString(value) {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  const str = value.toString().trim();
  if (!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return 0;
  const cleaned = str.replace(/,/g, '').replace(/[^0-9.-]/g, '');
  if (!cleaned || cleaned === '.' || cleaned === '-') return 0;
  const number = parseFloat(cleaned);
  return isNaN(number) ? 0 : number;
}

async function fetchConsejoData() {
  const apiKey = process.env.REACT_APP_GSHEETS_API_KEY;
  const spreadsheetId = '1DHt8N8bEPElP4Stu1m2Wwb2brO3rLKOSuM8y_Ca3nVg';
  const ranges = ['Ventas!A:H', 'Ventas Qro!A:H'];

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet` +
    `?key=${apiKey}` +
    ranges.map(r => `&ranges=${encodeURIComponent(r)}`).join('');

  const res = await fetch(url);
  const data = await res.json();
  return data.valueRanges;
}

function transformVentasData(rows, sedeName) {
  const headers = rows[0];
  const dataRows = rows.slice(1);
  
  let totalVentas = 0;
  let totalCursos = 0;
  const escuelas = {};

  dataRows.forEach(row => {
    const [fecha, escuela, area, curso, ventas, cursosVendidos] = row;
    if (!fecha || !escuela) return;

    const ventasNum = parseNumberFromString(ventas);
    const cursosNum = parseNumberFromString(cursosVendidos) || 1;

    totalVentas += ventasNum;
    totalCursos += cursosNum;

    if (!escuelas[escuela]) {
      escuelas[escuela] = { ventas: 0, cursos: 0 };
    }
    escuelas[escuela].ventas += ventasNum;
    escuelas[escuela].cursos += cursosNum;
  });

  return {
    sede: sedeName,
    totalVentas,
    totalCursos,
    ticketPromedio: totalCursos > 0 ? totalVentas / totalCursos : 0,
    escuelas
  };
}

export default function DashboardConsejo() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataCDMX, setDataCDMX] = useState(null);
  const [dataQRO, setDataQRO] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const valueRanges = await fetchConsejoData();
        const ventasCdmx = valueRanges[0].values || [];
        const ventasQro = valueRanges[1].values || [];

        const cdmx = transformVentasData(ventasCdmx, 'CDMX');
        const qro = transformVentasData(ventasQro, 'Querétaro');

        setDataCDMX(cdmx);
        setDataQRO(qro);
      } catch (e) {
        console.error(e);
        setError('Error cargando datos del consejo');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p>Cargando...</p></div>;
  if (error) return <div className="flex items-center justify-center min-h-screen"><p className="text-red-600">{error}</p></div>;

  const totalGeneral = (dataCDMX?.totalVentas || 0) + (dataQRO?.totalVentas || 0);
  const cursosGeneral = (dataCDMX?.totalCursos || 0) + (dataQRO?.totalCursos || 0);
  const ticketGeneral = cursosGeneral > 0 ? totalGeneral / cursosGeneral : 0;

  const comparativoSedes = [
    { sede: 'CDMX', ventas: dataCDMX?.totalVentas || 0, cursos: dataCDMX?.totalCursos || 0 },
    { sede: 'Querétaro', ventas: dataQRO?.totalVentas || 0, cursos: dataQRO?.totalCursos || 0 }
  ];

  const escuelasCDMX = Object.entries(dataCDMX?.escuelas || {}).map(([nombre, data]) => ({
    nombre: `${nombre} (CDMX)`,
    ventas: data.ventas,
    cursos: data.cursos
  }));

  const escuelasQRO = Object.entries(dataQRO?.escuelas || {}).map(([nombre, data]) => ({
    nombre: `${nombre} (QRO)`,
    ventas: data.ventas,
    cursos: data.cursos
  }));

  const todasEscuelas = [...escuelasCDMX, ...escuelasQRO].sort((a, b) => b.ventas - a.ventas);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Consejo</h1>
          <p className="text-gray-600 mt-2">Vista consolidada CDMX + Querétaro</p>
        </div>

        {/* KPIs Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">CDMX</p>
                <p className="text-3xl font-bold">${(dataCDMX?.totalVentas || 0).toLocaleString()}</p>
                <p className="text-blue-100 text-sm">{(dataCDMX?.totalCursos || 0)} cursos</p>
              </div>
              <Building className="w-8 h-8 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Querétaro</p>
                <p className="text-3xl font-bold">${(dataQRO?.totalVentas || 0).toLocaleString()}</p>
                <p className="text-purple-100 text-sm">{(dataQRO?.totalCursos || 0)} cursos</p>
              </div>
              <Building className="w-8 h-8 text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total General</p>
                <p className="text-3xl font-bold">${totalGeneral.toLocaleString()}</p>
                <p className="text-green-100 text-sm">{cursosGeneral} cursos</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Ticket Promedio</p>
                <p className="text-3xl font-bold">${Math.round(ticketGeneral).toLocaleString()}</p>
                <p className="text-orange-100 text-sm">Por curso</p>
              </div>
              <Target className="w-8 h-8 text-orange-200" />
            </div>
          </div>
        </div>

        {/* Gráficos Comparativos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Comparativo de Ventas por Sede</h3>
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
            <h3 className="text-lg font-semibold mb-4">Comparativo de Cursos por Sede</h3>
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

        {/* Tabla de Escuelas */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Ranking de Escuelas (Todas las Sedes)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Escuela</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ventas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cursos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket Promedio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">% del Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {todasEscuelas.map((escuela, index) => {
                  const porcentaje = totalGeneral > 0 ? (escuela.ventas / totalGeneral * 100) : 0;
                  const ticket = escuela.cursos > 0 ? escuela.ventas / escuela.cursos : 0;
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{escuela.nombre}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${escuela.ventas.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{escuela.cursos}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${Math.round(ticket).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div className="bg-green-500 
