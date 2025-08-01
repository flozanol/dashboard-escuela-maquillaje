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
  const [selectedInstructor, setSelectedInstructor] = useState("");
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
  const [alerts, setAlerts] = useState([]);

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
    return isNaN(number) ? 0 : number;
  };

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
    const headers = rawData[0];
    const rows = rawData.slice(1);
    
    const transformedData = {};
    
    rows.forEach((row, index) => {
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
      
      const ventasNum = parseNumberFromString(ventas);
      const cursosNum = parseNumberFromString(cursosVendidos) || 1;
      
      transformedData[monthKey][escuela][area][curso].ventas += ventasNum;
      transformedData[monthKey][escuela][area][curso].cursos += cursosNum;
    });
    
    return transformedData;
  };

  // Cargar datos iniciales y actualización automática
  useEffect(() => {
    fetchGoogleSheetsData();
    const interval = setInterval(() => {
      fetchGoogleSheetsData(false);
    }, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Generar alertas automáticas
  useEffect(() => {
    const generateAlerts = () => {
      const newAlerts = [];
      const monthsArray = Object.keys(salesData).sort();
      
      if (monthsArray.length < 2) return;
      
      const currentMonth = monthsArray[monthsArray.length - 1];
      const previousMonth = monthsArray[monthsArray.length - 2];
      
      Object.keys(salesData[currentMonth]).forEach(school => {
        Object.keys(salesData[currentMonth][school]).forEach(area => {
          Object.keys(salesData[currentMonth][school][area]).forEach(course => {
            const current = salesData[currentMonth][school][area][course];
            const previous = salesData[previousMonth]?.[school]?.[area]?.[course];
            
            if (previous) {
              const ventasChange = ((current.ventas - previous.ventas) / previous.ventas) * 100;
              
              if (ventasChange < -20) {
                newAlerts.push({
                  type: 'warning',
                  message: `${course} en ${school} bajó ${Math.abs(ventasChange).toFixed(1)}% en ventas`,
                  details: `De ${formatCurrency(previous.ventas)} a ${formatCurrency(current.ventas)}`,
                  priority: ventasChange < -40 ? 'urgent' : 'high',
                  curso: course,
                  escuela: school,
                  area: area
                });
              }
              
              if (ventasChange > 50) {
                newAlerts.push({
                  type: 'success',
                  message: `¡${course} en ${school} creció ${ventasChange.toFixed(1)}% en ventas!`,
                  details: `De ${formatCurrency(previous.ventas)} a ${formatCurrency(current.ventas)}`,
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
              alert.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
              'bg-green-50 border-green-500'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {alert.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                    {alert.type === 'success' && <TrendingUp className="w-4 h-4 text-green-500" />}
                    <p className="text-sm font-medium">{alert.message}</p>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{alert.details}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Componente principal del dashboard ejecutivo
  const ExecutiveDashboard = () => (
    <div className="space-y-6">
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
                <YAxis yAxisId="ventas" orientation="left" tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
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
