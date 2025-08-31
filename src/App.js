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
      
      if (instructor !== undefined && instructor !== null) {
        const instructorStr = instructor.toString().trim();
        
        if (instructorStr !== '' && 
            instructorStr.toLowerCase() !== 'null' && 
            instructorStr.toLowerCase() !== 'undefined' &&
            instructorStr.toLowerCase() !== 'no asignado') {
          instructorLimpio = instructorStr;
        }
      }
      
      const cursoKey = curso.toString().trim();
      
      if (transformedData[monthKey][escuela][area][cursoKey]) {
        transformedData[monthKey][escuela][area][cursoKey].ventas += ventasNum;
        transformedData[monthKey][escuela][area][cursoKey].cursos += cursosNum;
        
        if (transformedData[monthKey][escuela][area][cursoKey].instructor === 'No asignado' && 
            instructorLimpio !== 'No asignado') {
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

  // RESTO DE LAS FUNCIONES CON VALIDACIONES MEJORADAS
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
            
            if (instructor && 
                instructor !== '' && 
                instructor !== 'No asignado' && 
                instructor !== 'null' && 
                instructor !== 'undefined') {
              
              if (!totals[instructor]) {
                totals[instructor] = { 
                  ventas: 0, 
                  cursos: 0, 
                  areas: new Set(), 
                  escuelas: new Set() 
                };
              }
              
              totals[instructor].ventas += courseData.ventas || 0;
              totals[instructor].cursos += courseData.cursos || 0;
              totals[instructor].areas.add(area);
              totals[instructor].escuelas.add(schoolKey);
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

  // Función de debug simplificada para producción
  const debugInstructors = () => {
    console.log('🐛 === DEBUG DE INSTRUCTORES ===');
    
    const todosInstructores = new Set();
    Object.values(salesData || {}).forEach(monthData => {
      Object.values(monthData || {}).forEach(schoolData => {
        Object.values(schoolData || {}).forEach(areaData => {
          Object.values(areaData || {}).forEach(courseData => {
            if (courseData?.instructor) {
              todosInstructores.add(courseData.instructor);
            }
          });
        });
      });
    });
    
    console.log('👥 TODOS LOS INSTRUCTORES:', Array.from(todosInstructores).sort());
    
    const totalesInstructores = getInstructorTotals(selectedMonth);
    console.log('📈 TOTALES CALCULADOS:', totalesInstructores);
    
    // Buscar SAI específicamente
    const saiInstructores = Array.from(todosInstructores).filter(instructor => 
      instructor.toLowerCase().includes('sai')
    );
    
    if (saiInstructores.length > 0) {
      console.log('✅ SAI encontrado:', saiInstructores);
    } else {
      console.log('❌ SAI no encontrado');
    }
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

    return (
      <div className="space-y-6">
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
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
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
        </div>

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
          
          <div className="bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-100 text-sm">Cursos Vendidos</p>
                <p className="text-3xl font-bold">{executiveKPIs.totalCursos.toLocaleString()}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-gray-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-400 to-green-500 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Ticket Promedio</p>
                <p className="text-3xl font-bold">${executiveKPIs.ticketPromedio.toFixed(0)}</p>
              </div>
              <Target className="w-8 h-8 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-100 text-sm">Escuelas</p>
                <p className="text-3xl font-bold">{schools.length}</p>
              </div>
              <Building className="w-8 h-8 text-gray-200" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">Top Vendedores</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(getInstructorTotals(selectedMonth))
              .sort(([,a], [,b]) => (b.ventas || 0) - (a.ventas || 0))
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
                      <p className="text-xs text-gray-500">{(data.areas || []).length} áreas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">${(data.ventas || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{data.cursos || 0} cursos</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  const getViewData = useMemo(() => {
    if (viewType === "instructor") {
      const instructorTotals = getInstructorTotals(selectedMonth, selectedSchool);
      return
