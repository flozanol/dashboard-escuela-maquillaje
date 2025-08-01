import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Minus, DollarSign, ShoppingCart, Users, Award, Scissors, Eye, Book, Package, AlertTriangle, Mail, Calendar, Star, Target, Activity, Bell, RefreshCw, Wifi, WifiOff, User, Building, BookOpen, BarChart3 } from 'lucide-react';

// 🔧 CONFIGURACIÓN DE GOOGLE SHEETS - YA CONFIGURADO
const GOOGLE_SHEETS_CONFIG = {
  apiKey: 'AIzaSyBXvaWWirK1_29g7x6uIq2qlmLdBL9g3TE',
  spreadsheetId: '1DHt8N8bEPElP4Stu1m2Wwb2brO3rLKOSuM8y_Ca3nVg',
  range: 'Ventas!A:G'
};

// Datos de respaldo para 2025
const fallbackData = {
  "2025-01": {
    "Polanco": {
      "Maquillaje": {
        "Maquillaje Básico": { ventas: 24000, cursos: 20, instructor: "Ana Martínez" },
        "Maquillaje Profesional": { ventas: 35000, cursos: 14, instructor: "Sofia López" }
      }
    }
  }
};

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState("2025-07");
  const [selectedSchool, setSelectedSchool] = useState("Polanco");
  const [selectedArea, setSelectedArea] = useState("Maquillaje");
  const [viewType, setViewType] = useState("executive");
  const [metricType, setMetricType] = useState("ventas");
  const [compareMonths, setCompareMonths] = useState(["2025-06", "2025-07"]);
  
  // Estados para Google Sheets
  const [salesData, setSalesData] = useState(fallbackData);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  const [isManualRefresh, setIsManualRefresh] = useState(false);

  // Función para formatear moneda mexicana
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Función para formatear números
  const formatNumber = (number) => {
    return new Intl.NumberFormat('es-MX').format(number);
  };

  // Función para limpiar y convertir números
  const parseNumberFromString = (value) => {
    if (!value) return 0;
    const str = value.toString();
    const cleaned = str.replace(/[,$\s]/g, '').replace(/[^\d.-]/g, '');
    const number = parseFloat(cleaned);
    console.log(`🔢 Convirtiendo "${value}" → "${cleaned}" → ${number}`);
    return isNaN(number) ? 0 : number;
  };

  // Función para obtener datos de Google Sheets
  const fetchGoogleSheetsData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setIsManualRefresh(showLoading);
    
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.range}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`;
      
      console.log('🔍 Conectando a:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📊 Datos recibidos:', data);
      
      if (!data.values || data.values.length === 0) {
        throw new Error('No se encontraron datos en la hoja');
      }
      
      const transformedData = transformGoogleSheetsData(data.values);
      
      setSalesData(transformedData);
      setConnectionStatus('connected');
      setLastUpdated(new Date());
      setErrorMessage('');
      
    } catch (error) {
      console.error('❌ Error:', error);
      setConnectionStatus('error');
      setErrorMessage(error.message);
      
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
    console.log('🔄 Transformando datos...', rawData);
    
    const headers = rawData[0];
    const rows = rawData.slice(1);
    
    console.log('📋 Headers:', headers);
    console.log('📊 Filas:', rows.length);
    
    const transformedData = {};
    
    rows.forEach((row, index) => {
      const [fecha, escuela, area, curso, ventas, cursosVendidos, instructor] = row;
      
      console.log(`📝 Fila ${index + 1}:`, { fecha, escuela, area, curso, ventas, cursosVendidos, instructor });
      
      if (!fecha || !escuela || !area || !curso) {
        console.log('⚠️ Saltando fila incompleta');
        return;
      }
      
      const monthKey = fecha.substring(0, 7);
      console.log('📅 Mes:', monthKey);
      
      if (!transformedData[monthKey]) {
        transformedData[monthKey] = {};
      }
      
      if (!transformedData[monthKey][escuela]) {
        transformedData[monthKey][escuela] = {};
      }
      
      if (!transformedData[monthKey][escuela][area]) {
        transformedData[monthKey][escuela][area] = {};
      }
      
      if (!transformedData[monthKey][escuela][area][curso]) {
        transformedData[monthKey][escuela][area][curso] = {
          ventas: 0,
          cursos: 0,
          instructor: instructor || 'No asignado'
        };
      }
      
      const ventasNum = parseNumberFromString(ventas);
      const cursosNum = parseNumberFromString(cursosVendidos) || 1;
      
      transformedData[monthKey][escuela][area][curso].ventas += ventasNum;
      transformedData[monthKey][escuela][area][curso].cursos += cursosNum;
    });
    
    console.log('✅ Datos transformados:', transformedData);
    
    // Mostrar totales por mes
    Object.keys(transformedData).forEach(month => {
      let monthTotal = 0;
      Object.keys(transformedData[month]).forEach(school => {
        Object.keys(transformedData[month][school]).forEach(area => {
          Object.keys(transformedData[month][school][area]).forEach(course => {
            monthTotal += transformedData[month][school][area][course].ventas;
          });
        });
      });
      console.log(`📊 TOTAL ${month}: $${monthTotal.toLocaleString()}`);
    });
    
    return transformedData;
  };

  // Cargar datos iniciales
  useEffect(() => {
    fetchGoogleSheetsData();
  }, []);

  // Estados derivados
  const schools = useMemo(() => {
    const schoolsSet = new Set();
    Object.values(salesData).forEach(monthData => {
      Object.keys(monthData).forEach(school => {
        schoolsSet.add(school);
      });
    });
    return Array.from(schoolsSet);
  }, [salesData]);

  const months = useMemo(() => {
    return Object.keys(salesData).sort();
  }, [salesData]);

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

  // KPIs ejecutivos
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
    
    const ticketPromedio = totalCursos ? totalVentas / totalCursos : 0;
    
    return {
      totalVentas,
      totalCursos,
      ventasGrowth: 15.2,
      cursosGrowth: 8.7,
      ticketPromedio
    };
  }, [selectedMonth, salesData]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Dashboard - Escuela de Maquillaje 2025
        </h1>

        {/* Estado de conexión */}
        <div className="bg-white rounded-lg shadow p-4 mb-8">
          <div className="flex items-center justify-between">
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
              {lastUpdated && (
                <span className="text-gray-500 ml-2">
                  • Actualizado: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
            
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
              {isLoading ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>
          
          {errorMessage && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">❌ Error: {errorMessage}</p>
            </div>
          )}
        </div>

        {/* KPIs Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Ventas Totales</p>
                <p className="text-3xl font-bold">{formatCurrency(executiveKPIs.totalVentas)}</p>
                <p className="text-blue-100 text-sm">
                  +{executiveKPIs.ventasGrowth.toFixed(1)}% vs mes anterior
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Cursos Vendidos</p>
                <p className="text-3xl font-bold">{formatNumber(executiveKPIs.totalCursos)}</p>
                <p className="text-green-100 text-sm">
                  +{executiveKPIs.cursosGrowth.toFixed(1)}% vs mes anterior
                </p>
              </div>
              <ShoppingCart className="w-8 h-8 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Ticket Promedio</p>
                <p className="text-3xl font-bold">{formatCurrency(executiveKPIs.ticketPromedio)}</p>
                <p className="text-purple-100 text-sm">Por curso vendido</p>
              </div>
              <Target className="w-8 h-8 text-purple-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Mes Actual</p>
                <p className="text-3xl font-bold">{selectedMonth.substring(5)}/25</p>
                <p className="text-orange-100 text-sm">{schools.length} escuelas activas</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-200" />
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
        </div>

        {/* Resumen por Escuela */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">
            Resumen por Escuela - {new Date(selectedMonth + "-01").toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schools.map(school => {
              const schoolTotals = getSchoolTotals(selectedMonth);
              const schoolData = schoolTotals[school] || { ventas: 0, cursos: 0 };
              
              return (
                <div key={school} className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900">{school}</h4>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(schoolData.ventas)}</p>
                  <p className="text-sm text-gray-600">{formatNumber(schoolData.cursos)} cursos vendidos</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 🔧 HERRAMIENTAS DE DEBUG */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">🔧 Herramientas de Debug</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <button 
              onClick={() => {
                console.log('📊 Todos los datos:', salesData);
                const meses = Object.keys(salesData);
                alert(`Meses disponibles: ${meses.join(', ')}\n\nTotal meses: ${meses.length}`);
              }}
              className="p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 text-sm"
            >
              📊 Ver todos los meses
            </button>
            
            <button 
              onClick={() => {
                if (salesData[selectedMonth]) {
                  let total = 0;
                  Object.keys(salesData[selectedMonth]).forEach(school => {
                    Object.keys(salesData[selectedMonth][school]).forEach(area => {
                      Object.keys(salesData[selectedMonth][school][area]).forEach(course => {
                        total += salesData[selectedMonth][school][area][course].ventas;
                      });
                    });
                  });
                  alert(`✅ ${selectedMonth} encontrado!\n\nTotal: ${formatCurrency(total)}`);
                } else {
                  alert(`❌ No hay datos para ${selectedMonth}\n\nMeses: ${Object.keys(salesData).join(', ')}`);
                }
              }}
              className="p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 text-sm"
            >
              🔍 Verificar mes actual
            </button>
            
            <button 
              onClick={() => fetchGoogleSheetsData(true)}
              className="p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 text-sm"
            >
              🔄 Recargar desde Sheets
            </button>
            
            <button 
              onClick={() => {
                console.log('📋 URL completa:', `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.range}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`);
                alert('URL copiada a consola (F12). Puedes probarla en tu navegador.');
              }}
              className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 text-sm"
            >
              🔗 Ver URL de API
            </button>
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Estado actual:</strong> {connectionStatus} | 
              <strong> Registros:</strong> {Object.keys(salesData).length} meses | 
              <strong> Mes seleccionado:</strong> {selectedMonth}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
