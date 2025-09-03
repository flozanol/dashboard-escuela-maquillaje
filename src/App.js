{isLoading && isManualRefresh && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Cargando datos desde Google Sheets...</p>
          </div>
        )}

        {viewType === "executive" && <ExecutiveDashboard />}
        {viewType === "cobranza" && <CobranzaDashboard />}
        {viewType === "contacto" && <ContactDashboard />}

        {(viewType === "escuela" || viewType === "area" || viewType === "instructor" || viewType === "curso") && !isLoading && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                {viewType === "escuela" && "Análisis por Escuela"}
                {viewType === "area" && `Análisis por Área${selectedSchool ? ` - ${selectedSchool}` : ""}`}
                {viewType === "instructor" && `Análisis por Vendedor${selectedSchool ? ` - ${selectedSchool}` : ""}`}
                {viewType === "curso" && `Análisis por Curso${selectedSchool ? ` - ${selectedSchool}` : ""}${selectedArea ? ` - ${selectedArea}` : ""}`}
              </h2>
              <div className="flex items-center gap-2">
                {metricType === "ventas" ? <DollarSign className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                <span className="text-sm font-medium">
                  {metricType === "ventas" ? "Pesos Mexicanos" : "Unidades Vendidas"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {viewType === "escuela" ? "Escuela" : 
                         viewType === "area" ? "Área" : 
                         viewType === "instructor" ? "Vendedor" : "Curso"}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {metricType === "ventas" ? "Ventas" : "Cursos"}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Promedio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tendencia
                      </th>
                      {(viewType === "instructor" || viewType === "curso") && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {viewType === "instructor" ? "Áreas" : "Vendedor"}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getViewData.map((row, index) => {
                      const IconComponent = row.icono;
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              {IconComponent && <IconComponent className="w-4 h-4 text-gray-500" />}
                              {row.nombre}
                            </div>
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
                          {(viewType === "instructor" || viewType === "curso") && (
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                              {viewType === "instructor" ? row.areas : row.instructor}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getViewData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="nombre" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      fontSize={12}
                    />
                    <YAxis tickFormatter={(value) => 
                      metricType === "ventas" ? `${(value/1000).toFixed(0)}k` : value.toString()
                    } />
                    <Tooltip formatter={(value) => [
                      metricType === "ventas" ? `${value.toLocaleString()}` : value.toLocaleString(),
                      metricType === "ventas" ? "Ventas" : "Cursos"
                    ]} />
                    <Bar dataKey="valor" fill="#22C55E" />
                    <Bar dataKey="promedio" fill="#6B7280" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {viewType === "comparacion" && !isLoading && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Comparación de Meses por Escuela
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getViewData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="escuela" />
                  <YAxis tickFormatter={(value) => 
                    metricType === "ventas" ? `${(value/1000).toFixed(0)}k` : value.toString()
                  } />
                  <Tooltip />
                  <Legend />
                  {compareMonths.map((month, index) => (
                    <Bar 
                      key={month} 
                      dataKey={month} 
                      fill={index === 0 ? "#22C55E" : "#6B7280"} 
                      name={formatDateForDisplay(month)}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;  const ExecutiveDashboard = () => {
    const getSalesBySchoolAndMonth = () => {
      const data = {};
      schools.forEach(school => {
        data[school] = {};
        months.forEach(month => {
          const totals = getSchoolTotals(month);
          data[school][month] = totals[school] ? totals[school].ventas : 0;
        });
      });
      return data;
    };

    const getCoursesBySchoolAndMonth = () => {
      const data = {};
      schools.forEach(school => {
        data[school] = {};
        months.forEach(month => {
          const totals = getSchoolTotals(month);
          data[school][month] = totals[school] ? totals[school].cursos : 0;
        });
      });
      return data;
    };

    const calculateMonthlySalesTotals = () => {
      const totals = {};
      months.forEach(month => {
        totals[month] = 0;
        const monthData = salesData[month] || {};
        Object.values(monthData).forEach(school => {
          Object.values(school).forEach(area => {
            Object.values(area).forEach(course => {
              totals[month] += course.ventas;
            });
          });
        });
      });
      return totals;
    };

    const calculateMonthlyCoursesTotals = () => {
      const totals = {};
      months.forEach(month => {
        totals[month] = 0;
        const monthData = salesData[month] || {};
        Object.values(monthData).forEach(school => {
          Object.values(school).forEach(area => {
            Object.values(area).forEach(course => {
              totals[month] += course.cursos;
            });
          });
        });
      });
      return totals;
    };

    const salesBySchool = getSalesBySchoolAndMonth();
    const coursesBySchool = getCoursesBySchoolAndMonth();
    const monthlySalesTotals = calculateMonthlySalesTotals();
    const monthlyCoursesTotals = calculateMonthlyCoursesTotals();

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <ConnectionStatus />
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500">
                {Object.values(salesData).reduce((total, month) => {
                  let monthTotal = 0;
                  Object.values(month).forEach(school => {
                    Object.values(school).forEach(area => {
                      monthTotal += Object.keys(area).length;
                    });
                  });
                  return total + monthTotal;
                }, 0)} registros cargados
              </div>
              
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
            </div>
          </div>
          
          {connectionStatus === 'connected' && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>✅ Conectado exitosamente.</strong> Datos actualizados desde Google Sheets.
              </p>
            </div>
          )}
          
          {connectionStatus === 'error' && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>📊 Usando datos de respaldo.</strong> Verifica tu API Key y Spreadsheet ID.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Ventas Totales</p>
                <p className="text-3xl font-bold">${executiveKPIs.totalVentas.toLocaleString()}</p>
                <p className="text-green-100 text-sm">
                  {executiveKPIs.ventasGrowth > 0 ? '+' : ''}{executiveKPIs.ventasGrowth.toFixed(1)}% vs mes anterior
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
                <p className="text-gray-100 text-sm">
                  {executiveKPIs.cursosGrowth > 0 ? '+' : ''}{executiveKPIs.cursosGrowth.toFixed(1)}% vs mes anterior
                </p>
              </div>
              <ShoppingCart className="w-8 h-8 text-gray-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-400 to-green-500 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <divimport React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus, DollarSign, ShoppingCart, Bell, RefreshCw, Wifi, WifiOff, User, Building, BookOpen, Book, BarChart3, Star, Target, AlertTriangle, Activity, Phone, Mail, Globe, MessageSquare, Users } from 'lucide-react';

const GOOGLE_SHEETS_CONFIG = {
  apiKey: 'AIzaSyBXvaWWirK1_29g7x6uIq2qlmLdBL9g3TE',
  spreadsheetId: '1DHt8N8bEPElP4Stu1m2Wwb2brO3rLKOSuM8y_Ca3nVg',
  ranges: {
    ventas: 'Ventas!A:H',
    cobranza: 'Cobranza!A:Z'
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
  const [selectedInstructor, setSelectedInstructor] = useState("");
  const [viewType, setViewType] = useState("executive");
  const [metricType, setMetricType] = useState("ventas");
  const [compareMonths, setCompareMonths] = useState(["2024-06", "2024-07"]);
  const [salesData, setSalesData] = useState(fallbackData);
  const [cobranzaData, setCobranzaData] = useState({});
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

  const cleanInstructorName = (instructorRaw) => {
    if (!instructorRaw) return 'No asignado';
    
    const cleaned = String(instructorRaw)
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\sáéíóúñÁÉÍÓÚÑüÜ\-\.]/g, '')
      .trim();
    
    if (cleaned === '' || 
        cleaned.toLowerCase() === 'null' || 
        cleaned.toLowerCase() === 'undefined' ||
        cleaned.toLowerCase() === 'sin asignar' ||
        cleaned.toLowerCase() === 'n/a' ||
        cleaned.toLowerCase() === 'no definido') {
      return 'No asignado';
    }
    
    return cleaned.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const debugInstructorData = (salesDataToDebug) => {
    console.log('🔍 DEBUG: Análisis completo de instructores');
    console.log('📊 Total de meses en salesData:', Object.keys(salesDataToDebug).length);
    
    const allInstructors = new Set();
    let totalCourses = 0;
    
    Object.entries(salesDataToDebug).forEach(([month, monthData]) => {
      console.log(`\n📅 === MES: ${month} ===`);
      Object.entries(monthData).forEach(([school, schoolData]) => {
        console.log(`  🏫 Escuela: ${school}`);
        Object.entries(schoolData).forEach(([area, areaData]) => {
          console.log(`    📚 Área: ${area}`);
          Object.entries(areaData).forEach(([course, courseData]) => {
            totalCourses++;
            const instructor = courseData.instructor;
            console.log(`      📖 Curso: ${course}`);
            console.log(`         👨‍🏫 Instructor: "${instructor}" (tipo: ${typeof instructor}, length: ${instructor?.length || 0})`);
            console.log(`         💰 Ventas: ${courseData.ventas}, 📊 Cursos: ${courseData.cursos}`);
            
            if (instructor && instructor !== 'No asignado') {
              allInstructors.add(instructor);
            }
          });
        });
      });
    });
    
    console.log(`\n✅ RESUMEN:`);
    console.log(`   📊 Total cursos procesados: ${totalCourses}`);
    console.log(`   👥 Instructores únicos encontrados: ${allInstructors.size}`);
    console.log(`   📋 Lista de instructores:`, Array.from(allInstructors).sort());
    
    return Array.from(allInstructors);
  };

  const sortMonthsChronologically = (months) => {
    console.log('🔍 Función sortMonthsChronologically recibió:', months);
    return months.sort((a, b) => {
      console.log(`🔀 Comparando: "${a}" vs "${b}"`);
      
      const parseToStandardDate = (dateStr) => {
        if (!dateStr) return null;
        
        const str = dateStr.toString().trim();
        console.log(`  📅 Parseando: "${str}"`);
        
        if (str.match(/^\d{4}-\d{2}$/)) {
          console.log(`    ✅ Formato YYYY-MM detectado: ${str}`);
          return str;
        }
        
        if (str.match(/^\d{1,2}\/\d{4}$/)) {
          const [month, year] = str.split('/');
          const result = `${year}-${month.padStart(2, '0')}`;
          console.log(`    ✅ Formato MM/YYYY convertido: ${str} -> ${result}`);
          return result;
        }
        
        if (str.match(/^\d{1,2}-\d{4}$/)) {
          const [month, year] = str.split('-');
          const result = `${year}-${month.padStart(2, '0')}`;
          console.log(`    ✅ Formato MM-YYYY convertido: ${str} -> ${result}`);
          return result;
        }
        
        const monthNames = {
          'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
          'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
          'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12',
          'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04',
          'may': '05', 'jun': '06', 'jul': '07', 'ago': '08',
          'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
        };
        const parts = str.toLowerCase().split(/[\s-]+/);
        if (parts.length === 2) {
          const month = monthNames[parts[0]];
          const year = parts[1];
          if (month && year && year.match(/^\d{4}$/)) {
            const result = `${year}-${month}`;
            console.log(`    ✅ Formato español convertido: ${str} -> ${result}`);
            return result;
          }
        }
        
        if (parts.length === 2) {
          const month = monthNames[parts[1]];
          const year = parts[0];
          if (month && year && year.match(/^\d{4}$/)) {
            const result = `${year}-${month}`;
            console.log(`    ✅ Formato español invertido convertido: ${str} -> ${result}`);
            return result;
          }
        }
        
        console.log(`    ❌ Formato no reconocido: ${str}`);
        return str;
      };
      
      const dateA = parseToStandardDate(a);
      const dateB = parseToStandardDate(b);
      
      if (!dateA || !dateB) {
        console.log(`    ⚠️ No se pudieron parsear las fechas`);
        return a.localeCompare(b);
      }
      
      const comparison = new Date(dateA + '-01') - new Date(dateB + '-01');
      console.log(`    📊 Resultado: ${dateA} ${comparison < 0 ? '<' : comparison > 0 ? '>' : '='} ${dateB}`);
      return comparison;
    });
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
      
      const cobranzaData = await cobranzaResponse.json();
      const transformedCobranza = transformCobranzaData(cobranzaData.values);
      setCobranzaData(transformedCobranza);
      
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
  
  const transformGoogleSheetsData = (rawData) => {
    if (!rawData || rawData.length < 2) {
      console.warn('No hay datos de ventas para transformar o solo existen encabezados.');
      return {};
    }
    const headers = rawData[0];
    const rows = rawData.slice(1);
    const transformedData = {};
    
    console.log('🔄 Transformando datos de Google Sheets...');
    console.log('📋 Headers:', headers);
    
    rows.forEach((row, index) => {
      const [
        fechaRaw, 
        escuelaRaw, 
        areaRaw, 
        cursoRaw, 
        ventasRaw, 
        cursosVendidosRaw, 
        instructorRaw
      ] = row;
      
      const fecha = fechaRaw ? String(fechaRaw).trim() : '';
      const escuela = escuelaRaw ? String(escuelaRaw).trim() : '';
      const area = areaRaw ? String(areaRaw).trim() : '';
      const curso = cursoRaw ? String(cursoRaw).trim() : '';
      
      const instructor = cleanInstructorName(instructorRaw);
      
      console.log(`📝 Fila ${index + 2}: Instructor RAW: "${instructorRaw}" -> Limpio: "${instructor}"`);
      
      if (!fecha || !escuela || !area || !curso) {
        console.warn(`Fila ${index + 2} incompleta, saltando fila:`, row);
        return;
      }
      
      const monthKey = fecha.substring(0, 7);
      
      if (!transformedData[monthKey]) {
        transformedData[monthKey] = {};
      }
      
      if (!transformedData[monthKey][escuela]) {
        transformedData[monthKey][escuela] = {};
      }
      
      if (!transformedData[monthKey][escuela][area]) {
        transformedData[monthKey][escuela][area] = {};
      }
      
      const ventasNum = parseNumberFromString(ventasRaw);
      const cursosNum = parseNumberFromString(cursosVendidosRaw) || 1;
      
      if (transformedData[monthKey][escuela][area][curso]) {
        transformedData[monthKey][escuela][area][curso].ventas += ventasNum;
        transformedData[monthKey][escuela][area][curso].cursos += cursosNum;
      } else {
        transformedData[monthKey][escuela][area][curso] = {
          ventas: ventasNum,
          cursos: cursosNum,
          instructor: instructor
        };
      }
      
      console.log(`✅ Curso procesado: ${curso} - Instructor: "${instructor}"`);
    });
    
    console.log('🎯 Transformación completada. Datos finales:', transformedData);
    return transformedData;
  };

  const transformContactData = (rawData) => {
    const headers = rawData[0];
    const rows = rawData.slice(1);
    const transformedData = {};
    
    console.log('📞 Transformando datos de medios de contacto...');
    console.log('Headers:', headers);
    rows.forEach((row, index) => {
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
      
      console.log(`📱 ${monthKey} - ${medio}: +${ventasNum} ventas, +${cursosNum} cursos`);
    });
    console.log('✅ Datos de contacto transformados:', transformedData);
    return transformedData;
  };

  const transformCobranzaData = (rawData) => {
    if (!rawData || rawData.length === 0) return {};
    const headers = rawData[0];
    const rows = rawData.slice(1);
    const result = {};
    
    console.log('🔄 Transformando datos de cobranza...');
    console.log('📋 Headers cobranza:', headers);
    console.log('📊 Filas de datos:', rows.length);
    
    const meses = headers.slice(1).filter(header => header && header.trim() !== '');
    console.log('📅 Meses encontrados en headers:', meses);
    
    rows.forEach((row, rowIndex) => {
      const escuela = row[0];
      if (!escuela || escuela.trim() === '') {
        console.log(`⚠️ Fila ${rowIndex + 1}: escuela vacía, saltando`);
        return;
      }
      
      const escuelaClean = escuela.trim();
      result[escuelaClean] = {};
      
      console.log(`\n🏫 Procesando escuela: "${escuelaClean}" (fila ${rowIndex + 1})`);
      console.log(`   Datos de fila completa:`, row);
      
      meses.forEach((mes, mesIndex) => {
        const cellValue = row[mesIndex + 1];
        const monto = parseNumberFromString(cellValue);
        
        const mesClean = mes.trim();
        result[escuelaClean][mesClean] = monto;
        
        console.log(`   📈 ${mesClean} (columna ${mesIndex + 1}): "${cellValue}" -> ${monto.toLocaleString()}`);
      });
    });
    console.log('\n✅ Resultado final de transformación:', result);
    return result;
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

  useEffect(() => {
    if (Object.keys(salesData).length > 0) {
      console.log('🚀 Ejecutando debug de instructores...');
      debugInstructorData(salesData);
    }
  }, [salesData]);

  useEffect(() => {
    const generateAlerts = () => {
      const newAlerts = [];
      const months = Object.keys(salesData).sort();
      
      if (months.length < 2) return;
      
      const currentMonth = months[months.length - 1];
      const previousMonth = months[months.length - 2];
      
      Object.keys(salesData[currentMonth]).forEach(school => {
        Object.keys(salesData[currentMonth][school]).forEach(area => {
          Object.keys(salesData[currentMonth][school][area]).forEach(course => {
            const current = salesData[currentMonth][school][area][course];
            const previous = salesData[previousMonth]?.[school]?.[area]?.[course];
            
            if (previous) {
              const ventasChange = ((current.ventas - previous.ventas) / previous.ventas) * 100;
              const cursosChange = ((current.cursos - previous.cursos) / previous.cursos) * 100;
              
              if (ventasChange < -20) {
                newAlerts.push({
                  type: 'warning',
                  category: 'ventas',
                  message: `${course} en ${school} bajó ${Math.abs(ventasChange).toFixed(1)}% en ventas`,
                  details: `De $${previous.ventas.toLocaleString()} a $${current.ventas.toLocaleString()}`,
                  priority: ventasChange < -40 ? 'urgent' : 'high',
                  curso: course,
                  escuela: school,
                  area: area
                });
              }
              
              if (cursosChange < -30) {
                newAlerts.push({
                  type: 'danger',
                  category: 'cursos',
                  message: `${course} en ${school} bajó ${Math.abs(cursosChange).toFixed(1)}% en cursos vendidos`,
                  details: `De ${previous.cursos} a ${current.cursos} cursos`,
                  priority: 'urgent',
                  curso: course,
                  escuela: school,
                  area: area
                });
              }
              
              if (ventasChange > 50) {
                newAlerts.push({
                  type: 'success',
                  category: 'crecimiento',
                  message: `¡${course} en ${school} creció ${ventasChange.toFixed(1)}% en ventas!`,
                  details: `De $${previous.ventas.toLocaleString()} a $${current.ventas.toLocaleString()}`,
                  priority: 'info',
                  curso: course,
                  escuela: school,
                  area: area
                });
              }
            }
            
            if (current.ventas === 0) {
              newAlerts.push({
                type: 'warning',
                category: 'sin_ventas',
                message: `${course} en ${school} no tuvo ventas este mes`,
                details: 'Revisar estrategia de marketing',
                priority: 'medium',
                curso: course,
                escuela: school,
                area: area
              });
            }
          });
        });
      });
      
      setAlerts(newAlerts.slice(0, 15));
    };
    if (Object.keys(salesData).length > 0) {
      generateAlerts();
    }
  }, [salesData]);

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

  const instructors = useMemo(() => {
    console.log('🔄 Recalculando lista de instructores...');
    const instructorsSet = new Set();
    let processedCourses = 0;
    
    Object.values(salesData).forEach(monthData => {
      Object.values(monthData).forEach(schoolData => {
        Object.values(schoolData).forEach(areaData => {
          Object.values(areaData).forEach(courseData => {
            processedCourses++;
            const instructor = courseData.instructor;
            
            if (instructor && 
                instructor !== 'No asignado' && 
                instructor.trim() !== '' &&
                instructor.toLowerCase() !== 'null' &&
                instructor.toLowerCase() !== 'undefined') {
              instructorsSet.add(instructor.trim());
              console.log(`✅ Instructor agregado: "${instructor}"`);
            }
          });
        });
      });
    });
    
    const result = Array.from(instructorsSet).sort();
    console.log(`📊 Total cursos procesados: ${processedCourses}`);
    console.log(`👥 Total instructores encontrados: ${result.length}`);
    console.log(`📋 Lista final de instructores:`, result);
    
    return result;
  }, [salesData]);

  const months = useMemo(() => {
    return Object.keys(salesData).sort();
  }, [salesData]);

  const contactMethods = useMemo(() => {
    const methodsSet = new Set();
    Object.values(contactData).forEach(monthData => {
      Object.keys(monthData).forEach(method => {
        methodsSet.add(method);
      });
    });
    return Array.from(methodsSet);
  }, [contactData]);

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
      console.warn('Error formatting date:', monthString, error);
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
      console.warn('Error formatting short date:', monthString, error);
      return monthString;
    }
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
        <React.Fragment>
          <Wifi className="w-4 h-4 text-green-500" />
          <span className="text-green-600">Conectado a Google Sheets</span>
        </React.Fragment>
      )}
      {connectionStatus === 'disconnected' && (
        <React.Fragment>
          <WifiOff className="w-4 h-4 text-gray-500" />
          <span className="text-gray-600">Usando datos de ejemplo</span>
        </React.Fragment>
      )}
      {connectionStatus === 'error' && (
        <React.Fragment>
          <WifiOff className="w-4 h-4 text-red-500" />
          <span className="text-red-600">Error - Usando datos de respaldo</span>
        </React.Fragment>
      )}
      {lastUpdated && (
        <span className="text-gray-500 ml-2">
          • Actualizado: {lastUpdated.toLocaleTimeString()}
        </span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="flex items-center bg-white rounded-lg shadow-md p-4">
              <img 
                src="https://idip.com.mx/wp-content/uploads/2024/08/logos-IDIP-sin-fondo-1-2.png" 
                alt="IDIP - Instituto de Imagen Personal"
                className="h-16 w-auto object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden">
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
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard IDIP</h1>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => setViewType("executive")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "executive" 
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg" 
                : "bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard Ejecutivo
            </button>
            <button
              onClick={() => setViewType("escuela")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "escuela" 
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg" 
                : "bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700"
              }`}
            >
              <Building className="w-4 h-4" />
              Por Escuela
            </button>
            <button
              onClick={() => setViewType("area")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "area" 
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg" 
                : "bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Por Área
            </button>
            <button
              onClick={() => setViewType("instructor")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "instructor" 
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg" 
                : "bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700"
              }`}
            >
              <User className="w-4 h-4" />
              Por Vendedor
            </button>
            <button
              onClick={() => setViewType("curso")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "curso" 
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg" 
                : "bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700"
              }`}
            >
              <Book className="w-4 h-4" />
              Por Curso
            </button>
            <button
              onClick={() => setViewType("comparacion")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "comparacion" 
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg" 
                : "bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700"
              }`}
            >
              <Activity className="w-4 h-4" />
              Comparar Meses
            </button>
            <button
              onClick={() => setViewType("contacto")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "contacto" 
                ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg" 
                : "bg-gray-100 text-gray-700 hover:bg-purple-50 hover:text-purple-700"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Medio de Contacto
            </button>
            <button
              onClick={() => setViewType("cobranza")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "cobranza" 
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg" 
                : "bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Cobranza
            </button>
          </div>

          {viewType !== "executive" && viewType !== "cobranza" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Métrica</label>
                <select 
                  value={metricType}
                  onChange={(e) => setMetricType(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="ventas">Ventas ($)</option>
                  <option value="cursos">Cursos Vendidos</option>
                </select>
              </div>

              {viewType !== "comparacion" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mes</label>
                  <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {months.map(month => (
                      <option key={month} value={month}>
                        {formatDateForDisplay(month)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(viewType === "area" || viewType === "instructor" || viewType === "curso") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Escuela</label>
                  <select 
                    value={selectedSchool}
                    onChange={(e) => setSelectedSchool(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Todas las escuelas</option>
                    {schools.map(school => (
                      <option key={school} value={school}>{school}</option>
                    ))}
                  </select>
                </div>
              )}

              {viewType === "curso" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Área</label>
                  <select 
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todas las áreas</option>
                    {areas.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>
              )}

              {viewType === "comparacion" && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meses a Comparar</label>
                  <div className="flex gap-2">
                    {[0, 1].map(index => (
                      <select 
                        key={index}
                        value={compareMonths[index] || ''}
                        onChange={(e) => {
                          const newMonths = [...compareMonths];
                          newMonths[index] = e.target.value;
                          setCompareMonths(newMonths);
                        }}
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        {months.map(month => (
                          <option key={month} value={month}>
                            {formatDateShort(month)}
                          </option>
                        ))}
                      </select>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {isLoading && isManualRefresh && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Cargando datos desde Google Sheets...</p>
          </div>
        )}

        <div>
          <p className="text-center text-gray-500 mt-8">
            Dashboard cargado correctamente - Los instructores aparecerán automáticamente
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
