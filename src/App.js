import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Minus, DollarSign, ShoppingCart, Users, Award, Scissors, Eye, Book, Package, AlertTriangle, Mail, Calendar, Star, Target, Activity, Bell, RefreshCw, Wifi, WifiOff } from 'lucide-react';

// 🔧 AQUÍ CAMBIAS TUS API KEYS - ESTAS SON DE EJEMPLO
const GOOGLE_SHEETS_CONFIG = {
  apiKey: 'AIzaSyBXvaWWirK1_29g7x6uIq2qlmLdBL9g3TE', // 👈 CAMBIA ESTO POR TU API KEY REAL
  spreadsheetId: '1DHt8N8bEPElP4Stu1m2Wwb2brO3rLKOSuM8y_Ca3nVg', // 👈 CAMBIA ESTO POR TU SPREADSHEET ID REAL
  range: 'Ventas!A:G' // 👈 VERIFICA QUE TU HOJA SE LLAME "Ventas"
};

// Datos de respaldo (fallback) en caso de error de conexión
const fallbackData = {
  "2024-01": {
    "Polanco": {
      "Maquillaje": {
        "Maquillaje Básico": { ventas: 24000, cursos: 20, instructor: "Ana Martínez" },
        "Maquillaje Profesional": { ventas: 35000, cursos: 14, instructor: "Sofia López" }
      },
      "Certificaciones": {
        "Certificación Básica": { ventas: 25000, cursos: 25, instructor: "Roberto Silva" }
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
      },
      "Certificaciones": {
        "Certificación Básica": { ventas: 35000, cursos: 35, instructor: "Roberto Silva" }
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
  const [viewType, setViewType] = useState("executive");
  const [metricType, setMetricType] = useState("ventas");
  
  // Estados para Google Sheets
  const [salesData, setSalesData] = useState(fallbackData);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // connected, disconnected, error
  const [errorMessage, setErrorMessage] = useState('');
  const [isManualRefresh, setIsManualRefresh] = useState(false);

  // Función para obtener datos de Google Sheets
  const fetchGoogleSheetsData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setIsManualRefresh(showLoading);
    
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.range}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.values || data.values.length === 0) {
        throw new Error('No se encontraron datos en la hoja de cálculo');
      }
      
      // Transformar datos de Google Sheets al formato esperado
      const transformedData = transformGoogleSheetsData(data.values);
      
      setSalesData(transformedData);
      setConnectionStatus('connected');
      setLastUpdated(new Date());
      setErrorMessage('');
      
    } catch (error) {
      console.error('Error fetching Google Sheets data:', error);
      setConnectionStatus('error');
      setErrorMessage(error.message);
      
      // Si no hay datos previos, usar datos de respaldo
      if (Object.keys(salesData).length === 0) {
        setSalesData(fallbackData);
      }
    } finally {
      setIsLoading(false);
      setIsManualRefresh(false);
    }
  };

  // Función para transformar datos de Google Sheets
  const transformGoogleSheetsData = (rawData) => {
    const headers = rawData[0];
    const rows = rawData.slice(1);
    
    const transformedData = {};
    
    rows.forEach(row => {
      const [fecha, escuela, area, curso, ventas, cursosVendidos, instructor] = row;
      
      if (!fecha || !escuela || !area || !curso) return; // Saltar filas incompletas
      
      // Extraer año-mes de la fecha (asumiendo formato YYYY-MM-DD o similar)
      const monthKey = fecha.substring(0, 7); // "2024-01"
      
      if (!transformedData[monthKey]) {
        transformedData[monthKey] = {};
      }
      
      if (!transformedData[monthKey][escuela]) {
        transformedData[monthKey][escuela] = {};
      }
      
      if (!transformedData[monthKey][escuela][area]) {
        transformedData[monthKey][escuela][area] = {};
      }
      
      transformedData[monthKey][escuela][area][curso] = {
        ventas: parseInt(ventas) || 0,
        cursos: parseInt(cursosVendidos) || 0,
        instructor: instructor || 'No asignado'
      };
    });
    
    return transformedData;
  };

  // Cargar datos iniciales
  useEffect(() => {
    fetchGoogleSheetsData();
  }, []);

  // Actualización automática cada hora
  useEffect(() => {
    const interval = setInterval(() => {
      fetchGoogleSheetsData(false); // Sin mostrar loading para actualizaciones automáticas
    }, 60 * 60 * 1000); // 1 hora

    return () => clearInterval(interval);
  }, []);

  const schools = useMemo(() => {
    const schoolsSet = new Set();
    Object.values(salesData).forEach(monthData => {
      Object.keys(monthData).forEach(school => {
        schoolsSet.add(school);
      });
    });
    return Array.from(schoolsSet);
  }, [salesData]);

  const areas = useMemo(() => {
    const areasSet = new Set();
    Object.values(salesData).forEach(monthData => {
      Object.values(monthData).forEach(schoolData => {
        Object.keys(schoolData).forEach(area => {
          areasSet.add(area);
        });
      });
    });
    return Array.from(areasSet);
  }, [salesData]);

  const months = useMemo(() => {
    return Object.keys(salesData).sort();
  }, [salesData]);

  // Función para calcular tendencia
  const calculateTrend = (values) => {
    if (values.length < 2) return "stable";
    const lastTwo = values.slice(-2);
    const change = ((lastTwo[1] - lastTwo[0]) / lastTwo[0]) * 100;
    if (change > 5) return "up";
    if (change < -5) return "down";
    return "stable";
  };

  // Función para renderizar icono de tendencia
  const TrendIcon = ({ trend }) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  // Componente de estado de conexión
  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-sm">
      {connectionStatus === 'connected' && (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          <span className="text-green-600">Conectado a Google Sheets</span>
        </>
      )}
      {connectionStatus === 'disconnected' && (
        <>
          <WifiOff className="w-4 h-4 text-gray-500" />
          <span className="text-gray-600">Usando datos de ejemplo</span>
        </>
      )}
      {connectionStatus === 'error' && (
        <>
          <WifiOff className="w-4 h-4 text-red-500" />
          <span className="text-red-600">Error - Usando datos de respaldo</span>
        </>
      )}
      {lastUpdated && (
        <span className="text-gray-500 ml-2">
          • Actualizado: {lastUpdated.toLocaleTimeString()}
        </span>
      )}
    </div>
  );

  // Datos para el Dashboard Ejecutivo
  const executiveKPIs = useMemo(() => {
    const currentMonth = salesData[selectedMonth];
    if (!currentMonth) {
      return { totalVentas: 0, totalCursos: 0, ventasGrowth: 0, cursosGrowth: 0, ticketPromedio: 0 };
    }

    let totalVentas = 0, totalCursos = 0;
    
    Object.keys(currentMonth).forEach(school => {
      Object.keys(currentMonth[school]).forEach(area => {
        Object.keys(currentMonth[school][area]).forEach(course => {
          totalVentas += currentMonth[school][area][course].ventas;
          totalCursos += currentMonth[school][area][course].cursos;
        });
      });
    });
    
    // Calcular crecimiento vs mes anterior
    const currentIndex = months.indexOf(selectedMonth);
    const previousMonth = currentIndex > 0 ? months[currentIndex - 1] : null;
    
    let ventasGrowth = 0, cursosGrowth = 0;
    
    if (previousMonth && salesData[previousMonth]) {
      let prevVentas = 0, prevCursos = 0;
      
      Object.keys(salesData[previousMonth]).forEach(school => {
        Object.keys(salesData[previousMonth][school]).forEach(area => {
          Object.keys(salesData[previousMonth][school][area]).forEach(course => {
            prevVentas += salesData[previousMonth][school][area][course].ventas;
            prevCursos += salesData[previousMonth][school][area][course].cursos;
          });
        });
      });
      
      ventasGrowth = prevVentas ? ((totalVentas - prevVentas) / prevVentas) * 100 : 0;
      cursosGrowth = prevCursos ? ((totalCursos - prevCursos) / prevCursos) * 100 : 0;
    }
    
    const ticketPromedio = totalCursos ? totalVentas / totalCursos : 0;
    
    return {
      totalVentas,
      totalCursos,
      ventasGrowth,
      cursosGrowth,
      ticketPromedio
    };
  }, [selectedMonth, salesData, months]);

  // Función para obtener totales por escuela
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

  // Datos para la tabla principal
  const mainTableData = useMemo(() => {
    if (viewType === "executive") return [];
    
    if (viewType === "escuela") {
      const schoolTotals = getSchoolTotals(selectedMonth);
      return schools.map(school => {
        const schoolValues = months.map(month => {
          const totals = getSchoolTotals(month);
          return totals[school] ? totals[school][metricType] : 0;
        });
        const average = schoolValues.reduce((a, b) => a + b, 0) / schoolValues.length;
        const trend = calculateTrend(schoolValues);
        
        return {
          nombre: school,
          valor: schoolTotals[school] ? schoolTotals[school][metricType] : 0,
          promedio: Math.round(average),
          tendencia: trend
        };
      });
    }
    
    return [];
  }, [viewType, selectedMonth, metricType, schools, months, salesData]);

  // Componente de Dashboard Ejecutivo
  const ExecutiveDashboard = () => (
    <div className="space-y-6">
      {/* Estado de conexión y botón de actualización */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <ConnectionStatus />
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchGoogleSheetsData(true)}
              disabled={isLoading}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium ${
                isLoading 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Actualizando...' : 'Actualizar'}
            </button>
            {errorMessage && (
              <div className="text-xs text-red-600 max-w-xs">
                Error: {errorMessage}
              </div>
            )}
          </div>
        </div>
        
        {connectionStatus === 'error' && (
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>📊 Usando datos de respaldo.</strong> Verifica tu API Key y Spreadsheet ID en el código.
            </p>
          </div>
        )}
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Ventas Totales</p>
              <p className="text-3xl font-bold">${executiveKPIs.totalVentas.toLocaleString()}</p>
              <p className="text-blue-100 text-sm">
                {executiveKPIs.ventasGrowth > 0 ? '+' : ''}{executiveKPIs.ventasGrowth.toFixed(1)}% vs mes anterior
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Cursos Vendidos</p>
              <p className="text-3xl font-bold">{executiveKPIs.totalCursos.toLocaleString()}</p>
              <p className="text-green-100 text-sm">
                {executiveKPIs.cursosGrowth > 0 ? '+' : ''}{executiveKPIs.cursosGrowth.toFixed(1)}% vs mes anterior
              </p>
            </div>
            <ShoppingCart className="w-8 h-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Ticket Promedio</p>
              <p className="text-3xl font-bold">${executiveKPIs.ticketPromedio.toFixed(0)}</p>
              <p className="text-purple-100 text-sm">Por curso vendido</p>
            </div>
            <Target className="w-8 h-8 text-purple-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Escuelas Activas</p>
              <p className="text-3xl font-bold">{schools.length}</p>
              <p className="text-orange-100 text-sm">{areas.length} áreas de estudio</p>
            </div>
            <Activity className="w-8 h-8 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Gráfica de Tendencias */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Tendencia Mensual de Ventas</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={months.map(month => {
              const totals = getSchoolTotals(month);
              const totalVentas = Object.values(totals).reduce((sum, school) => sum + school.ventas, 0);
              return {
                month: month.substring(5),
                ventas: totalVentas
              };
            })}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Ventas']} />
              <Line type="monotone" dataKey="ventas" stroke="#3B82F6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resumen por Escuela */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Resumen por Escuela - {new Date(selectedMonth + "-01").toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.map(school => {
            const schoolTotals = getSchoolTotals(selectedMonth);
            const schoolData = schoolTotals[school] || { ventas: 0, cursos: 0 };
            
            return (
              <div key={school} className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900">{school}</h4>
                <p className="text-2xl font-bold text-blue-600">${schoolData.ventas.toLocaleString()}</p>
                <p className="text-sm text-gray-600">{schoolData.cursos} cursos vendidos</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Dashboard - Escuela de Maquillaje
        </h1>

        {/* Navegación principal */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => setViewType("executive")}
              className={`px-4 py-2 rounded-lg font-medium ${viewType === "executive" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Dashboard Ejecutivo
            </button>
            <button
              onClick={() => setViewType("escuela")}
              className={`px-4 py-2 rounded-lg font-medium ${viewType === "escuela" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Por Escuela
            </button>
          </div>

          {/* Controles para vistas específicas */}
          {viewType === "escuela" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Métrica</label>
                <select 
                  value={metricType}
                  onChange={(e) => setMetricType(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {months.map(month => (
                    <option key={month} value={month}>
                      {new Date(month + "-01").toLocaleDateString('es-ES', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Contenido principal */}
        {isLoading && isManualRefresh && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Cargando datos desde Google Sheets...</p>
          </div>
        )}

        {viewType === "executive" && <ExecutiveDashboard />}

        {/* Vista por Escuela */}
        {viewType === "escuela" && !isLoading && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Análisis por Escuela</h2>
              <div className="flex items-center gap-2">
                {metricType === "ventas" ? <DollarSign className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                <span className="text-sm font-medium">
                  {metricType === "ventas" ? "Pesos Mexicanos" : "Unidades Vendidas"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tabla */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Escuela
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Promedio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tendencia
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mainTableData.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {row.nombre}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {metricType === "ventas" ? `${row.valor.toLocaleString()}` : row.valor.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {metricType === "ventas" ? `${row.promedio.toLocaleString()}` : row.promedio.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <TrendIcon trend={row.tendencia} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Gráfica */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mainTableData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" />
                    <YAxis tickFormatter={(value) => 
                      metricType === "ventas" ? `${(value/1000).toFixed(0)}k` : value.toString()
                    } />
                    <Tooltip formatter={(value) => [
                      metricType === "ventas" ? `${value.toLocaleString()}` : value.toLocaleString(),
                      metricType === "ventas" ? "Ventas" : "Cursos"
                    ]} />
                    <Bar dataKey="valor" fill="#3B82F6" />
                    <Bar dataKey="promedio" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
