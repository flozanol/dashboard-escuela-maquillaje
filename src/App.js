import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus, DollarSign, ShoppingCart, Bell, RefreshCw, Wifi, WifiOff, User, Building2, GraduationCap, Calendar, Search, Filter, BookOpen, Phone, Mail, Globe, MessageSquare, Users } from 'lucide-react';

const GOOGLE_SHEETS_CONFIG = {
  apiKey: 'AIzaSyBXvaWWirK1_29g7x6uI... (tu API key aquí)',
  spreadsheetId: '1R3... (tu spreadsheet aquí)',
  ranges: {
    ventas: 'Ventas!A:H', // Ampliamos hasta la columna H para incluir "Medio de Contacto"
    cobranza: 'Cobranza!A:Z',
    tablaIngresos: 'Tabla Ingresos!A:B'
  }
};

// ===== Datos de respaldo (fallback) y configuraciones iniciales (recortado por brevedad del ejemplo) =====
const fallbackData = {
  "2024-06": {
    "Polanco": {
      "Maquillaje": {
        "Curso Intensivo Maquillaje": { ventas: 50000, cursos: 40, instructor: "Ana Martínez" },
        "Taller de Maquillaje Social": { ventas: 32000, cursos: 25, instructor: "Luis Pérez" }
      },
      "Peluquería": {
        "Corte y Color Avanzado": { ventas: 40000, cursos: 20, instructor: "Ana Martínez" },
        "Barbería Moderna": { ventas: 28000, cursos: 22, instructor: "Carlos Gómez" }
      }
    },
    "Coyoacán": {
      "Maquillaje": {
        "Curso Intensivo Maquillaje": { ventas: 42000, cursos: 38, instructor: "María López" },
        "Taller de Maquillaje Social": { ventas: 30000, cursos: 20, instructor: "Juan Hernández" }
      },
      "Peluquería": {
        "Corte y Color Avanzado": { ventas: 35000, cursos: 25, instructor: "Ana Martínez" },
        "Barbería Moderna": { ventas: 26000, cursos: 18, instructor: "Luis Pérez" }
      }
    }
  },
  "2024-07": {
    "Polanco": {
      "Maquillaje": {
        "Curso Intensivo Maquillaje": { ventas: 60000, cursos: 45, instructor: "Ana Martínez" },
        "Taller de Maquillaje Social": { ventas: 35000, cursos: 30, instructor: "Luis Pérez" }
      },
      "Peluquería": {
        "Corte y Color Avanzado": { ventas: 45000, cursos: 28, instructor: "María López" },
        "Barbería Moderna": { ventas: 30000, cursos: 24, instructor: "Carlos Gómez" }
      }
    },
    "Coyoacán": {
      "Maquillaje": {
        "Curso Intensivo Maquillaje": { ventas: 50000, cursos: 40, instructor: "Juan Hernández" },
        "Taller de Maquillaje Social": { ventas: 33000, cursos: 26, instructor: "Ana Martínez" }
      },
      "Peluquería": {
        "Corte y Color Avanzado": { ventas: 37000, cursos: 22, instructor: "María López" },
        "Barbería Moderna": { ventas: 27000, cursos: 20, instructor: "Luis Pérez" }
      }
    }
  }
};

