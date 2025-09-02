import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus, DollarSign, ShoppingCart, Bell, RefreshCw, Wifi, WifiOff, User, Building, BookOpen, Book, BarChart3, Star, Target, AlertTriangle, Activity, Phone, Mail, Globe, MessageSquare, Users } from 'lucide-react';

const GOOGLE_SHEETS_CONFIG = {
  apiKey: 'AIzaSyBXvaWWirK1_29g7x6uIq2qlmLdBL9g3TE',
  spreadsheetId: '1DHt8N8bEPElP4Stu1m2Wwb2brO3rLKOSuM8y_Ca3nVg',
  ranges: {
    ventas: 'Ventas!A:H', // Ampliamos hasta la columna H para incluir medio de contacto
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

// Datos de fallback para medios de contacto
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
  const [contactData, setContactData] = useState(fallbackContactData); // Nuevo estado para medios de contacto
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const parseNumberFromString = (value) => {
    // Si es undefined, null, o string vacío, retornar 0
    if (value === undefined || value === null || value === '') return 0;
    
    // Si ya es un número, retornarlo directamente
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    
    // Convertir a string y limpiar
    const str = value.toString().trim();
    if (str === '' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return 0;
    
    // Remover símbolos de moneda, comas, espacios y otros caracteres no numéricos
    // Mantener solo dígitos, punto decimal y signo negativo
    const cleaned = str
      .replace(/[$,\s]/g, '')           // Remover $, comas y espacios
      .replace(/[^\d.-]/g, '');         // Mantener solo dígitos, punto y guión
    
    // Si después de limpiar no queda nada o solo caracteres especiales, retornar 0
    if (cleaned === '' || cleaned === '.' || cleaned === '-') return 0;
    
    const number = parseFloat(cleaned);
    return isNaN(number) ? 0 : number;
  };

  // Función para ordenar meses cronológicamente (mejorada)
  const sortMonthsChronologically = (months) => {
    console.log('🔍 Función sortMonthsChronologically recibió:', months);
    
    return months.sort((a, b) => {
      console.log(`🔀 Comparando: "${a}" vs "${b}"`);
      
      // Función para convertir diferentes formatos a YYYY-MM
      const parseToStandardDate = (dateStr) => {
        if (!dateStr) return null;
        
        const str = dateStr.toString().trim();
        console.log(`  📅 Parseando: "${str}"`);
        
        // Formato YYYY-MM
        if (str.match(/^\d{4}-\d{2}$/)) {
          console.log(`    ✅ Formato YYYY-MM detectado: ${str}`);
          return str;
        }
        
        // Formato MM/YYYY
        if (str.match(/^\d{1,2}\/\d{4}$/)) {
          const [month, year] = str.split('/');
          const result = `${year}-${month.padStart(2, '0')}`;
          console.log(`    ✅ Formato MM/YYYY convertido: ${str} -> ${result}`);
          return result;
        }
        
        // Formato MM-YYYY
        if (str.match(/^\d{1,2}-\d{4}$/)) {
          const [month, year] = str.split('-');
          const result = `${year}-${month.padStart(2, '0')}`;
          console.log(`    ✅ Formato MM-YYYY convertido: ${str} -> ${result}`);
          return result;
        }
        
        // Formato "Mes YYYY" en español
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
        
        // Formato "YYYY Mes" en español
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
        return str; // Devolver original si no se puede parsear
      };
      
      const dateA = parseToStandardDate(a);
      const dateB = parseToStandardDate(b);
      
      if (!dateA || !dateB) {
        console.log(`    ⚠️ No se pudieron parsear las fechas`);
        return a.localeCompare(b); // Fallback a orden alfabético
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
      // Fetch datos de ventas
      const ventasUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.ranges.ventas}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`;
      const ventasResponse = await fetch(ventasUrl);
      
      if (!ventasResponse.ok) throw new Error(`Error ${ventasResponse.status}: ${ventasResponse.statusText}`);
      
      const ventasData = await ventasResponse.json();
      const transformedVentas = transformGoogleSheetsData(ventasData.values);
      const transformedContact = transformContactData(ventasData.values); // Nueva transformación para medios de contacto
      setSalesData(transformedVentas);
      setContactData(transformedContact);
      
      // Fetch datos de cobranza
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
    const headers = rawData[0];
    const rows = rawData.slice(1);
    const transformedData = {};
    
    rows.forEach((row, index) => {
      const [fecha, escuela, area, curso, ventas, cursosVendidos, instructor] = row;
      
      if (!fecha || !escuela || !area || !curso) {
        console.warn(`Fila ${index + 2} incompleta:`, row);
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
      
      const ventasNum = parseNumberFromString(ventas);
      const cursosNum = parseNumberFromString(cursosVendidos) || 1;
      
      if (transformedData[monthKey][escuela][area][curso]) {
        transformedData[monthKey][escuela][area][curso].ventas += ventasNum;
        transformedData[monthKey][escuela][area][curso].cursos += cursosNum;
      } else {
        transformedData[monthKey][escuela][area][curso] = {
          ventas: ventasNum,
          cursos: cursosNum,
          instructor: instructor || 'No asignado'
        };
      }
    });
    
    return transformedData;
  };

  // Nueva función para transformar datos de medios de contacto
  const transformContactData = (rawData) => {
    const headers = rawData[0];
    const rows = rawData.slice(1);
    const transformedData = {};
    
    console.log('📞 Transformando datos de medios de contacto...');
    console.log('Headers:', headers);
    
    rows.forEach((row, index) => {
      const [fecha, escuela, area, curso, ventas, cursosVendidos, instructor, medioContacto] = row;
      
      if (!fecha || !medioContacto) {
        return; // Saltar filas sin fecha o medio de contacto
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
    
    // La primera columna es la escuela, las siguientes son meses
    const meses = headers.slice(1).filter(header => header && header.trim() !== '');
    console.log('📅 Meses encontrados en headers:', meses);
    
    rows.forEach((row, rowIndex) => {
      const escuela = row[0];
      if (!escuela || escuela.trim() === '') {
        console.log(`⚠️ Fila ${rowIndex + 1}: escuela vacía, saltando`);
        return;
      }
      
      // Limpiar nombre de escuela
      const escuelaClean = escuela.trim();
      result[escuelaClean] = {};
      
      console.log(`\n🏫 Procesando escuela: "${escuelaClean}" (fila ${rowIndex + 1})`);
      console.log(`   Datos de fila completa:`, row);
      
      meses.forEach((mes, mesIndex) => {
        const cellValue = row[mesIndex + 1]; // +1 porque la primera columna es la escuela
        const monto = parseNumberFromString(cellValue);
        
        // Limpiar nombre del mes
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

  // Nuevo computed para medios de contacto
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

  // Nueva función para obtener totales por medio de contacto
  const getContactTotals = (month) => {
    const totals = {};
    if (!contactData[month]) return totals;
    
    Object.keys(contactData[month]).forEach(method => {
      totals[method] = contactData[month][method];
    });
    
    return totals;
  };

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

      case "contacto":
        const contactTotals = getContactTotals(selectedMonth);
        return Object.keys(contactTotals).map(method => {
          const methodValues = months.map(month => {
            const totals = getContactTotals(month);
            return totals[method] ? totals[method][metricType] : 0;
          });
          const average = methodValues.reduce((a, b) => a + b, 0) / methodValues.length;
          const trend = calculateTrend(methodValues);
          
          const getContactIcon = (method) => {
            const methodLower = method.toLowerCase();
            if (methodLower.includes('whatsapp')) return MessageSquare;
            if (methodLower.includes('instagram') || methodLower.includes('facebook')) return Users;
            if (methodLower.includes('teléfono') || methodLower.includes('telefono')) return Phone;
            if (methodLower.includes('email') || methodLower.includes('correo')) return Mail;
            return Globe;
          };
          
          return {
            nombre: method,
            valor: contactTotals[method] ? contactTotals[method][metricType] : 0,
            promedio: Math.round(average),
            tendencia: trend,
            icono: getContactIcon(method)
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
  }, [viewType, selectedMonth, selectedSchool, selectedArea, metricType, months, schools, compareMonths, contactData]);

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

  // Nuevo componente para el dashboard de medios de contacto
  const ContactDashboard = () => {
    const COLORS = ['#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];
    
    const contactTotals = getContactTotals(selectedMonth);
    const totalVentas = Object.values(contactTotals).reduce((sum, method) => sum + method.ventas, 0);
    const totalCursos = Object.values(contactTotals).reduce((sum, method) => sum + method.cursos, 0);
    
    const pieData = Object.entries(contactTotals).map(([method, data]) => ({
      name: method,
      value: data[metricType],
      percentage: totalVentas > 0 ? ((data.ventas / totalVentas) * 100).toFixed(1) : 0
    }));

    const trendData = months.map(month => {
      const monthData = getContactTotals(month);
      const result = { month: formatDateShort(month) };
      
      Object.keys(contactTotals).forEach(method => {
        result[method] = monthData[method] ? monthData[method][metricType] : 0;
      });
      
      return result;
    });

    return (
      <div className="space-y-6">
        {/* KPIs de Medios de Contacto */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total Ventas</p>
                <p className="text-3xl font-bold">${totalVentas.toLocaleString()}</p>
                <p className="text-purple-100 text-sm">Por medios de contacto</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm">Total Cursos</p>
                <p className="text-3xl font-bold">{totalCursos.toLocaleString()}</p>
                <p className="text-indigo-100 text-sm">Cursos vendidos</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-indigo-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-sm">Canales Activos</p>
                <p className="text-3xl font-bold">{Object.keys(contactTotals).length}</p>
                <p className="text-pink-100 text-sm">Medios de contacto</p>
              </div>
              <Users className="w-8 h-8 text-pink-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Ticket Promedio</p>
                <p className="text-3xl font-bold">${totalCursos > 0 ? (totalVentas / totalCursos).toFixed(0) : '0'}</p>
                <p className="text-orange-100 text-sm">Por canal</p>
              </div>
              <Target className="w-8 h-8 text-orange-200" />
            </div>
          </div>
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Pastel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              Distribución por Medio de Contacto
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({metricType === 'ventas' ? 'Ventas' : 'Cursos'})
              </span>
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [
                    metricType === 'ventas' ? `${value.toLocaleString()}` : value.toLocaleString(),
                    metricType === 'ventas' ? 'Ventas' : 'Cursos'
                  ]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico de Tendencias */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              Tendencia por Medio de Contacto
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => 
                    metricType === "ventas" ? `${(value/1000).toFixed(0)}k` : value.toString()
                  } />
                  <Tooltip />
                  <Legend />
                  {Object.keys(contactTotals).map((method, index) => (
                    <Line 
                      key={method}
                      type="monotone" 
                      dataKey={method} 
                      stroke={COLORS[index % COLORS.length]} 
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Tabla Detallada */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Análisis Detallado por Medio de Contacto</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Medio de Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ventas ($)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cursos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket Promedio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % del Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rendimiento
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(contactTotals)
                  .sort(([,a], [,b]) => b.ventas - a.ventas)
                  .map(([method, data], index) => {
                    const ticketPromedio = data.cursos > 0 ? data.ventas / data.cursos : 0;
                    const porcentaje = totalVentas > 0 ? (data.ventas / totalVentas) * 100 : 0;
                    
                    const getContactIcon = (method) => {
                      const methodLower = method.toLowerCase();
                      if (methodLower.includes('whatsapp')) return MessageSquare;
                      if (methodLower.includes('instagram') || methodLower.includes('facebook')) return Users;
                      if (methodLower.includes('teléfono') || methodLower.includes('telefono')) return Phone;
                      if (methodLower.includes('email') || methodLower.includes('correo')) return Mail;
                      return Globe;
                    };
                    
                    const IconComponent = getContactIcon(method);
                    
                    return (
                      <tr key={method} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-5 h-5 text-gray-500" />
                            {method}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          ${data.ventas.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {data.cursos.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${ticketPromedio.toFixed(0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${porcentaje}%` }}
                              ></div>
                            </div>
                            {porcentaje.toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            porcentaje > 25 ? 'bg-green-100 text-green-800' :
                            porcentaje > 15 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {porcentaje > 25 ? 'Excelente' :
                             porcentaje > 15 ? 'Bueno' :
                             'Mejorable'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Insights y Recomendaciones */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">📊 Insights y Recomendaciones</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-800">🎯 Canal más efectivo:</h4>
              {Object.entries(contactTotals).length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-green-800 font-medium">
                    {Object.entries(contactTotals).sort(([,a], [,b]) => b.ventas - a.ventas)[0][0]}
                  </p>
                  <p className="text-green-600 text-sm">
                    ${Object.entries(contactTotals).sort(([,a], [,b]) => b.ventas - a.ventas)[0][1].ventas.toLocaleString()} en ventas
                  </p>
                </div>
              )}
              
              <h4 className="font-medium text-gray-800">💡 Recomendaciones:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Potenciar inversión en el canal más rentable</li>
                <li>• Diversificar estrategias en canales con bajo rendimiento</li>
                <li>• Implementar seguimiento cross-canal</li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-gray-800">📈 Oportunidades de mejora:</h4>
              {Object.entries(contactTotals)
                .sort(([,a], [,b]) => a.ventas - b.ventas)
                .slice(0, 2)
                .map(([method, data]) => (
                  <div key={method} className="p-3 bg-orange-50 rounded-lg">
                    <p className="text-orange-800 font-medium text-sm">{method}</p>
                    <p className="text-orange-600 text-xs">
                      Potencial de crecimiento - Solo ${data.ventas.toLocaleString()}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ExecutiveDashboard = () => {
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

        {/* KPIs Principales */}
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
                <p className="text-gray-100 text-sm">Alertas Activas</p>
                <p className="text-3xl font-bold">{alerts.length}</p>
                <p className="text-gray-100 text-sm">{schools.length} escuelas monitoreadas</p>
              </div>
              <Bell className="w-8 h-8 text-gray-200" />
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
                  <Line yAxisId="ventas" type="monotone" dataKey="ventas" stroke="#22C55E" strokeWidth={3} name="Ventas ($)" />
                  <Line yAxisId="cursos" type="monotone" dataKey="cursos" stroke="#6B7280" strokeWidth={2} name="Cursos" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Vendedores */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-semibold">Top Vendedores</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(getInstructorTotals(selectedMonth))
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
                        <p className="text-xs text-gray-500">{data.areas.length} áreas</p>
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

          {/* Top Áreas */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-semibold">Top Áreas</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(getAreaTotals(selectedMonth))
                .sort(([,a], [,b]) => b.ventas - a.ventas)
                .slice(0, 5)
                .map(([area, data], index) => (
                  <div key={area} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium text-sm">{area}</p>
                        <p className="text-xs text-gray-500">Área de estudio</p>
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

          {/* Top Cursos */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Book className="w-5 h-5 text-gray-600" />
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
                      <p className="font-bold text-sm">${data.ventas.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{data.cursos} vendidos</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Tabla de Ventas por Escuela y Mes */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Ventas por Escuela (en pesos)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-green-50 to-green-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      Escuela
                    </div>
                  </th>
                  {months.map(month => (
                    <th key={month} className="px-6 py-4 text-left text-xs font-semibold text-green-800 uppercase tracking-wider">
                      {formatDateShort(month)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {schools.map((school, index) => (
                  <tr key={school} className={`hover:bg-green-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-green-600" />
                        {school}
                      </div>
                    </td>
                    {months.map(month => (
                      <td key={`${school}-${month}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        ${salesBySchool[school][month]?.toLocaleString() || '0'}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Fila de Totales */}
                <tr className="bg-gradient-to-r from-green-100 to-green-200 font-bold border-t-2 border-green-300">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-900">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Total
                    </div>
                  </td>
                  {months.map(month => (
                    <td key={`total-${month}`} className="px-6 py-4 whitespace-nowrap text-sm text-green-900 font-bold">
                      ${monthlySalesTotals[month]?.toLocaleString() || '0'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla de Cursos por Escuela y Mes */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Cursos Vendidos por Escuela</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      Escuela
                    </div>
                  </th>
                  {months.map(month => (
                    <th key={month} className="px-6 py-4 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">
                      {formatDateShort(month)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {schools.map((school, index) => (
                  <tr key={school} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-600" />
                        {school}
                      </div>
                    </td>
                    {months.map(month => (
                      <td key={`${school}-${month}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {coursesBySchool[school][month]?.toLocaleString() || '0'}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Fila de Totales */}
                <tr className="bg-gradient-to-r from-gray-100 to-gray-200 font-bold border-t-2 border-gray-300">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Total
                    </div>
                  </td>
                  {months.map(month => (
                    <td key={`total-${month}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                      {monthlyCoursesTotals[month]?.toLocaleString() || '0'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const CobranzaDashboard = () => {
    // Obtener todos los meses únicos de los datos de cobranza y ordenarlos cronológicamente
    const mesesCobranza = useMemo(() => {
      // Si no hay datos, retornar array vacío
      if (!cobranzaData || Object.keys(cobranzaData).length === 0) {
        return [];
      }
      
      const meses = new Set();
      
      // Extraer todos los meses de todas las escuelas
      Object.values(cobranzaData).forEach(escuelaData => {
        Object.keys(escuelaData).forEach(mes => {
          if (mes && mes.trim() !== '') {
            meses.add(mes.trim());
          }
        });
      });
      
      // Convertir a array y ordenar cronológicamente
      const mesesArray = Array.from(meses);
      return sortMonthsChronologically(mesesArray);
    }, [cobranzaData]);

    // Calcular totales por mes (corregido con debug)
    const totalesPorMes = useMemo(() => {
      const totales = {};
      
      console.log('💰 Iniciando cálculo de totales por mes');
      console.log('📊 Datos de cobranza completos:', cobranzaData);
      
      // Inicializar todos los meses con 0
      mesesCobranza.forEach(mes => {
        totales[mes] = 0;
        console.log(`📅 Inicializando mes "${mes}" en 0`);
      });
      
      // Sumar los montos de cada escuela para cada mes
      Object.entries(cobranzaData).forEach(([escuela, datosEscuela]) => {
        console.log(`\n🏫 Procesando escuela: "${escuela}"`);
        console.log(`   Datos de escuela:`, datosEscuela);
        
        Object.entries(datosEscuela).forEach(([mes, monto]) => {
          const mesLimpio = mes.trim();
          
          if (mes && mesLimpio !== '' && mesesCobranza.includes(mesLimpio)) {
            const montoOriginal = monto;
            const montoNumerico = parseNumberFromString(monto);
            
            console.log(`   📈 ${escuela} - ${mesLimpio}:`);
            console.log(`      Valor original: "${montoOriginal}" (tipo: ${typeof montoOriginal})`);
            console.log(`      Valor parseado: ${montoNumerico}`);
            console.log(`      Total anterior: ${totales[mesLimpio]}`);
            
            totales[mesLimpio] += montoNumerico;
            
            console.log(`      Nuevo total: ${totales[mesLimpio]}`);
          } else {
            console.log(`   ⚠️ Mes "${mes}" ignorado (limpio: "${mesLimpio}", incluido: ${mesesCobranza.includes(mesLimpio)})`);
          }
        });
      });
      
      console.log('\n🎯 Totales finales por mes:');
      Object.entries(totales).forEach(([mes, total]) => {
        console.log(`   ${mes}: ${total.toLocaleString()}`);
      });
      
      return totales;
    }, [cobranzaData, mesesCobranza]);

    // Calcular totales por escuela (simplificado)
    const totalesPorEscuela = useMemo(() => {
      const totales = {};
      
      // Si no hay datos, retornar objeto vacío
      if (!cobranzaData || Object.keys(cobranzaData).length === 0) {
        return totales;
      }
      
      Object.entries(cobranzaData).forEach(([escuela, datosEscuela]) => {
        totales[escuela] = 0;
        Object.values(datosEscuela).forEach(valor => {
          const valorNumerico = parseNumberFromString(valor);
          totales[escuela] += valorNumerico;
        });
      });
      
      return totales;
    }, [cobranzaData]);

    const escuelas = Object.keys(cobranzaData);

    return (
      <div className="space-y-6">
        {/* Resumen de Cobranza */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Cobranza</p>
                <p className="text-3xl font-bold">
                  ${Object.values(totalesPorMes).reduce((sum, val) => sum + val, 0).toLocaleString()}
                </p>
                <p className="text-blue-100 text-sm">{mesesCobranza.length} meses registrados</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm">Escuelas Activas</p>
                <p className="text-3xl font-bold">{escuelas.length}</p>
                <p className="text-indigo-100 text-sm">Generando ingresos</p>
              </div>
              <Building className="w-8 h-8 text-indigo-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Promedio Mensual</p>
                <p className="text-3xl font-bold">
                  ${mesesCobranza.length > 0 ? Math.round(Object.values(totalesPorMes).reduce((sum, val) => sum + val, 0) / mesesCobranza.length).toLocaleString() : '0'}
                </p>
                <p className="text-purple-100 text-sm">Por mes</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-200" />
            </div>
          </div>
        </div>

        {/* Tabla Principal de Cobranza */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Cobranza por Escuela
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building className="w-4 h-4" />
              <span>{escuelas.length} escuelas • {mesesCobranza.length} meses</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    Escuela
                  </th>
                  {mesesCobranza.map(mes => (
                    <th key={mes} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                      {mes}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 min-w-[120px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {escuelas.map(escuela => (
                  <tr key={escuela} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-500" />
                        {escuela}
                      </div>
                    </td>
                    {mesesCobranza.map(mes => {
                      const monto = parseNumberFromString(cobranzaData[escuela]?.[mes]) || 0;
                      return (
                        <td key={`${escuela}-${mes}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={monto > 0 ? 'font-medium' : 'text-gray-400'}>
                            ${monto.toLocaleString()}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900 bg-blue-50">
                      ${totalesPorEscuela[escuela]?.toLocaleString() || '0'}
                    </td>
                  </tr>
                ))}
                {/* Fila de totales */}
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-gray-100 z-10">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-gray-700" />
                      Total por Mes
                    </div>
                  </td>
                  {mesesCobranza.map(mes => (
                    <td key={`total-${mes}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${totalesPorMes[mes]?.toLocaleString() || '0'}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900 bg-blue-100">
                    ${Object.values(totalesPorMes).reduce((sum, val) => sum + val, 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico de Tendencia de Cobranza */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Tendencia de Cobranza Total</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mesesCobranza.map(mes => ({
                mes: mes,
                total: totalesPorMes[mes] || 0
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="mes" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis tickFormatter={(value) => `${(value/1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => [`${value.toLocaleString()}`, 'Cobranza']} />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#3B82F6" 
                  strokeWidth={3} 
                  dot={{ r: 6 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Escuelas por Cobranza */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">Top Escuelas por Cobranza Total</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(totalesPorEscuela)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 6)
              .map(([escuela, total], index) => (
                <div key={escuela} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-500' : 
                      'bg-blue-500'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{escuela}</p>
                      <p className="text-xs text-gray-500">
                        {mesesCobranza.filter(mes => {
                          const monto = parseNumberFromString(cobranzaData[escuela]?.[mes]);
                          return monto > 0;
                        }).length} meses activos
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">${total.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">
                      ${Math.round(total / Math.max(mesesCobranza.length, 1)).toLocaleString()}/mes
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Análisis de Rendimiento */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Análisis de Rendimiento por Escuela</h3>
          <div className="space-y-4">
            {escuelas.map(escuela => {
              const montos = mesesCobranza.map(mes => parseNumberFromString(cobranzaData[escuela]?.[mes]) || 0);
              const total = totalesPorEscuela[escuela] || 0;
              const promedio = total / Math.max(mesesCobranza.length, 1);
              const mesesActivos = montos.filter(m => m > 0).length;
              const consistency = mesesActivos / mesesCobranza.length;
              
              return (
                <div key={escuela} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building className="w-5 h-5 text-gray-500" />
                      <h4 className="font-medium">{escuela}</h4>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${total.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Total</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Promedio Mensual</p>
                      <p className="font-medium">${Math.round(promedio).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Meses Activos</p>
                      <p className="font-medium">{mesesActivos} / {mesesCobranza.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Consistencia</p>
                      <p className="font-medium">{(consistency * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Mejor Mes</p>
                      <p className="font-medium">${Math.max(...montos).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {/* Barra de progreso de consistencia */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          consistency >= 0.8 ? 'bg-green-500' :
                          consistency >= 0.6 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${consistency * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header con logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            {/* Logo IDIP desde URL oficial */}
            <div className="flex items-center bg-white rounded-lg shadow-md p-4">
              <img 
                src="https://idip.com.mx/wp-content/uploads/2024/08/logos-IDIP-sin-fondo-1-2.png" 
                alt="IDIP - Instituto de Imagen Personal"
                className="h-16 w-auto object-contain"
                onError={(e) => {
                  // Fallback en caso de que la imagen no cargue
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              {/* Fallback logo en caso de que la imagen no cargue */}
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
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard IDIP
          </h1>
        </div>

        {/* Navegación principal */}
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

          {/* Controles específicos según la vista */}
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

        {/* Contenido principal */}
        {isLoading && isManualRefresh && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Cargando datos desde Google Sheets...</p>
          </div>
        )}

        {viewType === "executive" && <ExecutiveDashboard />}
        {viewType === "cobranza" && <CobranzaDashboard />}
        {viewType === "contacto" && <ContactDashboard />}

        {/* Vistas de tablas */}
        {(viewType === "escuela" || viewType === "area" || viewType === "instructor" || viewType === "curso" || viewType === "contacto") && !isLoading && viewType !== "contacto" && (
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
              {/* Tabla */}
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
                    <Bar dataKey="valor" fill="#22C55E" />
                    <Bar dataKey="promedio" fill="#6B7280" />
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

export default Dashboard;
