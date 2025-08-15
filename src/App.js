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
        "Maquillaje Basico": { ventas: 24000, cursos: 20, instructor: "Ana Martinez" },
        "Maquillaje Profesional": { ventas: 35000, cursos: 14, instructor: "Sofia Lopez" }
      },
      "Certificaciones": {
        "Certificacion Basica": { ventas: 25000, cursos: 25, instructor: "Roberto Silva" }
      }
    },
    "Online": {
      "Maquillaje": {
        "Curso Online Basico": { ventas: 18000, cursos: 36, instructor: "Ana Martinez" }
      }
    }
  },
  "2024-07": {
    "Polanco": {
      "Maquillaje": {
        "Maquillaje Basico": { ventas: 28000, cursos: 24, instructor: "Ana Martinez" },
        "Maquillaje Profesional": { ventas: 42000, cursos: 18, instructor: "Sofia Lopez" }
      },
      "Certificaciones": {
        "Certificacion Basica": { ventas: 35000, cursos: 35, instructor: "Roberto Silva" }
      }
    },
    "Online": {
      "Maquillaje": {
        "Curso Online Basico": { ventas: 25000, cursos: 50, instructor: "Ana Martinez" }
      }
    }
  }
};

const fallbackContactData = {
  "2024-01": {
    "WhatsApp": { ventas: 45000, cursos: 35 },
    "Instagram": { ventas: 32000, cursos: 28 },
    "Facebook": { ventas: 28000, cursos: 22 },
    "Telefono": { ventas: 18000, cursos: 15 },
    "Email": { ventas: 15000, cursos: 12 }
  },
  "2024-07": {
    "WhatsApp": { ventas: 52000, cursos: 42 },
    "Instagram": { ventas: 38000, cursos: 35 },
    "Facebook": { ventas: 35000, cursos: 28 },
    "Telefono": { ventas: 22000, cursos: 18 },
    "Email": { ventas: 18000, cursos: 15 }
  }
};