const fallbackContactData = {
  "2024-06": {
    "WhatsApp": { ventas: 42000, cursos: 33 },
    "Instagram": { ventas: 38000, cursos: 35 },
    "Facebook": { ventas: 35000, cursos: 28 },
    "Teléfono": { ventas: 22000, cursos: 18 },
    "Email": { ventas: 18000, cursos: 15 }
  },
  "2024-07": {
    "WhatsApp": { ventas: 45000, cursos: 35 },
    "Instagram": { ventas: 40000, cursos: 34 },
    "Facebook": { ventas: 36000, cursos: 30 },
    "Teléfono": { ventas: 25000, cursos: 20 },
    "Email": { ventas: 20000, cursos: 16 }
  }
};

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState("2024-07");
  const [selectedSchool, setSelectedSchool] = useState("Polanco");
  const [selectedArea, setSelectedArea] = useState("Maquillaje");
  const [selectedInstructor, setSelectedInstructor] = useState("");
  const [viewType, setViewType] = useState("executive");
  const [metricType, setMetricType] = useState("ventas");
  const [compareMonths, setCompareMonths] = useState(["2024-06", "2024-07"]);
  const [salesData, setSalesData] = useState(fallbackData);
  const [cobranzaData, setCobranzaData] = useState({});
  const [tablaIngresos, setTablaIngresos] = useState([]); // ← NUEVO
  const [contactData, setContactData] = useState(fallbackContactData); // Nuevo estado para medios de contacto
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  const [isManualRefresh, setIsManualRefresh] = useState(false);

  // ===== utilidades de formato y helpers (recortado) =====
  const formatCurrency = (value) => {
    const num = typeof value === 'number' ? value : parseFloat(value) || 0;
    return num.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  };

  const parseNumberFromString = (value) => {
    // Si ya es un número, retornarlo directamente
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    // Convertir a string y limpiar
    const str = value.toString().trim();
    if (str === '' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return 0;
    // Remover símbolos de moneda, comas, espacios y otros caracteres no numéricos
    // Mantener solo dígitos, punto decimal y signo negativo
    const cleaned = str
      .replace(/[$,\s]/g, '')
      .replace(/[^\d.-]/g, '');
    if (cleaned === '' || cleaned === '.' || cleaned === '-' || cleaned === '-.' || isNaN(Number(cleaned))) return 0;
    const parsed = Number(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // ===== Fetch principal a Google Sheets =====
  const fetchGoogleSheetsData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setIsManualRefresh(showLoading);

    try {
      // Ventas
      const ventasUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${encodeURIComponent(GOOGLE_SHEETS_CONFIG.ranges.ventas)}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`;
      const ventasResponse = await fetch(ventasUrl);
      if (!ventasResponse.ok) throw new Error(`Error ${ventasResponse.status}: ${ventasResponse.statusText}`);
      const ventasData = await ventasResponse.json();
      const transformedVentas = transformGoogleSheetsData(ventasData.values);
      const transformedContact = transformContactData(ventasData.values);
      setSalesData(transformedVentas);
      setContactData(transformedContact);

      // Cobranza
      const cobranzaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${encodeURIComponent(GOOGLE_SHEETS_CONFIG.ranges.cobranza)}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`;
      const cobranzaResponse = await fetch(cobranzaUrl);
      if (!cobranzaResponse.ok) throw new Error(`Error ${cobranzaResponse.status}: ${cobranzaResponse.statusText}`);
      const cobranzaData = await cobranzaResponse.json();
      const transformedCobranza = transformCobranzaData(cobranzaData.values);
      setCobranzaData(transformedCobranza);

      // ▶ Tabla Ingresos (A:B) — NUEVO
      const ingresosUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${encodeURIComponent(GOOGLE_SHEETS_CONFIG.ranges.tablaIngresos)}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`;
      const ingresosResponse = await fetch(ingresosUrl);
      if (!ingresosResponse.ok) throw new Error(`Error ${ingresosResponse.status}: ${ingresosResponse.statusText}`);
      const ingresosData = await ingresosResponse.json();
      const transformedIngresos = transformTablaIngresosData(ingresosData.values);
      setTablaIngresos(transformedIngresos);

      setConnectionStatus('connected');
      setLastUpdated(new Date());
      setErrorMessage('');
    } catch (error) {
      console.error('Error fetching Google Sheets data:', error);
      setConnectionStatus('error');
      setErrorMessage(error.message);
      if (Object.keys(salesData).length === 0) {
        setSalesData(fallbackData);
        setContactData(fallbackContactData);
      }
    } finally {
      setIsLoading(false);
      setIsManualRefresh(false);
    }
  };

  useEffect(() => {
    fetchGoogleSheetsData(false);
  }, []);

  // ===== Transformaciones =====

  // (ya existente) transforma datos de contacto desde "Ventas!A:H"
  const transformContactData = (rawData) => {
    const headers = rawData[0];
    const rows = rawData.slice(1);
    const transformedData = {};
    console.log('📞 Transformando datos de medios de contacto...');
    console.log('Headers:', headers);

    rows.forEach((row, index) => {
      const [fecha, escuela, area, curso, ventas, cursosVendidos, instructor, medioContacto] = row;

      if (!fecha || !medioContacto) return;

      // Normalizar fecha a YYYY-MM (si viene dd/mm/aaaa)
      let dateStr = fecha;
      if (typeof fecha === 'number') {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const jsDate = new Date(excelEpoch.getTime() + (fecha * 24 * 60 * 60 * 1000));
        dateStr = `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, '0')}-${String(jsDate.getDate()).padStart(2, '0')}`;
      }
      const monthKey = dateStr.slice(0, 7);
      const medio = String(medioContacto).trim() || 'Otro';

      if (!transformedData[monthKey]) transformedData[monthKey] = {};
      if (!transformedData[monthKey][medio]) transformedData[monthKey][medio] = { ventas: 0, cursos: 0 };

      const ventasNum = parseNumberFromString(ventas);
      const cursosNum = parseNumberFromString(cursosVendidos) || 1;

      transformedData[monthKey][medio].ventas += ventasNum;
      transformedData[monthKey][medio].cursos += cursosNum;
    });

    console.log('✅ Datos de contacto transformados:', transformedData);
    return transformedData;
  };

  // (nuevo) transforma "Tabla Ingresos!A:B" a [{label, value}]
  const transformTablaIngresosData = (rawValues) => {
    if (!rawValues || rawValues.length === 0) return [];
    const rows = rawValues[0] && typeof rawValues[0][1] === 'string'
      ? rawValues.slice(1)
      : rawValues;
    return rows
      .filter(r => r && r[0] !== undefined && r[1] !== undefined && `${r[0]}`.trim() !== '')
      .map(([label, value]) => ({
        label: `${label}`.trim(),
        value: parseNumberFromString(value) || 0
      }));
  };

  // (ya existente) transforma "Cobranza"
  const transformCobranzaData = (rawData) => {
    if (!rawData || rawData.length === 0) return {};
    const headers = rawData[0];
    const rows = rawData.slice(1);
    const result = {};

    console.log('🔄 Transformando datos de cobranza...');
    console.log('📋 Headers cobranza:', headers);
    console.log('📊 Filas de datos:', rows.length);

    // La primera columna es la escuela, las siguientes son meses
    const meses = headers.slice(1).map(h => String(h).trim()).filter(Boolean);

    rows.forEach((row, rowIndex) => {
      const escuela = row[0];
      if (!escuela || escuela.trim() === '') return;
      const escuelaClean = escuela.trim();
      result[escuelaClean] = {};
      meses.forEach((mes, mesIndex) => {
        const rawValue = row[mesIndex + 1];
        const value = parseNumberFromString(rawValue);
        result[escuelaClean][mes] = value;
      });
    });

    console.log('✅ Cobranza transformada:', result);
    return result;
  };

  // ======= UI: Contenedor principal con tabs, etc. (recortado) =======
  // ... aquí va tu navegación entre vistas (executive / cobranza / etc.) ...

  // ==================== COBRANZA DASHBOARD ====================
  const CobranzaDashboard = () => {
    // Obtener todos los meses únicos de los datos de cobranza y ordenarlos cronológicamente
    const mesesCobranza = useMemo(() => {
      if (!cobranzaData || Object.keys(cobranzaData).length === 0) return [];
      const meses = new Set();
      Object.values(cobranzaData).forEach(escuelaData => {
        Object.keys(escuelaData).forEach(mes => {
          if (mes && mes.trim() !== '') meses.add(mes.trim());
        });
      });
      const mesesArray = Array.from(meses);
      return sortMonthsChronologically(mesesArray);
    }, [cobranzaData]);

    // Calcular totales por mes
    const totalesPorMes = useMemo(() => {
      const totales = {};
      Object.values(cobranzaData || {}).forEach(escuelaData => {
        Object.entries(escuelaData).forEach(([mes, valor]) => {
          if (!totales[mes]) totales[mes] = 0;
          totales[mes] += Number(valor) || 0;
        });
      });
      return totales;
    }, [cobranzaData]);

    // Render
    return (
      <div className="space-y-6">
        {/* Resumen de Cobranza */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Cobranza</p>
                <p className="text-3xl font-bold">
                  ${Object.values(totalesPorMes).reduce((a, b) => a + (Number(b) || 0), 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-10 h-10 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg shadow p-6 text-white">
            <p className="text-emerald-100 text-sm">Meses con datos</p>
            <p className="text-3xl font-bold">{mesesCobranza.length}</p>
          </div>
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg shadow p-6 text-white">
            <p className="text-indigo-100 text-sm">Escuelas</p>
            <p className="text-3xl font-bold">{Object.keys(cobranzaData || {}).length}</p>
          </div>
        </div>

        {/* ... aquí van tus otros gráficos/segmentos de la vista Cobranza ... */}

        {/* Tabla y Gráfico: Tabla Ingresos (A:B) — NUEVO */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Ingresos (Tabla Ingresos A:B)</h3>
          {(!tablaIngresos || tablaIngresos.length === 0) ? (
            <p className="text-sm text-gray-500">No hay datos en “Tabla Ingresos”.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tabla */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Concepto / Fecha (Col. A)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monto (Col. B)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tablaIngresos.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-sm text-gray-900">{row.label}</td>
                          <td className="px-6 py-3 text-sm font-medium text-gray-900">
                            ${row.value.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-semibold">
                        <td className="px-6 py-3 text-sm text-gray-900">Total</td>
                        <td className="px-6 py-3 text-sm text-gray-900">
                          ${tablaIngresos.reduce((s, r) => s + (r.value || 0), 0).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Gráfico (BarChart) */}
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tablaIngresos}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        angle={-45}
                        textAnchor="end"
                        height={90}
                        fontSize={12}
                      />
                      <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}`, 'Monto']} />
                      <Legend />
                      <Bar dataKey="value" name="Monto" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // ===== Render del Dashboard general (tabs, etc.) =====
  return (
    <div className="p-6 space-y-6">
      {/* Aquí iría tu selector de pestañas, por ejemplo botones para Executive / Cobranza */}
      <CobranzaDashboard />
    </div>
  );
};

