import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Minus, DollarSign, ShoppingCart, Bell, RefreshCw, Wifi, WifiOff, User, Building, BookOpen, Book, BarChart3, Activity } from 'lucide-react';

// 🔧 Configuración Google Sheets
const GOOGLE_SHEETS_CONFIG = {
  apiKey: 'TU_API_KEY',
  spreadsheetId: 'TU_SPREADSHEET_ID',
  range: 'Ventas!A:G'
};

// Datos de respaldo
const fallbackData = {
  "2024-07": {
    "Polanco": {
      "Maquillaje": {
        "Maquillaje Básico": { ventas: 28000, cursos: 24, instructor: "Ana Martínez" },
        "Maquillaje Profesional": { ventas: 42000, cursos: 18, instructor: "Sofia López" }
      }
    },
    "Online": {
      "Maquillaje": {
        "Curso Online Básico": { ventas: 25000, cursos: 50, instructor: "Ana Martínez" }
      }
    }
  }
};

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState("2024-07");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [metricType, setMetricType] = useState("ventas");
  const [viewType, setViewType] = useState("executive");

  const [salesData, setSalesData] = useState(fallbackData);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isManualRefresh, setIsManualRefresh] = useState(false);

  // 🔧 Función para parsear números
  const parseNumberFromString = (value) => {
    if (!value) return 0;
    const str = value.toString().trim();
    if (!str) return 0;
    const cleaned = str.replace(/[$,\s]/g, '').replace(/[^\d.-]/g, '');
    const number = parseFloat(cleaned);
    return isNaN(number) ? 0 : number;
  };

  // Obtener datos desde Google Sheets
  const fetchGoogleSheetsData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setIsManualRefresh(showLoading);
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.range}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      const data = await response.json();
      if (!data.values || data.values.length === 0) throw new Error('No se encontraron datos');
      const transformedData = transformGoogleSheetsData(data.values);
      setSalesData(transformedData);
      setConnectionStatus('connected');
      setLastUpdated(new Date());
    } catch (error) {
      console.error(error);
      setConnectionStatus('error');
      if (Object.keys(salesData).length === 0) setSalesData(fallbackData);
    } finally {
      setIsLoading(false);
      setIsManualRefresh(false);
    }
  };

  // Transformar datos de Google Sheets
  const transformGoogleSheetsData = (rawData) => {
    const rows = rawData.slice(1);
    const transformedData = {};
    rows.forEach((row) => {
      const [fecha, escuela, area, curso, ventas, cursosVendidos, instructor] = row;
      if (!fecha || !escuela || !area || !curso) return;
      const monthKey = fecha.substring(0, 7);
      if (!transformedData[monthKey]) transformedData[monthKey] = {};
      if (!transformedData[monthKey][escuela]) transformedData[monthKey][escuela] = {};
      if (!transformedData[monthKey][escuela][area]) transformedData[monthKey][escuela][area] = {};
      const ventasNum = parseNumberFromString(ventas);
      const cursosNum = parseNumberFromString(cursosVendidos) || 1;
      if (transformedData[monthKey][escuela][area][curso]) {
        transformedData[monthKey][escuela][area][curso].ventas += ventasNum;
        transformedData[monthKey][escuela][area][curso].cursos += cursosNum;
      } else {
        transformedData[monthKey][escuela][area][curso] = { ventas: ventasNum, cursos: cursosNum, instructor: instructor || 'No asignado' };
      }
    });
    return transformedData;
  };

  useEffect(() => {
    fetchGoogleSheetsData();
  }, []);

  const schools = useMemo(() => {
    const set = new Set();
    Object.values(salesData).forEach(monthData => {
      Object.keys(monthData).forEach(school => set.add(school));
    });
    return Array.from(set);
  }, [salesData]);

  const months = useMemo(() => Object.keys(salesData).sort(), [salesData]);

  const getSchoolTotals = (month) => {
    const totals = {};
    if (!salesData[month]) return totals;
    Object.keys(salesData[month]).forEach(school => {
      totals[school] = { ventas: 0, cursos: 0 };
      Object.keys(salesData[month][school]).forEach(area => {
        Object.keys(salesData[month][school][area]).forEach(course => {
          totals[school].ventas += salesData[month][school][area][course].ventas;
          totals[school].cursos += salesData[month][school][area][course].cursos;
        });
      });
    });
    return totals;
  };

  const formatDateShort = (monthString) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
  };

  const calculateTrend = (values) => {
    if (values.length < 2) return "stable";
    const lastTwo = values.slice(-2);
    const change = ((lastTwo[1] - lastTwo[0]) / lastTwo[0]) * 100;
    if (change > 5) return "up";
    if (change < -5) return "down";
    return "stable";
  };

  const TrendIcon = ({ trend }) => {
    switch (trend) {
      case "up": return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "down": return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  // Dashboard Ejecutivo
  const ExecutiveDashboard = () => (
    <div className="space-y-6">
      {/* Selectores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Métrica</label>
          <select 
            value={metricType}
            onChange={(e) => setMetricType(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="ventas">Ventas ($)</option>
            <option value="cursos">Cursos Vendidos</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Mes</label>
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            {months.map(month => (
              <option key={month} value={month}>{formatDateShort(month)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Escuela</label>
          <select 
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">Todas</option>
            {schools.map(school => (
              <option key={school} value={school}>{school}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tablas */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Ventas por Escuela</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Escuela</th>
                {months.map((month) => (
                  <th key={month} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {formatDateShort(month)}
                  </th>
                ))}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tendencia</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(selectedSchool ? [selectedSchool] : schools).map((school) => {
                const values = months.map((month) => {
                  const totals = getSchoolTotals(month);
                  return totals[school] ? totals[school].ventas : 0;
                });
                const trend = calculateTrend(values);
                return (
                  <tr key={school}>
                    <td className="px-6 py-4 text-sm font-medium">{school}</td>
                    {values.map((val, i) => (
                      <td key={i} className="px-6 py-4 text-sm">{val.toLocaleString()}</td>
                    ))}
                    <td className="px-6 py-4">
                      <TrendIcon trend={trend} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <h3 className="text-lg font-semibold mb-4">Cursos Vendidos por Escuela</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Escuela</th>
                {months.map((month) => (
                  <th key={month} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {formatDateShort(month)}
                  </th>
                ))}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tendencia</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(selectedSchool ? [selectedSchool] : schools).map((school) => {
                const values = months.map((month) => {
                  const totals = getSchoolTotals(month);
                  return totals[school] ? totals[school].cursos : 0;
                });
                const trend = calculateTrend(values);
                return (
                  <tr key={school}>
                    <td className="px-6 py-4 text-sm font-medium">{school}</td>
                    {values.map((val, i) => (
                      <td key={i} className="px-6 py-4 text-sm">{val.toLocaleString()}</td>
                    ))}
                    <td className="px-6 py-4">
                      <TrendIcon trend={trend} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard IDIP</h1>
        {viewType === "executive" && <ExecutiveDashboard />}
      </div>
    </div>
  );
};

export default Dashboard;