const fallbackIngresosData = [
  { concepto: "Cursos Presenciales", monto: 150000 },
  { concepto: "Cursos Online", monto: 85000 },
  { concepto: "Certificaciones", monto: 120000 },
  { concepto: "Talleres Especiales", monto: 45000 },
  { concepto: "Materiales y Productos", monto: 75000 },
  { concepto: "Servicios Adicionales", monto: 35000 }
];

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState("2024-07");
  const [selectedSchool, setSelectedSchool] = useState("Polanco");
  const [selectedArea, setSelectedArea] = useState("Maquillaje");
  const [viewType, setViewType] = useState("executive");
  const [metricType, setMetricType] = useState("ventas");
  const [compareMonths, setCompareMonths] = useState(["2024-06", "2024-07"]);
  const [salesData, setSalesData] = useState(fallbackData);
  const [cobranzaData, setCobranzaData] = useState({});
  const [ingresosData, setIngresosData] = useState(fallbackIngresosData);
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
            return `${year}-${month}`;
          }
        }
        
        if (parts.length === 2) {
          const month = monthNames[parts[1]];
          const year = parts[0];
          if (month && year && year.match(/^\d{4}$/)) {
            return `${year}-${month}`;
          }
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
      
      const cobranzaDataResult = await cobranzaResponse.json();
      const transformedCobranza = transformCobranzaData(cobranzaDataResult.values);
      setCobranzaData(transformedCobranza);
      
      const ingresosUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.ranges.ingresos}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`;
      const ingresosResponse = await fetch(ingresosUrl);
      
      if (!ingresosResponse.ok) throw new Error(`Error ${ingresosResponse.status}: ${ingresosResponse.statusText}`);
      
      const ingresosDataResult = await ingresosResponse.json();
      const transformedIngresos = transformIngresosData(ingresosDataResult.values);
      setIngresosData(transformedIngresos);
      
      setConnectionStatus('connected');
      setLastUpdated(new Date());
      setErrorMessage('');
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(error.message);
      
      if (Object.keys(salesData).length === 0) {
        setSalesData(fallbackData);
        setContactData(fallbackContactData);
        setIngresosData(fallbackIngresosData);
      }
    } finally {
      setIsLoading(false);
      setIsManualRefresh(false);
    }
  };

  const transformGoogleSheetsData = (rawData) => {
    const rows = rawData.slice(1);
    const transformedData = {};
    
    rows.forEach((row, index) => {
      const [fecha, escuela, area, curso, ventas, cursosVendidos, instructor] = row;
      
      if (!fecha || !escuela || !area || !curso) {
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

  const transformContactData = (rawData) => {
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
    if (!rawData || rawData.length === 0) return fallbackIngresosData;
    
    const rows = rawData.slice(1);
    const result = [];
    
    rows.forEach((row) => {
      const [concepto, monto] = row;
      
      if (!concepto || concepto.trim() === '') {
        return;
      }
      
      const conceptoClean = concepto.trim();
      const montoNumerico = parseNumberFromString(monto);
      
      if (montoNumerico > 0) {
        result.push({
          concepto: conceptoClean,
          monto: montoNumerico
        });
      }
    });
    
    return result.length > 0 ? result : fallbackIngresosData;
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
                  message: `${course} en ${school} bajo ${Math.abs(ventasChange).toFixed(1)}% en ventas`,
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
                  message: `${course} en ${school} bajo ${Math.abs(cursosChange).toFixed(1)}% en cursos vendidos`,
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
                  message: `${course} en ${school} crecio ${ventasChange.toFixed(1)}% en ventas!`,
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
          Actualizado: {lastUpdated.toLocaleTimeString()}
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

  const CobranzaDashboard = () => {
    const mesesCobranza = useMemo(() => {
      if (!cobranzaData || Object.keys(cobranzaData).length === 0) {
        return [];
      }
      
      const meses = new Set();
      
      Object.values(cobranzaData).forEach(escuelaData => {
        Object.keys(escuelaData).forEach(mes => {
          if (mes && mes.trim() !== '') {
            meses.add(mes.trim());
          }
        });
      });
      
      const mesesArray = Array.from(meses);
      return sortMonthsChronologically(mesesArray);
    }, [cobranzaData]);

    const totalesPorMes = useMemo(() => {
      const totales = {};
      
      mesesCobranza.forEach(mes => {
        totales[mes] = 0;
      });
      
      Object.entries(cobranzaData).forEach(([escuela, datosEscuela]) => {
        Object.entries(datosEscuela).forEach(([mes, monto]) => {
          const mesLimpio = mes.trim();
          
          if (mes && mesLimpio !== '' && mesesCobranza.includes(mesLimpio)) {
            const montoNumerico = parseNumberFromString(monto);
            totales[mesLimpio] += montoNumerico;
          }
        });
      });
      
      return totales;
    }, [cobranzaData, mesesCobranza]);

    const totalesPorEscuela = useMemo(() => {
      const totales = {};
      
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

    const totalIngresos = useMemo(() => {
      return ingresosData.reduce((sum, item) => sum + item.monto, 0);
    }, [ingresosData]);

    const escuelas = Object.keys(cobranzaData);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                <p className="text-indigo-100 text-sm">Total Ingresos</p>
                <p className="text-3xl font-bold">${totalIngresos.toLocaleString()}</p>
                <p className="text-indigo-100 text-sm">Tabla de ingresos</p>
              </div>
              <BarChart3 className="w-8 h-8 text-indigo-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Escuelas Activas</p>
                <p className="text-3xl font-bold">{escuelas.length}</p>
                <p className="text-purple-100 text-sm">Generando ingresos</p>
              </div>
              <Building className="w-8 h-8 text-purple-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Promedio Mensual</p>
                <p className="text-3xl font-bold">
                  ${mesesCobranza.length > 0 ? Math.round(Object.values(totalesPorMes).reduce((sum, val) => sum + val, 0) / mesesCobranza.length).toLocaleString() : '0'}
                </p>
                <p className="text-green-100 text-sm">Por mes</p>
              </div>
              <Target className="w-8 h-8 text-green-200" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Tabla de Ingresos
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BarChart3 className="w-4 h-4" />
                <span>{ingresosData.length} conceptos</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Concepto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % del Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ingresosData
                    .sort((a, b) => b.monto - a.monto)
                    .map((item, index) => {
                      const porcentaje = totalIngresos > 0 ? (item.monto / totalIngresos) * 100 : 0;
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.concepto}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                            ${item.monto.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div 
                                  className="bg-indigo-500 h-2 rounded-full" 
                                  style={{ width: `${porcentaje}%` }}
                                ></div>
                              </div>
                              {porcentaje.toFixed(1)}%
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      Total
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-900">
                      ${totalIngresos.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      100%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Distribucion de Ingresos por Concepto</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ingresosData.map(item => ({
                      name: item.concepto,
                      value: item.monto,
                      percentage: totalIngresos > 0 ? ((item.monto / totalIngresos) * 100).toFixed(1) : 0
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {ingresosData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={[
                        '#3B82F6', '#8B5CF6', '#22C55E', '#F59E0B', 
                        '#EF4444', '#06B6D4', '#EC4899', '#84CC16'
                      ][index % 8]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value.toLocaleString()}`, 'Monto']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Cobranza por Escuela
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building className="w-4 h-4" />
              <span>{escuelas.length} escuelas - {mesesCobranza.length} meses</span>
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
      </div>
    );
  };

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
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard IDIP
          </h1>
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
        </div>

        {isLoading && isManualRefresh && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Cargando datos desde Google Sheets...</p>
          </div>
        )}

        {viewType === "cobranza" && <CobranzaDashboard />}
      </div>
    </div>
  );
};

export default Dashboard;
