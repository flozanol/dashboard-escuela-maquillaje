import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Minus, DollarSign, ShoppingCart, Users, Award, Scissors, Eye, Book, Package, AlertTriangle, Mail, Calendar, Star, Target, Activity, Bell, RefreshCw, Wifi, WifiOff, User, Building, BookOpen, BarChart3 } from 'lucide-react';

// 🔧 CONFIGURACIÓN DE GOOGLE SHEETS - YA CONFIGURADO
const GOOGLE_SHEETS_CONFIG = {
  apiKey: 'AIzaSyBXvaWWirK1_29g7x6uIq2qlmLdBL9g3TE', // ✅ Tu API Key real
  spreadsheetId: '1DHt8N8bEPElP4Stu1m2Wwb2brO3rLKOSuM8y_Ca3nVg', // ✅ Tu Spreadsheet ID real
  range: 'Ventas!A:G' // ✅ Tu hoja se llama "Ventas"
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
  const [selectedSchool, setSelectedSchool] = useState("Polanco");
  const [selectedArea, setSelectedArea] = useState("Maquillaje");
  const [selectedInstructor, setSelectedInstructor] = useState("");
  const [viewType, setViewType] = useState("executive");
  const [metricType, setMetricType] = useState("ventas");
  const [compareMonths, setCompareMonths] = useState(["2024-06", "2024-07"]);
  
  // Estados para Google Sheets
  const [salesData, setSalesData] = useState(fallbackData);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [alerts, setAlerts] = useState([]);

  // Función para obtener datos de Google Sheets
  const fetchGoogleSheetsData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setIsManualRefresh(showLoading);
    
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.range}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`;
      
      console.log('🔍 Intentando conectar a:', url); // Debug
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📊 Datos recibidos de Google Sheets:', data); // Debug
      
      if (!data.values || data.values.length === 0) {
        throw new Error('No se encontraron datos en la hoja de cálculo');
      }
      
      console.log('📋 Primeras 3 filas de datos:', data.values.slice(0, 3)); // Debug
      
      const transformedData = transformGoogleSheetsData(data.values);
      console.log('🔄 Datos transformados:', transformedData); // Debug
      
      setSalesData(transformedData);
      setConnectionStatus('connected');
      setLastUpdated(new Date());
      setErrorMessage('');
      
    } catch (error) {
      console.error('❌ Error completo:', error);
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
    
    // Convertir a string si no lo es
    const str = value.toString();
    
    // Remover comas, espacios y caracteres no numéricos excepto punto y signo negativo
    const cleaned = str.replace(/[,$\s]/g, '').replace(/[^\d.-]/g, '');
    
    // Convertir a número
    const number = parseFloat(cleaned);
    
    console.log(`🔢 Convirtiendo "${value}" → "${cleaned}" → ${number}`);
    
    return isNaN(number) ? 0 : number;
  };
  const transformGoogleSheetsData = (rawData) => {
    const headers = rawData[0];
    const rows = rawData.slice(1);
    
    const transformedData = {};
    
    rows.forEach(row => {
      const [fecha, escuela, area, curso, ventas, cursosVendidos, instructor] = row;
      
      if (!fecha || !escuela || !area || !curso) return;
      
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
      
      if (!transformedData[monthKey][escuela][area][curso]) {
        transformedData[monthKey][escuela][area][curso] = {
          ventas: 0,
          cursos: 0,
          instructor: instructor || 'No asignado'
        };
      }
      
      transformedData[monthKey][escuela][area][curso].ventas += parseInt(ventas) || 0;
      transformedData[monthKey][escuela][area][curso].cursos += parseInt(cursosVendidos) || 1;
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
      fetchGoogleSheetsData(false);
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Generar alertas automáticas
  useEffect(() => {
    const generateAlerts = () => {
      const newAlerts = [];
      const months = Object.keys(salesData).sort();
      
      if (months.length < 2) return;
      
      const currentMonth = months[months.length - 1];
      const previousMonth = months[months.length - 2];
      
      // Alertas por curso
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
                  details: `De ${formatCurrency(previous.ventas)} a ${formatCurrency(current.ventas)}`,
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
                  details: `De ${formatNumber(previous.cursos)} a ${formatNumber(current.cursos)} cursos`,
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
                  details: `De ${formatCurrency(previous.ventas)} a ${formatCurrency(current.ventas)}`,
                  priority: 'info',
                  curso: course,
                  escuela: school,
                  area: area
                });
              }
            }
            
            // Alerta si un curso no tuvo ventas este mes
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
    const instructorsSet = new Set();
    Object.values(salesData).forEach(monthData => {
      Object.values(monthData).forEach(schoolData => {
        Object.values(schoolData).forEach(areaData => {
          Object.values(areaData).forEach(courseData => {
            if (courseData.instructor && courseData.instructor !== 'No asignado') {
              instructorsSet.add(courseData.instructor);
            }
          });
        });
      });
    });
    return Array.from(instructorsSet);
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

  // Función para obtener totales por área
  const getAreaTotals = (month, school = null) => {
    const totals = {};
    if (!salesData[month]) return totals;
    
    const schoolsToProcess = school ? [school] : Object.keys(salesData[month]);
    
    schoolsToProcess.forEach(schoolKey => {
      if (salesData[month][schoolKey]) {
        Object.keys(salesData[month][schoolKey]).forEach(area => {
          if (!totals[area]) {
            totals[area] = { ventas: 0, cursos: 0 };
          }
          Object.keys(salesData[month][schoolKey][area]).forEach(course => {
            totals[area].ventas += salesData[month][schoolKey][area][course].ventas;
            totals[area].cursos += salesData[month][schoolKey][area][course].cursos;
          });
        });
      }
    });
    return totals;
  };

  // Función para obtener totales por instructor
  const getInstructorTotals = (month, school = null) => {
    const totals = {};
    if (!salesData[month]) return totals;
    
    const schoolsToProcess = school ? [school] : Object.keys(salesData[month]);
    
    schoolsToProcess.forEach(schoolKey => {
      if (salesData[month][schoolKey]) {
        Object.keys(salesData[month][schoolKey]).forEach(area => {
          Object.keys(salesData[month][schoolKey][area]).forEach(course => {
            const courseData = salesData[month][schoolKey][area][course];
            const instructor = courseData.instructor;
            
            if (instructor && instructor !== 'No asignado') {
              if (!totals[instructor]) {
                totals[instructor] = { ventas: 0, cursos: 0, areas: new Set(), escuelas: new Set() };
              }
              totals[instructor].ventas += courseData.ventas;
              totals[instructor].cursos += courseData.cursos;
              totals[instructor].areas.add(area);
              totals[instructor].escuelas.add(schoolKey);
            }
          });
        });
      }
    });
    
    // Convertir Sets a arrays
    Object.keys(totals).forEach(instructor => {
      totals[instructor].areas = Array.from(totals[instructor].areas);
      totals[instructor].escuelas = Array.from(totals[instructor].escuelas);
    });
    
    return totals;
  };

  // Función para obtener cursos específicos
  const getCourses = (month, school = null, area = null) => {
    const courses = {};
    if (!salesData[month]) return courses;
    
    const schoolsToProcess = school ? [school] : Object.keys(salesData[month]);
    
    schoolsToProcess.forEach(schoolKey => {
      if (salesData[month][schoolKey]) {
        const areasToProcess = area ? [area] : Object.keys(salesData[month][schoolKey]);
        
        areasToProcess.forEach(areaKey => {
          if (salesData[month][schoolKey][areaKey]) {
            Object.keys(salesData[month][schoolKey][areaKey]).forEach(course => {
              const key = `${course} (${schoolKey}${area ? '' : ' - ' + areaKey})`;
              if (!courses[key]) {
                courses[key] = { ventas: 0, cursos: 0, instructor: '', escuela: schoolKey, area: areaKey };
              }
              const courseData = salesData[month][schoolKey][areaKey][course];
              courses[key].ventas += courseData.ventas;
              courses[key].cursos += courseData.cursos;
              courses[key].instructor = courseData.instructor;
            });
          }
        });
      }
    });
    
    return courses;
  };

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

  // Datos para las diferentes vistas
  const getViewData = useMemo(() => {
    switch (viewType) {
      case "escuela":
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
            tendencia: trend,
            icono: Building
          };
        });

      case "area":
        const areaTotals = getAreaTotals(selectedMonth, selectedSchool);
        return Object.keys(areaTotals).map(area => {
          const areaValues = months.map(month => {
            const totals = getAreaTotals(month, selectedSchool);
            return totals[area] ? totals[area][metricType] : 0;
          });
          const average = areaValues.reduce((a, b) => a + b, 0) / areaValues.length;
          const trend = calculateTrend(areaValues);
          
          return {
            nombre: area,
            valor: areaTotals[area][metricType],
            promedio: Math.round(average),
            tendencia: trend,
            icono: BookOpen
          };
        });

      case "instructor":
        const instructorTotals = getInstructorTotals(selectedMonth, selectedSchool);
        return Object.keys(instructorTotals).map(instructor => {
          const instructorValues = months.map(month => {
            const totals = getInstructorTotals(month, selectedSchool);
            return totals[instructor] ? totals[instructor][metricType] : 0;
          });
          const average = instructorValues.reduce((a, b) => a + b, 0) / instructorValues.length;
          const trend = calculateTrend(instructorValues);
          
          return {
            nombre: instructor,
            valor: instructorTotals[instructor][metricType],
            promedio: Math.round(average),
            tendencia: trend,
            areas: instructorTotals[instructor].areas.join(', '),
            escuelas: instructorTotals[instructor].escuelas.join(', '),
            icono: User
          };
        });

      case "curso":
        const courses = getCourses(selectedMonth, selectedSchool, selectedArea);
        return Object.keys(courses).map(courseName => {
          const courseValues = months.map(month => {
            const coursesInMonth = getCourses(month, selectedSchool, selectedArea);
            return coursesInMonth[courseName] ? coursesInMonth[courseName][metricType] : 0;
          });
          const average = courseValues.reduce((a, b) => a + b, 0) / courseValues.length;
          const trend = calculateTrend(courseValues);
          
          return {
            nombre: courseName,
            valor: courses[courseName][metricType],
            promedio: Math.round(average),
            tendencia: trend,
            instructor: courses[courseName].instructor,
            icono: Book
          };
        });

      case "comparacion":
        return schools.map(school => {
          const data = { escuela: school };
          compareMonths.forEach(month => {
            const totals = getSchoolTotals(month);
            data[month] = totals[school] ? totals[school][metricType] : 0;
          });
          return data;
        });

      default:
        return [];
    }
  }, [viewType, selectedMonth, selectedSchool, selectedArea, metricType, months, schools, compareMonths]);

  // Componente de Alertas
  const AlertsPanel = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold">Alertas Automáticas</h3>
          <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
            {alerts.length}
          </span>
        </div>
        <button 
          onClick={() => setAlerts([])}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Limpiar todas
        </button>
      </div>
      
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No hay alertas en este momento</p>
          </div>
        ) : (
          alerts.map((alert, index) => (
            <div key={index} className={`p-3 rounded-lg border-l-4 ${
              alert.type === 'danger' ? 'bg-red-50 border-red-500' :
              alert.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
              'bg-green-50 border-green-500'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {alert.type === 'danger' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    {alert.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                    {alert.type === 'success' && <TrendingUp className="w-4 h-4 text-green-500" />}
                    <p className="text-sm font-medium">{alert.message}</p>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{alert.details}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                      {alert.escuela}
                    </span>
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                      {alert.area}
                    </span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  alert.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                  alert.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                  alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {alert.priority === 'urgent' ? 'Urgente' :
                   alert.priority === 'high' ? 'Alto' :
                   alert.priority === 'medium' ? 'Medio' :
                   'Info'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      
      {alerts.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Recomendaciones automáticas:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Revisar cursos con caída >20% en ventas</li>
            <li>• Considerar promociones para cursos sin ventas</li>
            <li>• Replicar estrategias de cursos con alto crecimiento</li>
            <li>• Programar reunión con instructores de cursos en riesgo</li>
          </ul>
        </div>
      )}
    </div>
  );

  // Componente principal del dashboard ejecutivo
  const ExecutiveDashboard = () => (
    <div className="space-y-6">
      {/* Estado de conexión */}
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
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
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
            <button 
              onClick={() => {
                console.log('📊 Datos actuales en salesData:', salesData);
                
                // Calcular total de julio manualmente
                const julioData = salesData["2024-07"];
                if (julioData) {
                  let total = 0;
                  Object.keys(julioData).forEach(school => {
                    Object.keys(julioData[school]).forEach(area => {
                      Object.keys(julioData[school][area]).forEach(course => {
                        total += julioData[school][area][course].ventas;
                      });
                    });
                  });
                  console.log(`💰 TOTAL JULIO CALCULADO: ${total.toLocaleString()}`);
                  alert(`Total Julio: ${total.toLocaleString()}`);
                } else {
                  console.log('❌ No hay datos para julio 2024');
                  alert('No hay datos para julio 2024');
                }
              }}
              className="mt-2 text-xs bg-green-200 text-green-800 px-2 py-1 rounded hover:bg-green-300"
            >
              🔍 Verificar total Julio
            </button>
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

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Ventas Totales</p>
              <p className="text-3xl font-bold">{formatCurrency(executiveKPIs.totalVentas)}</p>
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
              <p className="text-3xl font-bold">{formatNumber(executiveKPIs.totalCursos)}</p>
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
              <p className="text-3xl font-bold">{formatCurrency(executiveKPIs.ticketPromedio)}</p>
              <p className="text-purple-100 text-sm">Por curso vendido</p>
            </div>
            <Target className="w-8 h-8 text-purple-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Alertas Activas</p>
              <p className="text-3xl font-bold">{alerts.length}</p>
              <p className="text-orange-100 text-sm">{schools.length} escuelas monitoreadas</p>
            </div>
            <Bell className="w-8 h-8 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Alertas y Tendencias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertsPanel />

        {/* Gráfica de Tendencias */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Tendencia Mensual de Ventas</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={months.map(month => {
                const totals = getSchoolTotals(month);
                const totalVentas = Object.values(totals).reduce((sum, school) => sum + school.ventas, 0);
                return {
                  month: month.substring(5),
                  ventas: totalVentas,
                  cursos: Object.values(totals).reduce((sum, school) => sum + school.cursos, 0)
                };
              })}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="ventas" orientation="left" tickFormatter={(value) => `${(value/1000).toFixed(0)}k`} />
                <YAxis yAxisId="cursos" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="ventas" type="monotone" dataKey="ventas" stroke="#3B82F6" strokeWidth={3} name="Ventas ($)" />
                <Line yAxisId="cursos" type="monotone" dataKey="cursos" stroke="#10B981" strokeWidth={2} name="Cursos" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Instructores */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">Top Instructores</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(getInstructorTotals(selectedMonth))
              .sort(([,a], [,b]) => b.ventas - a.ventas)
              .slice(0, 5)
              .map(([instructor, data], index) => (
                <div key={instructor} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{instructor}</p>
                      <p className="text-xs text-gray-500">{data.areas.length} áreas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{formatCurrency(data.ventas)}</p>
                    <p className="text-xs text-gray-500">{formatNumber(data.cursos)} cursos</p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Top Áreas */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Top Áreas</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(getAreaTotals(selectedMonth))
              .sort(([,a], [,b]) => b.ventas - a.ventas)
              .slice(0, 5)
              .map(([area, data], index) => (
                <div key={area} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-sm">{area}</p>
                      <p className="text-xs text-gray-500">Área de estudio</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{formatCurrency(data.ventas)}</p>
                    <p className="text-xs text-gray-500">{formatNumber(data.cursos)} cursos</p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Top Cursos */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Book className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold">Top Cursos</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(getCourses(selectedMonth))
              .sort(([,a], [,b]) => b.ventas - a.ventas)
              .slice(0, 5)
              .map(([course, data], index) => (
                <div key={course} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{course.split(' (')[0]}</p>
                    <p className="text-xs text-gray-500">{data.instructor}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{formatCurrency(data.ventas)}</p>
                    <p className="text-xs text-gray-500">{formatNumber(data.cursos)} vendidos</p>
                  </div>
                </div>
              ))}
          </div>
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "executive" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard Ejecutivo
            </button>
            <button
              onClick={() => setViewType("escuela")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "escuela" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Building className="w-4 h-4" />
              Por Escuela
            </button>
            <button
              onClick={() => setViewType("area")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "area" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Por Área
            </button>
            <button
              onClick={() => setViewType("instructor")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "instructor" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <User className="w-4 h-4" />
              Por Instructor
            </button>
            <button
              onClick={() => setViewType("curso")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "curso" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Book className="w-4 h-4" />
              Por Curso
            </button>
            <button
              onClick={() => setViewType("comparacion")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "comparacion" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Activity className="w-4 h-4" />
              Comparar Meses
            </button>
          </div>

          {/* Controles específicos según la vista */}
          {viewType !== "executive" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

              {viewType !== "comparacion" && (
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
              )}

              {(viewType === "area" || viewType === "instructor" || viewType === "curso") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Escuela</label>
                  <select 
                    value={selectedSchool}
                    onChange={(e) => setSelectedSchool(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {months.map(month => (
                          <option key={month} value={month}>
                            {new Date(month + "-01").toLocaleDateString('es-ES', { 
                              year: 'numeric', 
                              month: 'short' 
                            })}
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

        {/* Contenido principal */}
        {isLoading && isManualRefresh && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Cargando datos desde Google Sheets...</p>
          </div>
        )}

        {viewType === "executive" && <ExecutiveDashboard />}

        {/* Vistas de tablas */}
        {(viewType === "escuela" || viewType === "area" || viewType === "instructor" || viewType === "curso") && !isLoading && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                {viewType === "escuela" && "Análisis por Escuela"}
                {viewType === "area" && `Análisis por Área${selectedSchool ? ` - ${selectedSchool}` : ""}`}
                {viewType === "instructor" && `Análisis por Instructor${selectedSchool ? ` - ${selectedSchool}` : ""}`}
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
              {/* Tabla */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {viewType === "escuela" ? "Escuela" : 
                         viewType === "area" ? "Área" : 
                         viewType === "instructor" ? "Instructor" : "Curso"}
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
                          {viewType === "instructor" ? "Áreas" : "Instructor"}
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

              {/* Gráfica */}
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
                    <Bar dataKey="valor" fill="#3B82F6" />
                    <Bar dataKey="promedio" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Vista de Comparación */}
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
                      fill={index === 0 ? "#3B82F6" : "#EF4444"} 
                      name={new Date(month + "-01").toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
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

export default Dashboard;
