import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus, DollarSign, ShoppingCart, Bell, RefreshCw, Wifi, WifiOff, User, Building, BookOpen, Book, BarChart3, Star, Target, AlertTriangle, Activity, Phone, Mail, Globe, MessageSquare, Users } from 'lucide-react';

const GOOGLE_SHEETS_CONFIG = {
  apiKey: 'AIzaSyBXvaWWirK1_29g7x6uIq2qlmLdBL9g3TE',
  spreadsheetId: '1DHt8N8bEPElP4Stu1m2Wwb2brO3rLKOSuM8y_Ca3nVg',
  ranges: {
    ventas: 'Ventas!A:H',
    cobranza: 'Cobranza!A:Z',
    ingresos: 'Tabla Ingresos!A:B'
  }
};

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

const fallbackContactData = {
  "2024-01": {
    "WhatsApp": { ventas: 45000, cursos: 35 },
    "Instagram": { ventas: 32000, cursos: 28 },
    "Facebook": { ventas: 28000, cursos: 22 },
    "Teléfono": { ventas: 18000, cursos: 15 },
    "Email": { ventas: 15000, cursos: 12 }
  },
  "2024-07": {
    "WhatsApp": { ventas: 52000, cursos: 42 },
    "Instagram": { ventas: 38000, cursos: 35 },
    "Facebook": { ventas: 35000, cursos: 28 },
    "Teléfono": { ventas: 22000, cursos: 18 },
    "Email": { ventas: 18000, cursos: 15 }
  }
};

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState("2024-07");
  const [selectedSchool, setSelectedSchool] = useState("Polanco");
  const [selectedArea, setSelectedArea] = useState("Maquillaje");
  const [viewType, setViewType] = useState("executive");
  const [metricType, setMetricType] = useState("ventas");
  const [compareMonths, setCompareMonths] = useState(["2024-06", "2024-07"]);
  const [salesData, setSalesData] = useState(fallbackData);
  const [cobranzaData, setCobranzaData] = useState({});
  const [ingresosData, setIngresosData] = useState({});
  const [contactData, setContactData] = useState(fallbackContactData);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const parseNumberFromString = (value) => {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    
    const str = value.toString().trim();
    if (str === '' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return 0;
    const cleaned = str
      .replace(/[$,\s]/g, '')
      .replace(/[^\d.-]/g, '');
    if (cleaned === '' || cleaned === '.' || cleaned === '-') return 0;
    
    const number = parseFloat(cleaned);
    return isNaN(number) ? 0 : number;
  };

  const sortMonthsChronologically = (months) => {
    return months.sort((a, b) => {
      const parseToStandardDate = (dateStr) => {
        if (!dateStr) return null;
        
        const str = dateStr.toString().trim();
        
        if (str.match(/^\d{4}-\d{2}$/)) {
          return str;
        }
  
        if (str.match(/^\d{1,2}\/\d{4}$/)) {
          const [month, year] = str.split('/');
          return `${year}-${month.padStart(2, '0')}`;
        }
        
        if (str.match(/^\d{1,2}-\d{4}$/)) {
          const [month, year] = str.split('-');
          return `${year}-${month.padStart(2, '0')}`;
      
      }
        
        return str;
      };
      
      const dateA = parseToStandardDate(a);
      const dateB = parseToStandardDate(b);
      
      if (!dateA || !dateB) {
        return a.localeCompare(b);
      }
      
      return new Date(dateA + '-01') - new Date(dateB + '-01');
    });
  };

  const transformGoogleSheetsData = (rawData) => {
    if (!rawData || rawData.length === 0) {
      console.warn('⚠️ No hay datos para transformar');
      return {};
    }

    const rows = rawData.slice(1);
    const transformedData = {};
    rows.forEach((row, index) => {
      if (!row || row.length === 0) {
        return;
      }

      const [fecha, escuela, area, curso, ventas, cursosVendidos, instructor] = row;
      
      if (!fecha || !escuela || !area || !curso) {
        return;
      }
      
      let monthKey;
      try {
        monthKey = fecha.toString().substring(0, 7);
        if (!monthKey.match(/^\d{4}-\d{2}$/)) {
          return;
        }
      } catch (error) {
        return;
      }
      
      if (!transformedData[monthKey]) {
        transformedData[monthKey] = {};
      }
      
      if (!transformedData[monthKey][escuela]) {
        transformedData[monthKey][escuela] = {};
      }
      
      if (!transformedData[monthKey][escuela][area]) {
        transformedData[monthKey][escuela][area] = {};
      }
      
      const ventasNum = parseNumberFromString(ventas);
      const cursosNum = parseNumberFromString(cursosVendidos) || 1;
      
      let instructorLimpio = 'No asignado';
      if (instructor) {
        const instructorStr = instructor.toString().trim();
        if (instructorStr.length > 0) {
          instructorLimpio = instructorStr;
        }
      }
      
      const cursoKey = curso.toString().trim();
      if (transformedData[monthKey][escuela][area][cursoKey]) {
        transformedData[monthKey][escuela][area][cursoKey].ventas += ventasNum;
        transformedData[monthKey][escuela][area][cursoKey].cursos += cursosNum;
        if (transformedData[monthKey][escuela][area][cursoKey].instructor === 'No asignado' && instructorLimpio !== 'No asignado') {
          transformedData[monthKey][escuela][area][cursoKey].instructor = instructorLimpio;
        }
      } else {
        transformedData[monthKey][escuela][area][cursoKey] = {
          ventas: ventasNum,
          cursos: cursosNum,
          instructor: instructorLimpio
        };
      }
    });
    
    console.log('✅ Datos transformados:', transformedData);
    return transformedData;
  };
  const transformContactData = (rawData) => {
    if (!rawData || rawData.length === 0) return {};
    const rows = rawData.slice(1);
    const transformedData = {};
    
    rows.forEach((row) => {
      const [fecha, escuela, area, curso, ventas, cursosVendidos, instructor, medioContacto] = row;
      
      if (!fecha || !medioContacto) {
        return;
      }
      
      const monthKey = fecha.substring(0, 7);
      const medio = medioContacto.trim();
      
      if (!transformedData[monthKey]) {
        transformedData[monthKey] = {};
      }
      
      if (!transformedData[monthKey][medio]) {
        transformedData[monthKey][medio] = { ventas: 0, cursos: 0 };
      }
      
      const ventasNum = parseNumberFromString(ventas);
      const cursosNum = parseNumberFromString(cursosVendidos) || 1;
      
      transformedData[monthKey][medio].ventas += ventasNum;
      transformedData[monthKey][medio].cursos += cursosNum;
    });
    return transformedData;
  };

  const transformCobranzaData = (rawData) => {
    if (!rawData || rawData.length === 0) return {};
    const headers = rawData[0];
    const rows = rawData.slice(1);
    const result = {};
    const meses = headers.slice(1).filter(header => header && header.trim() !== '');
    rows.forEach((row) => {
      const escuela = row[0];
      if (!escuela || escuela.trim() === '') {
        return;
      }
      
      const escuelaClean = escuela.trim();
      result[escuelaClean] = {};
      
      meses.forEach((mes, mesIndex) => {
        const cellValue = row[mesIndex + 1];
        const monto = parseNumberFromString(cellValue);
        const mesClean = mes.trim();
        result[escuelaClean][mesClean] = monto;
      });
    });
    return result;
  };

  const transformIngresosData = (rawData) => {
    if (!rawData || rawData.length === 0) return {};
    const result = {};
    const rows = rawData.slice(1);
    
    rows.forEach((row) => {
      const concepto = row[0];
      const monto = row[1];
      
      if (!concepto || concepto.trim() === '') {
        return;
      }
      
      const conceptoClean = concepto.trim();
      const montoNumerico = parseNumberFromString(monto);
      
      result[conceptoClean] = montoNumerico;
  
    });
    
    return result;
  };

  const fetchGoogleSheetsData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setIsManualRefresh(showLoading);
    
    try {
      const ventasUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.ranges.ventas}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`;
      const ventasResponse = await fetch(ventasUrl);
      if (!ventasResponse.ok) throw new Error(`Error ${ventasResponse.status}: ${ventasResponse.statusText}`);
      
      const ventasData = await ventasResponse.json();
      
      console.log('📊 Datos raw de Google Sheets:', ventasData.values);
      const transformedVentas = transformGoogleSheetsData(ventasData.values);
      const transformedContact = transformContactData(ventasData.values);
      
      setSalesData(transformedVentas);
      setContactData(transformedContact);
      
      const cobranzaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.ranges.cobranza}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`;
      const cobranzaResponse = await fetch(cobranzaUrl);
      if (!cobranzaResponse.ok) throw new Error(`Error ${cobranzaResponse.status}: ${cobranzaResponse.statusText}`);
      
      const cobranzaDataResponse = await cobranzaResponse.json();
      const transformedCobranza = transformCobranzaData(cobranzaDataResponse.values);
      setCobranzaData(transformedCobranza);
      const ingresosUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.ranges.ingresos}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`;
      const ingresosResponse = await fetch(ingresosUrl);

      if (!ingresosResponse.ok) throw new Error(`Error ${ingresosResponse.status}: ${ingresosResponse.statusText}`);
      const ingresosDataResponse = await ingresosResponse.json();
      const transformedIngresos = transformIngresosData(ingresosDataResponse.values);
      setIngresosData(transformedIngresos);
      
      setConnectionStatus('connected');
      setLastUpdated(new Date());
      setErrorMessage('');
      
      console.log('✅ Datos actualizados correctamente');
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
    fetchGoogleSheetsData();
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      fetchGoogleSheetsData(false);
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);
  const schools = useMemo(() => {
    const schoolsSet = new Set();
    Object.values(salesData || {}).forEach(monthData => {
      Object.keys(monthData || {}).forEach(school => {
        schoolsSet.add(school);
      });
    });
    return Array.from(schoolsSet);
  }, [salesData]);
  const areas = useMemo(() => {
    const areasSet = new Set();
    Object.values(salesData || {}).forEach(monthData => {
      Object.values(monthData || {}).forEach(schoolData => {
        Object.keys(schoolData || {}).forEach(area => {
          areasSet.add(area);
        });
      });
    });
    return Array.from(areasSet);
  }, [salesData]);
  const months = useMemo(() => {
    return Object.keys(salesData || {}).sort();
  }, [salesData]);
  const allInstructors = useMemo(() => {
    const instructorsSet = new Set();
    
    Object.values(salesData || {}).forEach(monthData => {
      Object.values(monthData || {}).forEach(schoolData => {
        Object.values(schoolData || {}).forEach(areaData => {
          Object.values(areaData || {}).forEach(courseData => {
            if (courseData?.instructor && 
             courseData.instructor.toString().trim().length > 0) {
              instructorsSet.add(courseData.instructor.trim());
            }
          });
        });
      });
    });
    
    return Array.from(instructorsSet).sort();
  }, [salesData]);
  const formatDateForDisplay = (monthString) => {
    try {
      const [year, month] = monthString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      
      if (isNaN(date.getTime())) {
        return monthString;
      }
      
      return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long' 
      });
    } catch (error) {
      return monthString;
    }
  };
  const formatDateShort = (monthString) => {
    try {
      const [year, month] = monthString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      
      if (isNaN(date.getTime())) {
        return monthString;
      }
      
      return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'short' 
      });
    } catch (error) {
      return monthString;
    }
  };
  const calculateTrend = (values) => {
    if (!values || values.length < 2) return "stable";
    const lastTwo = values.slice(-2);
    const change = ((lastTwo[1] - lastTwo[0]) / lastTwo[0]) * 100;
    if (change > 5) return "up";
    if (change < -5) return "down";
    return "stable";
  };

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
  const getSchoolTotals = (month) => {
    const totals = {};
    if (!salesData || !salesData[month]) return totals;
    Object.keys(salesData[month]).forEach(school => {
      totals[school] = { ventas: 0, cursos: 0 };
      Object.keys(salesData[month][school] || {}).forEach(area => {
        Object.keys(salesData[month][school][area] || {}).forEach(course => {
          const courseData = salesData[month][school][area][course];
          if (courseData) {
            totals[school].ventas += courseData.ventas || 0;
            totals[school].cursos += courseData.cursos || 0;
          }
        });
      });
    });
    return totals;
  };

  const getInstructorTotals = (month, school = null) => {
    const totals = {};
    if (!salesData || !salesData[month]) {
      return totals;
    }
    
    const schoolsToProcess = school ? [school] : Object.keys(salesData[month]);
    schoolsToProcess.forEach(schoolKey => {
      if (salesData[month][schoolKey]) {
        Object.keys(salesData[month][schoolKey]).forEach(area => {
          Object.keys(salesData[month][schoolKey][area] || {}).forEach(course => {
            const courseData = salesData[month][schoolKey][area][course];
            const instructor = courseData?.instructor;
            
            if (instructor) {
              const instructorKey = instructor.toString().trim();
              if (instructorKey.length > 0) {
                if (!totals[instructorKey]) {
                  totals[instructorKey] = { 
                    ventas: 0, 
                    cursos: 0, 
                    areas: new Set(), 
                    escuelas: new Set() 
                  };
                }
                
                totals[instructorKey].ventas += courseData.ventas || 0;
                totals[instructorKey].cursos += courseData.cursos || 0;
                totals[instructorKey].areas.add(area);
                totals[instructorKey].escuelas.add(schoolKey);
              }
            }
          });
        });
      }
    });
    
    Object.keys(totals).forEach(instructor => {
      totals[instructor].areas = Array.from(totals[instructor].areas);
      totals[instructor].escuelas = Array.from(totals[instructor].escuelas);
    });
    return totals;
  };

  const debugInstructors = () => {
    console.log('🐛 === DEBUG DE INSTRUCTORES ===');
    console.log('📅 Mes seleccionado:', selectedMonth);
    console.log('🏫 Escuela seleccionada:', selectedSchool);
    
    if (salesData[selectedMonth]) {
      console.log('📊 Datos del mes:', salesData[selectedMonth]);
    }
    
    const todosInstructores = new Set();
    let instructoresRaw = [];
    Object.entries(salesData || {}).forEach(([mes, monthData]) => {
      Object.entries(monthData || {}).forEach(([escuela, schoolData]) => {
        Object.entries(schoolData || {}).forEach(([area, areaData]) => {
          Object.entries(areaData || {}).forEach(([curso, courseData]) => {
            if (courseData?.instructor) {
              const instructorRaw = courseData.instructor;
              instructoresRaw.push({
                mes,
                escuela,
                area,
                curso,
                instructor: instructorRaw,
                ventas: courseData.ventas,
                cursos: courseData.cursos
              });
              todosInstructores.add(instructorRaw);
            }
          });
        });
      });
    });
    console.log('👥 TODOS LOS INSTRUCTORES ENCONTRADOS:', Array.from(todosInstructores).sort());
    console.log('📝 INSTRUCTORES RAW:', instructoresRaw);
    const totalesInstructores = getInstructorTotals(selectedMonth, selectedSchool === "Todas" ? null : selectedSchool);
    console.log('📈 TOTALES CALCULADOS:', totalesInstructores);
    
    console.log('🔍 Instructores en allInstructors:', allInstructors);
  };

  const ExecutiveDashboard = () => {
    const executiveKPIs = useMemo(() => {
      const currentMonth = salesData[selectedMonth];
      if (!currentMonth) {
        return { totalVentas: 0, totalCursos: 0, ventasGrowth: 0, cursosGrowth: 0, ticketPromedio: 0 };
      }

      let totalVentas = 0, totalCursos = 0;
      
      Object.keys(currentMonth).forEach(school => {
        Object.keys(currentMonth[school] || {}).forEach(area => {
          Object.keys(currentMonth[school][area] || {}).forEach(course => {
            const courseData = currentMonth[school][area][course];
            if (courseData) {
              totalVentas += courseData.ventas || 0;
              totalCursos += courseData.cursos || 0;
            }
          });
        });
      });
      
      const ticketPromedio = totalCursos ? totalVentas / totalCursos : 0;
      
      return {
        totalVentas,
        totalCursos,
        ventasGrowth: 0,
        cursosGrowth: 0,
        ticketPromedio
      };
    }, [selectedMonth, salesData]);
    const instructorTotals = getInstructorTotals(selectedMonth);

    return (
      <div className="space-y-6">
        {/* Panel de control superior */}
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
                {isLoading ? 'Cargando...' : 'Actualizar'}
              </button>
              <button
                onClick={debugInstructors}
                className="flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
              >
                🐛 Debug
              </button>
            </div>
          </div>
          
          {errorMessage && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-red-700 text-sm">Error: {errorMessage}</span>
              </div>
            </div>
          )}
        </div>

        {/* Selectores */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vista
              </label>
              <select
                value={viewType}
                onChange={(e) => setViewType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="executive">Ejecutiva</option>
                <option value="school">Por Escuela</option>
                <option value="instructor">Por Instructor</option>
                <option value="area">Por Área</option>
                <option value="contact">Medios de Contacto</option>
              </select>
            </div>
          </div>
        </div>

        {/* KPIs Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Ventas Totales</p>
                <p className="text-3xl font-bold">${executiveKPIs.totalVentas.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Cursos Vendidos</p>
                <p className="text-3xl font-bold">{executiveKPIs.totalCursos.toLocaleString()}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-blue-200" />
            </div>
          </div>
         
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Ticket Promedio</p>
                <p className="text-3xl font-bold">${executiveKPIs.ticketPromedio.toFixed(0)}</p>
              </div>
              <Target className="w-8 h-8 text-purple-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Instructores Activos</p>
                <p className="text-3xl font-bold">{Object.keys(instructorTotals).length}</p>
              </div>
              <Users className="w-8 h-8 text-orange-200" />
            </div>
          </div>
        </div>

       
        {/* Top Instructores */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">Top Instructores del Mes</h3>
            <span className="text-sm text-gray-500">({formatDateForDisplay(selectedMonth)})</span>
          </div>
          
          {Object.keys(instructorTotals).length === 0 ?
          (
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No hay instructores registrados para este período</p>
              <p className="text-sm">Verifica que los datos en Google Sheets tengan la columna de instructor completada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(instructorTotals)
                .sort(([,a], [,b]) => (b.ventas || 0) - (a.ventas || 0))
                .slice(0, 10)
                .map(([instructor, data], index) => (
                  <div key={instructor} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-orange-500' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{instructor}</p>
                        <p className="text-xs text-gray-500">
                          {(data.areas || []).length} área{(data.areas || []).length !== 1 ? 's' : ''} • {' '}
                          {(data.escuelas || []).length} escuela{(data.escuelas || []).length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-green-600">
                        ${(data.ventas || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {data.cursos || 0} curso{(data.cursos || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Información de Debug */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm">
          <h4 className="font-semibold mb-2">Información del Sistema</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-600">
            <div>
              <p><strong>Total de instructores encontrados:</strong> {allInstructors.length}</p>
              <p><strong>Instructores activos este mes:</strong> {Object.keys(instructorTotals).length}</p>
            </div>
            <div>
              <p><strong>Escuelas disponibles:</strong> {schools.length}</p>
              <p><strong>Áreas disponibles:</strong> {areas.length}</p>
            </div>
          </div>
          
          {allInstructors.length > 0 && (
            <div className="mt-3">
              <p className="font-medium mb-1">Todos los instructores:</p>
              <p className="text-xs text-gray-500">
                {allInstructors.join(', ')}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const SchoolDashboard = () => {
    const schoolTotals = getSchoolTotals(selectedMonth);
    const chartData = Object.entries(schoolTotals).map(([school, data]) => ({
      name: school,
      ventas: data.ventas,
      cursos: data.cursos,
      ticketPromedio: data.cursos ? Math.round(data.ventas / data.cursos) : 0
    }));
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Rendimiento por Escuela - {formatDateForDisplay(selectedMonth)}</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium mb-3">Ventas por Escuela</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value.toLocaleString()}`, 'Ventas']} />
                  <Bar dataKey="ventas" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h4 className="text-md font-medium mb-3">Cursos Vendidos por Escuela</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [value, 'Cursos']} />
                  <Bar dataKey="cursos" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(schoolTotals).map(([school, data]) => (
            <div key={school} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-3">
                <Building className="w-5 h-5 text-blue-500" />
                <h4 className="font-semibold">{school}</h4>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Ventas:</span>
                  <span className="font-semibold text-green-600">
                    ${data.ventas.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cursos:</span>
                  <span className="font-semibold text-blue-600">
                    {data.cursos}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Ticket promedio:</span>
                  <span className="font-semibold text-purple-600">
                    ${data.cursos ? Math.round(data.ventas / data.cursos) : 0}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const InstructorDashboard = () => {
    const instructorTotals = getInstructorTotals(selectedMonth, selectedSchool === "Todas" ? null : selectedSchool);
    const chartData = Object.entries(instructorTotals)
      .sort(([,a], [,b]) => (b.ventas || 0) - (a.ventas || 0))
      .map(([instructor, data]) => ({
        name: instructor.length > 15 ? instructor.substring(0, 15) + '...' : instructor,
        fullName: instructor,
        ventas: data.ventas,
        cursos: data.cursos,
        ticketPromedio: data.cursos ? Math.round(data.ventas / data.cursos) : 0,
        areas: data.areas?.length || 0
      }));

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            Rendimiento de Instructores - {formatDateForDisplay(selectedMonth)}
            {selectedSchool !== "Todas" && (
              <span className="text-base font-normal text-gray-500"> • {selectedSchool}</span>
            )}
          </h3>
          
          {chartData.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h4 className="text-lg font-medium text-gray-600 mb-2">No hay instructores registrados</h4>
              <p className="text-gray-500">
                No se encontraron instructores para{' '}
                {selectedSchool === "Todas" ? "este período" : `${selectedSchool} en este período`}
              </p>
              <button
                onClick={debugInstructors}
                className="mt-4 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
              >
                🐛 Ver detalles de debug
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-md font-medium mb-3">Ventas por Instructor</h4>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData.slice(0, 10)} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip 
                        formatter={(value, name) => [`${value.toLocaleString()}`, 'Ventas']}
                        labelFormatter={(label) => {
                          const item = chartData.find(d => d.name === label);
                          return item?.fullName || label;
                        }}
                      />
                      <Bar dataKey="ventas" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h4 className="text-md font-medium mb-3">Cursos por Instructor</h4>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData.slice(0, 10)} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip 
                        formatter={(value, name) => [value, 'Cursos']}
                        labelFormatter={(label) => {
                          const item = chartData.find(d => d.name === label);
                          return item?.fullName || label;
                        }}
                      />
                      <Bar dataKey="cursos" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(instructorTotals)
                  .sort(([,a], [,b]) => (b.ventas || 0) - (a.ventas || 0))
                  .map(([instructor, data], index) => (
                    <div key={instructor} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          index < 3 ? 'bg-yellow-500' : 'bg-gray-400'
                        }`}>
                          {index + 1}
                        </span>
                        <h4 className="font-semibold text-sm">{instructor}</h4>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Ventas:</span>
                          <span className="font-semibold text-green-600">
                            ${(data.ventas || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Cursos:</span>
                          <span className="font-semibold text-blue-600">
                            {data.cursos || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Ticket promedio:</span>
                          <span className="font-semibold text-purple-600">
                            ${data.cursos ? Math.round(data.ventas / data.cursos) : 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Áreas:</span>
                          <span className="font-medium text-gray-700">
                            {(data.areas || []).length}
                          </span>
                        </div>
                        {data.areas && data.areas.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">
                              {data.areas.join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const ContactDashboard = () => {
    const currentContactData = contactData[selectedMonth] || {};
    const chartData = Object.entries(currentContactData).map(([medio, data]) => ({
      name: medio,
      ventas: data.ventas || 0,
      cursos: data.cursos || 0
    }));
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            Medios de Contacto - {formatDateForDisplay(selectedMonth)}
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium mb-3">Distribución de Ventas</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="ventas"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value.toLocaleString()}`, 'Ventas']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h4 className="text-md font-medium mb-3">Ventas por Medio</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value.toLocaleString()}`, 'Ventas']} />
                  <Bar dataKey="ventas" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(currentContactData)
            .sort(([,a], [,b]) => (b.ventas || 0) - (a.ventas || 0))
            .map(([medio, data]) => {
              const getIcon = (medio) => {
                switch (medio.toLowerCase()) {
                  case 'whatsapp': return <MessageSquare className="w-5 h-5 text-green-500" />;
                  case 'instagram': return <Globe className="w-5 h-5 text-pink-500" />;
                  case 'facebook': return <Globe className="w-5 h-5 text-blue-600" />;
                  case 'teléfono': return <Phone className="w-5 h-5 text-gray-600" />;
                  case 'email': return <Mail className="w-5 h-5 text-red-500" />;
                  default: return <Globe className="w-5 h-5 text-gray-500" />;
                }
              };

              return (
                <div key={medio} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {getIcon(medio)}
                    <h4 className="font-semibold text-sm">{medio}</h4>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-600">Ventas</p>
                      <p className="font-bold text-green-600">
                        ${(data.ventas || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Cursos</p>
                      <p className="font-bold text-blue-600">
                        {data.cursos || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Ticket promedio</p>
                      <p className="font-bold text-purple-600">
                        ${data.cursos ? Math.round(data.ventas / data.cursos) : 0}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    );
  };
  const AreaDashboard = () => {
    const areaTotals = useMemo(() => {
      const totals = {};
      const currentMonth = salesData[selectedMonth];
      
      if (!currentMonth) return totals;
      
      const schoolsToProcess = selectedSchool === "Todas" 
        ? Object.keys(currentMonth) 
        : [selectedSchool];
      
      schoolsToProcess.forEach(school => {
        if (currentMonth[school]) {
          Object.entries(currentMonth[school]).forEach(([area, areaData]) => {
            if (!totals[area]) {
              totals[area] = { ventas: 0, cursos: 0 };
            }
            
            Object.values(areaData || {}).forEach(courseData => {
              totals[area].ventas += courseData.ventas || 0;
              totals[area].cursos += courseData.cursos || 0;
            });
          });
        }
      });
      
      return totals;
    }, [selectedMonth, selectedSchool, salesData]);
    const chartData = Object.entries(areaTotals).map(([area, data]) => ({
      name: area,
      ventas: data.ventas,
      cursos: data.cursos,
      ticketPromedio: data.cursos ? Math.round(data.ventas / data.cursos) : 0
    }));
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            Rendimiento por Área - {formatDateForDisplay(selectedMonth)}
            {selectedSchool !== "Todas" && (
              <span className="text-base font-normal text-gray-500"> • {selectedSchool}</span>
            )}
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium mb-3">Ventas por Área</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value.toLocaleString()}`, 'Ventas']} />
                  <Bar dataKey="ventas" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h4 className="text-md font-medium mb-3">Cursos por Área</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [value, 'Cursos']} />
                  <Bar dataKey="cursos" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(areaTotals)
            .sort(([,a], [,b]) => (b.ventas || 0) - (a.ventas || 0))
            .map(([area, data]) => (
              <div key={area} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-5 h-5 text-purple-500" />
                  <h4 className="font-semibold">{area}</h4>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Ventas:</span>
                    <span className="font-semibold text-green-600">
                      ${data.ventas.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cursos:</span>
                    <span className="font-semibold text-blue-600">
                      {data.cursos}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Ticket promedio:</span>
                    <span className="font-semibold text-purple-600">
                      ${data.cursos ? Math.round(data.ventas / data.cursos) : 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    switch (viewType) {
      case 'school':
        return <SchoolDashboard />;
      case 'instructor':
        return <InstructorDashboard />;
      case 'area':
        return <AreaDashboard />;
      case 'contact':
        return <ContactDashboard />;
      default:
        return <ExecutiveDashboard />;
    }
  };
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Ventas</h1>
          <p className="text-gray-600">Panel de control integral para el seguimiento de ventas</p>
        </div>
        
        {renderDashboard()}
      </div>
    </div>
  );
};

export default Dashboard;