// ===== Helpers extra (ordenar meses, parsear fechas, etc.) =====
const monthOrder = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre"
];

const parseMonthFromHeader = (header) => {
  if (!header) return null;
  const str = header.toString().trim().toLowerCase();
  // Soporta cabeceras tipo "Enero 2024", "ene-24", "2024-01", etc.
  const m1 = str.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(\d{4})/i);
  if (m1) {
    const mesIdx = monthOrder.indexOf(m1[1].toLowerCase());
    return `${m1[2]}-${String(mesIdx + 1).padStart(2, '0')}`;
  }
  const m2 = str.match(/(\d{4})[-/](\d{1,2})/);
  if (m2) return `${m2[1]}-${String(m2[2]).padStart(2, '0')}`;
  return header; // fallback: devolver tal cual
};

const sortMonthsChronologically = (months) => {
  return months
    .map(m => {
      const [y, mo] = String(m).split('-');
      return { m, y: Number(y)||0, mo: Number(mo)||0 };
    })
    .sort((a,b) => a.y === b.y ? a.mo - b.mo : a.y - b.y)
    .map(o => o.m);
};

// ===== Transformación de Ventas (resumen) =====
const transformGoogleSheetsData = (rawData) => {
  const headers = rawData[0];
  const rows = rawData.slice(1);
  const result = {};

  rows.forEach((row) => {
    const [fecha, escuela, area, curso, ventas, cursosVendidos, instructor, medioContacto] = row;
    if (!fecha || !escuela || !area || !curso) return;

    // Normalizar fecha a YYYY-MM
    let dateStr = fecha;
    if (typeof fecha === 'number') {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const jsDate = new Date(excelEpoch.getTime() + (fecha * 24 * 60 * 60 * 1000));
      dateStr = `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, '0')}-${String(jsDate.getDate()).padStart(2, '0')}`;
    }
    const monthKey = dateStr.slice(0, 7);

    if (!result[monthKey]) result[monthKey] = {};
    if (!result[monthKey][escuela]) result[monthKey][escuela] = {};
    if (!result[monthKey][escuela][area]) result[monthKey][escuela][area] = {};

    const ventasNum = parseNumberFromString(ventas);
    const cursosNum = parseNumberFromString(cursosVendidos) || 1;

    result[monthKey][escuela][area][curso] = {
      ventas: ventasNum,
      cursos: cursosNum,
      instructor: (instructor || '').toString().trim()
    };
  });

  return result;
};

export default Dashboard;
