// CobranzaDashboard.js
import React, { useEffect, useState } from 'react';

/**
 * Convierte una cadena con separadores de miles (puntos o espacios) y coma decimal
 * al número JavaScript correcto.
 */
const parseNumberFromString = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  let str = value.toString().trim();
  // 1) Eliminar separador de miles (puntos y espacios)
  str = str.replace(/[\.\s]/g, '');
  // 2) Reemplazar coma decimal por punto
  str = str.replace(/,/g, '.');
  // 3) Eliminar cualquier carácter que no sea dígito, punto o signo
  str = str.replace(/[^\d.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

/**
 * Ordena un array de etiquetas de mes ("YYYY-MM", "Mes YYYY", abreviado o completo)
 * de forma cronológica.
 */
const sortMonthsChronologically = (months) => {
  const monthMap = {
    enero:1, ene:1,
    febrero:2, feb:2,
    marzo:3, mar:3,
    abril:4, abr:4,
    mayo:5,
    junio:6, jun:6,
    julio:7, jul:7,
    agosto:8, ago:8,
    septiembre:9, sept:9, sep:9,
    octubre:10, oct:10,
    noviembre:11, nov:11,
    diciembre:12, dic:12
  };

  const parseDate = (s) => {
    // Formato ISO YYYY-MM
    if (/^\d{4}-\d{2}$/.test(s)) {
      return new Date(s + '-01');
    }
    // Formato "Mes YYYY" o "Abr de 2025"
    const clean = s.toLowerCase().replace(/ de /, ' ').trim();
    const parts = clean.split(/\s+/);
    if (parts.length === 2) {
      const [monthTxt, yearTxt] = parts;
      const m = monthMap[monthTxt];
      const y = parseInt(yearTxt, 10);
      if (m && y) return new Date(y, m - 1, 1);
    }
    // Fallback a Date.parse
    const d = new Date(s);
    return isNaN(d) ? new Date(0) : d;
  };

  return months.sort((a, b) => parseDate(a) - parseDate(b));
};

/**
 * Transforma las filas de la hoja de cálculo en un objeto:
 * {
 *   [escuela]: { [mes]: totalImporte }
 * }
 * Acumula múltiple registros de la misma escuela y mes.
 */
const transformCobranzaData = (rows) => {
  const result = {};
  rows.forEach((row) => {
    const escuela = row.Escuela?.trim() || 'Desconocido';
    const mes = row.Mes?.trim() || '';
    const importeRaw = row.Importe || row.Monto || '';
    const importe = parseNumberFromString(importeRaw);

    if (!escuela || !mes) return;

    if (!result[escuela]) {
      result[escuela] = {};
    }
    if (!result[escuela][mes]) {
      result[escuela][mes] = 0;
    }
    result[escuela][mes] += importe;
  });
  return result;
};

/**
 * Componente principal para el dashboard de Cobranza.
 */
const CobranzaDashboard = () => {
  const [data, setData] = useState({});
  const [months, setMonths] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('YOUR_GOOGLE_SHEETS_API_URL');
        const json = await response.json();
        // Asumimos: json.values = [ [headers], [fila1], [fila2], ... ]
        const [header, ...rows] = json.values;
        const headerMap = header.reduce((map, cell, idx) => {
          map[cell.toString().toLowerCase()] = idx;
          return map;
        }, {});

        const parsedRows = rows.map((r) => ({
          Escuela: r[headerMap['escuela']] || '',
          Mes: r[headerMap['mes']] || '',
          Importe: r[headerMap['importe']] || ''
        }));

        const transformed = transformCobranzaData(parsedRows);
        setData(transformed);

        // Extraer y ordenar meses únicos
        const monthSet = new Set();
        Object.values(transformed).forEach((mesObj) => {
          Object.keys(mesObj).forEach((m) => monthSet.add(m));
        });
        const sorted = sortMonthsChronologically(Array.from(monthSet));
        setMonths(sorted);
      } catch (error) {
        console.error('Error al obtener datos de Cobranza:', error);
      }
    };
    fetchData();
  }, []);

  // Totales globales por mes
  const monthTotals = months.reduce((acc, month) => {
    acc[month] = Object.values(data).reduce(
      (sum, escuelaData) => sum + (escuelaData[month] || 0),
      0
    );
    return acc;
  }, {});

  return (
    <div>
      <h2>Dashboard de Cobranza</h2>
      <table>
        <thead>
          <tr>
            <th>Escuela</th>
            {months.map((m) => (
              <th key={m}>{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(data).map(([escuela, mesData]) => (
            <tr key={escuela}>
              <td>{escuela}</td>
              {months.map((m) => (
                <td key={m}>
                  {mesData[m]
                    ? mesData[m].toLocaleString('es-MX', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            {months.map((m) => (
              <td key={m}>
                {monthTotals[m].toLocaleString('es-MX', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default CobranzaDashboard;
