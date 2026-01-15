import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, Building, Target } from 'lucide-react';

function parseNumber(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const num = parseFloat(String(value).replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

async function fetchData() {
  const apiKey = process.env.REACT_APP_GSHEETS_API_KEY;
  const spreadsheetId = '1DHt8N8bEPElP4Stu1m2Wwb2brO3rLKOSuM8y_Ca3nVg';
  const range = 'Ventas Consolidadas!A:H';

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();
  return data.values;
}


function processData(rows, sede) {
  if (!rows || rows.length < 2) return { sede, ventas: 0, cursos: 0, escuelas: {} };
  
  let ventas = 0;
  let cursos = 0;
  const escuelas = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || !row[1]) continue;

    const escuela = row[1];
    const ventasNum = parseNumber(row[4]);
    const cursosNum = parseNumber(row[5]) || 1;

    ventas += ventasNum;
    cursos += cursosNum;

    if (!escuelas[escuela]) escuelas[escuela] = { ventas: 0, cursos: 0 };
    escuelas[escuela].ventas += ventasNum;
    escuelas[escuela].cursos += cursosNum;
  }

  return { sede, ventas, cursos, escuelas };
}

export default function DashboardConsejo() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cdmx, setCdmx] = useState(null);
  const [qro, setQro] = useState(null);

  useEffect(() => {
  async function load() {
    try {
      const data = await fetchData();
      const allData = processData(data, 'TODAS');
      
      // Separar por escuela que contenga "Qro" o "Querétaro" en el nombre
      const escuelasCDMX = {};
      const escuelasQRO = {};
      
      Object.entries(allData.escuelas).forEach(([nombre, datos]) => {
        if (nombre.toLowerCase().includes('qro') || nombre.toLowerCase().includes('querétaro')) {
          escuelasQRO[nombre] = datos;
        } else {
          escuelasCDMX[nombre] = datos;
        }
      });
      
      const ventasCDMX = Object.values(escuelasCDMX).reduce((sum, e) => sum + e.ventas, 0);
      const cursosCDMX = Object.values(escuelasCDMX).reduce((sum, e) => sum + e.cursos, 0);
      const ventasQRO = Object.values(escuelasQRO).reduce((sum, e) => sum + e.ventas, 0);
      const cursosQRO = Object.values(escuelasQRO).reduce((sum, e) => sum + e.cursos, 0);
      
      setCdmx({ ventas: ventasCDMX, cursos: cursosCDMX, escuelas: escuelasCDMX });
      setQro({ ventas: ventasQRO, cursos: cursosQRO, escuelas: escuelasQRO });

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

  const chartData = [
    { sede: 'CDMX', ventas: cdmx?.ventas || 0 },
    { sede: 'Querétaro', ventas: qro?.ventas || 0 }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Dashboard Consejo</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-500 rounded-lg shadow p-6 text-white">
            <Building className="w-8 h-8 mb-2" />
            <p className="text-sm">CDMX</p>
            <p className="text-2xl font-bold">${(cdmx?.ventas || 0).toLocaleString()}</p>
          </div>

          <div className="bg-purple-500 rounded-lg shadow p-6 text-white">
            <Building className="w-8 h-8 mb-2" />
            <p className="text-sm">Querétaro</p>
            <p className="text-2xl font-bold">${(qro?.ventas || 0).toLocaleString()}</p>
          </div>

          <div className="bg-green-500 rounded-lg shadow p-6 text-white">
            <DollarSign className="w-8 h-8 mb-2" />
            <p className="text-sm">Total</p>
            <p className="text-2xl font-bold">${total.toLocaleString()}</p>
          </div>

          <div className="bg-orange-500 rounded-lg shadow p-6 text-white">
            <Target className="w-8 h-8 mb-2" />
            <p className="text-sm">Ticket Promedio</p>
            <p className="text-2xl font-bold">${Math.round(ticket).toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Comparativo</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sede" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="ventas" fill="#22C55E" name="Ventas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
