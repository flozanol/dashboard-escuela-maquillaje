import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Minus, DollarSign, ShoppingCart, Book, RefreshCw, Wifi, WifiOff, User, Building, BookOpen, BarChart3, Star, Target, Activity } from 'lucide-react';

const GOOGLE_SHEETS_CONFIG = {
  apiKey: 'AIzaSyBXvaWWirK1_29g7x6uIq2qlmLdBL9g3TE',
  spreadsheetId: '1DHt8N8bEPElP4Stu1m2Wwb2brO3rLKOSuM8y_Ca3nVg',
  range: 'Ventas!A:G'
};

const fallbackData = {
  "2024-01": {
    "Polanco": {
      "Maquillaje": {
        "Maquillaje Básico": { ventas: 24000, cursos: 20, instructor: "Ana Martínez" },
        "Maquillaje Profesional": { ventas: 35000, cursos: 14, instructor: "Sofia López" }
      }
    },
    "Online": {
      "Maquillaje": {
        "Curso Online Básico": { ventas: 18000, cursos: 36, instructor: "Ana Martínez" }
      }
    }
  },
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
  const [viewType, setViewType] = useState("executive");
  const [metricType, setMetricType] = useState("ventas");
  const [salesData, setSalesData] = useState(fallbackData);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('using_fallback');

  // Función para parsear números
  const parseNumber = (value) => {
    if (!value) return 0;
    const str = value.toString().replace(/[$,\s]/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  // Función para formatear fechas
  const formatDate = (monthString) => {
    try {
      const [year, month] = monthString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
    } catch {
      return monthString;
    }
  };

  const formatDateShort = (monthString) => {
    try {
      const [year, month] = monthString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
    } catch {
      return monthString;
    }
  };

  // Función para obtener datos de Google Sheets
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.range}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error('Error de conexión');
      
      const data = await response.json();
      if (!data.values) throw new Error('Sin datos');
      
      const transformed = transformData(data.values);
      setSalesData(transformed);
      setConnectionStatus('connected');
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error:', error);
      setConnectionStatus('error');
      setSalesData(fallbackData);
    }
    setIsLoading(false);
  };

  // Transformar datos de Google Sheets
  const transformData = (rawData) => {
    const rows = rawData.slice(1);
    const result = {};
    
    rows.forEach(row => {
      const [fecha, escuela, area, curso, ventas, cursos, instructor] = row;
      if (!fecha || !escuela || !area || !curso) return;
      
      const month = fecha.substring(0, 7);
      if (!result[month]) result[month] = {};
      if (!result[month][escuela]) result[month][escuela] = {};
      if (!result[month][escuela][area]) result[month][escuela][area] = {};
      
      if (!result[month][escuela][area][curso]) {
        result[month][escuela][area][curso] = {
          ventas: parseNumber(ventas),
          cursos: parseNumber(cursos) || 1,
          instructor: instructor || 'Sin asignar'
        };
      } else {
        result[month][escuela][area][curso].ventas += parseNumber(ventas);
        result[month][escuela][area][curso].cursos += parseNumber(cursos) || 1;
      }
    });
    
    return result;
  };

  // Estados derivados
  const schools = useMemo(() => {
    const set = new Set();
    Object.values(salesData).forEach(month => {
      Object.keys(month).forEach(school => set.add(school));
    });
    return Array.from(set);
  }, [salesData]);

  const months = useMemo(() => Object.keys(salesData).sort(), [salesData]);

  // Función para obtener totales por escuela
  const getSchoolTotals = (month) => {
    const totals = {};
    if (!salesData[month]) return totals;
    
    Object.keys(salesData[month]).forEach(school => {
      totals[school] = { ventas: 0, cursos: 0 };
      Object.values(salesData[month][school]).forEach(area => {
        Object.values(area).forEach(course => {
          totals[school].ventas += course.ventas;
          totals[school].cursos += course.cursos;
        });
      });
    });
    return totals;
  };

  // Función para obtener totales de vendedores
  const getVendedorTotals = (month) => {
    const totals = {};
    if (!salesData[month]) return totals;
    
    Object.values(salesData[month]).forEach(school => {
      Object.values(school).forEach(area => {
        Object.values(area).forEach(course => {
          const vendedor = course.instructor;
          if (vendedor && vendedor !== 'Sin asignar') {
            if (!totals[vendedor]) {
              totals[vendedor] = { ventas: 0, cursos: 0 };
            }
            totals[vendedor].ventas += course.ventas;
            totals[vendedor].cursos += course.cursos;
          }
        });
      });
    });
    return totals;
  };

  // KPIs ejecutivos
  const executiveKPIs = useMemo(() => {
    const current = salesData[selectedMonth];
    if (!current) return { totalVentas: 0, totalCursos: 0, growth: 0 };
    
    let totalVentas = 0, totalCursos = 0;
    Object.values(current).forEach(school => {
      Object.values(school).forEach(area => {
        Object.values(area).forEach(course => {
          totalVentas += course.ventas;
          totalCursos += course.cursos;
        });
      });
    });
    
    // Calcular crecimiento
    const currentIndex = months.indexOf(selectedMonth);
    const previousMonth = currentIndex > 0 ? months[currentIndex - 1] : null;
    let growth = 0;
    
    if (previousMonth && salesData[previousMonth]) {
      let prevTotal = 0;
      Object.values(salesData[previousMonth]).forEach(school => {
        Object.values(school).forEach(area => {
          Object.values(area).forEach(course => {
            prevTotal += course.ventas;
          });
        });
      });
      growth = prevTotal ? ((totalVentas - prevTotal) / prevTotal) * 100 : 0;
    }
    
    return {
      totalVentas,
      totalCursos,
      growth,
      ticketPromedio: totalCursos ? totalVentas / totalCursos : 0
    };
  }, [selectedMonth, salesData, months]);

  // Cargar datos al inicio
  useEffect(() => {
    fetchData();
  }, []);

  // Componentes
  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-sm">
      {connectionStatus === 'connected' && (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          <span className="text-green-600">Conectado a Google Sheets</span>
        </>
      )}
      {connectionStatus === 'error' && (
        <>
          <WifiOff className="w-4 h-4 text-red-500" />
          <span className="text-red-600">Error - Usando datos de respaldo</span>
        </>
      )}
      {connectionStatus === 'using_fallback' && (
        <>
          <WifiOff className="w-4 h-4 text-gray-500" />
          <span className="text-gray-600">Usando datos de ejemplo</span>
        </>
      )}
      {lastUpdated && (
        <span className="text-gray-500 ml-2">
          • Actualizado: {lastUpdated.toLocaleTimeString()}
        </span>
      )}
    </div>
  );

  // Dashboard Ejecutivo
  const ExecutiveDashboard = () => {
    const monthlyData = schools.map(school => {
      const data = { name: school, months: {} };
      months.forEach(month => {
        const totals = getSchoolTotals(month);
        data.months[month] = totals[school] || { ventas: 0, cursos: 0 };
      });
      return data;
    });

    return (
      <div className="space-y-6">
        {/* Estado de conexión */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <ConnectionStatus />
            <button
              onClick={fetchData}
              disabled={isLoading}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium ${
                isLoading 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>
        </div>

        {/* Controles */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Configuración del Dashboard</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mes</label>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500"
              >
                {months.map(month => (
                  <option key={month} value={month}>
                    {formatDate(month)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Escuela</label>
              <select 
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todas las escuelas</option>
                {schools.map(school => (
                  <option key={school} value={school}>{school}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Métrica</label>
              <select 
                value={metricType}
                onChange={(e) => setMetricType(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500"
              >
                <option value="ventas">Ventas ($)</option>
                <option value="cursos">Cursos Vendidos</option>
              </select>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Ventas Totales</p>
                <p className="text-3xl font-bold">${executiveKPIs.totalVentas.toLocaleString()}</p>
                <p className="text-green-100 text-sm">
                  {executiveKPIs.growth > 0 ? '+' : ''}{executiveKPIs.growth.toFixed(1)}% vs mes anterior
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-100 text-sm">Cursos Vendidos</p>
                <p className="text-3xl font-bold">{executiveKPIs.totalCursos.toLocaleString()}</p>
                <p className="text-gray-100 text-sm">Unidades totales</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-gray-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-400 to-green-500 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Ticket Promedio</p>
                <p className="text-3xl font-bold">${executiveKPIs.ticketPromedio.toFixed(0)}</p>
                <p className="text-green-100 text-sm">Por curso vendido</p>
              </div>
              <Target className="w-8 h-8 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-100 text-sm">Escuelas Activas</p>
                <p className="text-3xl font-bold">{schools.length}</p>
                <p className="text-gray-100 text-sm">Ubicaciones</p>
              </div>
              <Building className="w-8 h-8 text-gray-200" />
            </div>
          </div>
        </div>

        {/* Tabla de Cursos Vendidos */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Cursos Vendidos por Escuela - Análisis Mensual</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Escuela</th>
                  {months.map(month => (
                    <th key={month} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      {formatDateShort(month)}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center text-xs font-medium text-green-600 uppercase font-bold">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {monthlyData.map((school, index) => (
                  <tr key={school.name} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-500" />
                        {school.name}
                      </div>
                    </td>
                    {months.map(month => (
                      <td key={month} className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                        {school.months[month]?.cursos?.toLocaleString() || '0'}
                      </td>
                    ))}
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-bold text-green-600">
                      {Object.values(school.months).reduce((sum, m) => sum + (m.cursos || 0), 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla de Ventas */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold">Ventas en Pesos por Escuela - Análisis Mensual</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Escuela</th>
                  {months.map(month => (
                    <th key={month} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      {formatDateShort(month)}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center text-xs font-medium text-green-600 uppercase font-bold">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {monthlyData.map((school, index) => (
                  <tr key={school.name} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-500" />
                        {school.name}
                      </div>
                    </td>
                    {months.map(month => (
                      <td key={month} className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                        ${(school.months[month]?.ventas || 0).toLocaleString()}
                      </td>
                    ))}
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-bold text-green-600">
                      ${Object.values(school.months).reduce((sum, m) => sum + (m.ventas || 0), 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfica y Top Vendedores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Tendencia Mensual</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={months.map(month => {
                  const totals = getSchoolTotals(month);
                  return {
                    month: formatDateShort(month),
                    ventas: Object.values(totals).reduce((sum, s) => sum + s.ventas, 0),
                    cursos: Object.values(totals).reduce((sum, s) => sum + s.cursos, 0)
                  };
                })}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="ventas" orientation="left" />
                  <YAxis yAxisId="cursos" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="ventas" type="monotone" dataKey="ventas" stroke="#22C55E" strokeWidth={3} name="Ventas ($)" />
                  <Line yAxisId="cursos" type="monotone" dataKey="cursos" stroke="#6B7280" strokeWidth={2} name="Cursos" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-semibold">Top Vendedores</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(getVendedorTotals(selectedMonth))
                .sort(([,a], [,b]) => b.ventas - a.ventas)
                .slice(0, 5)
                .map(([vendedor, data], index) => (
                  <div key={vendedor} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{vendedor}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">${data.ventas.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{data.cursos} cursos</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="flex items-center bg-white rounded-lg shadow-md p-4">
              <div className="flex">
                <div className="w-3 h-16 bg-gradient-to-b from-green-400 to-green-600 rounded-l-lg"></div>
                <div className="flex flex-col justify-center px-2">
                  <div className="text-4xl font-bold text-gray-700">IDIP</div>
                </div>
              </div>
              <div className="ml-4 text-left">
                <div className="text-lg font-medium text-gray-700">Maquillaje</div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="text-lg font-medium text-gray-700">Imagen</div>
                </div>
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard IDIP</h1>
        </div>

        {/* Navegación */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setViewType("executive")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "executive" 
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg" 
                : "bg-gray-100 text-gray-700 hover:bg-green-50"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard Ejecutivo
            </button>
          </div>
        </div>

        {/* Contenido */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-green-500" />
            <p className="text-gray-600">Cargando datos...</p>
          </div>
        )}

        {!isLoading && <ExecutiveDashboard />}
      </div>
    </div>
  );
};

export default Dashboard;
