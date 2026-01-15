import React, { useEffect, useState } from 'react';

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
  return data.valueRanges; // [CDMX, QRO]
}

// Aquí asumimos que la columna H (posición 7) es el monto de venta.
function sumVentas(rows) {
  let total = 0;
  for (let i = 1; i < rows.length; i++) {
    const valor = parseFloat(rows[i][7] || 0);
    if (!isNaN(valor)) total += valor;
  }
  return total;
}

export default function DashboardConsejo() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totales, setTotales] = useState({ cdmx: 0, qro: 0, total: 0 });

  useEffect(() => {
    async function load() {
      try {
        const valueRanges = await fetchConsejoData();
        const ventasCdmx = valueRanges[0].values || [];
        const ventasQro = valueRanges[1].values || [];

        const totalCdmx = sumVentas(ventasCdmx);
        const totalQro = sumVentas(ventasQro);
        const total = totalCdmx + totalQro;

        setTotales({ cdmx: totalCdmx, qro: totalQro, total });
      } catch (e) {
        console.error(e);
        setError('Error cargando datos del consejo');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div>Cargando consejo...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dashboard Consejo</h1>
      <h2>Ventas Totales</h2>
      <ul>
        <li>CDMX: {totales.cdmx.toLocaleString()}</li>
        <li>QRO: {totales.qro.toLocaleString()}</li>
        <li><strong>TOTAL: {totales.total.toLocaleString()}</strong></li>
      </ul>
    </div>
  );
}
