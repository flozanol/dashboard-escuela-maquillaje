import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus, DollarSign, ShoppingCart, Bell, RefreshCw, Wifi, WifiOff, User, Building, BookOpen, Book, BarChart3, Star, Target, AlertTriangle, Activity, Phone, Mail, Globe, MessageSquare, Users, Calendar } from 'lucide-react';

const SEDE = import.meta.env.VITE_SEDE || 'CDMX';

const GOOGLE_SHEETS_CONFIG = {
  apiKey: import.meta.env.VITE_GSHEETS_API_KEY,
  spreadsheetId: '1DHt8N8bEPElP4Stu1m2Wwb2brO3rLKOSuM8y_Ca3nVg',
  ranges: {
    ventas: 'Ventas!A:H',              // ← Fijo CDMX
    cobranza: 'Cobranza!A:Z',
    crecimientoAnual: 'Crecimiento Anual!A:Z'
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

const fallbackCrecimientoAnualData = {
  headers: ['Año', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Total', 'Crecimiento'],
  rows: [
    [2022, 2000000, 2500000, 2800000, 3100000, 3500000, 3800000, 4000000, 4200000, 4500000, 4800000, 5000000, 5200000, 45400000, 'N/A'],
    [2023, 3000000, 3500000, 4000000, 4500000, 5000000, 5500000, 6000000, 6500000, 7000000, 7500000, 8000000, 8500000, 75000000, '65.2%'],
    [2024, 4000000, 4800000, 5500000, 6200000, 7000000, 7800000, 8500000, 0, 0, 0, 0, 0, 43800000, '15.6%']
  ],
  queretaroRows: [],
  totalRows: [],
  years: [2022, 2023, 2024],
  monthlyMap: [],
  annualGrowthData: []
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
  const [crecimientoAnualData, setCrecimientoAnualData] = useState(fallbackCrecimientoAnualData); 
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const debugInstructors = () => {
    console.log('DEBUG: Verificando datos de instructores...');
    // (Tu lógica de debug original)
  };

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
    const monthOrder = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const parseToStandardDate = (dateStr) => {
      if (!dateStr) return null;
      const str = dateStr.toString().trim();
      if (str.match(/^\d{4}-\d{2}$/)) return str;
      const monthNames = { 'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12' };
      const parts = str.toLowerCase().split(/[\s-]+/);
      if (str.match(/^\d{4}$/)) return str + '-13'; 
      if (parts.length >= 1) {
          const monthKey = parts.find(p => monthNames[p]);
          if (monthKey) {
              return monthNames[monthKey]; 
          }
      }
      return str; 
    };

    return months.sort((a, b) => {
      const dateA = parseToStandardDate(a);
      const dateB = parseToStandardDate(b);
      if (dateA.match(/^\d{4}-\d{2}$/) && dateB.match(/^\d{4}-\d{2}$/)) {
        return dateA.localeCompare(dateB);
      } else if (monthOrder.includes(a) && monthOrder.includes(b)) {
        return monthOrder.indexOf(a) - monthOrder.indexOf(b);
      }
      return a.localeCompare(b); 
    });
  };

  const fetchGoogleSheetsData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setIsManualRefresh(showLoading);
    
    try {
      const ventasUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.ranges.ventas}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`;
      console.log('DEBUG API KEY:', GOOGLE_SHEETS_CONFIG.apiKey);
console.log('DEBUG URL:', ventasUrl);
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
      
      const crecimientoAnualUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.ranges.crecimientoAnual}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`;
      const crecimientoAnualResponse = await fetch(crecimientoAnualUrl);
      if (!crecimientoAnualResponse.ok) throw new Error(`Error ${crecimientoAnualResponse.status}: ${crecimientoAnualResponse.statusText}`);
      const crecimientoAnualData = await crecimientoAnualResponse.json();
      const transformedCrecimientoAnual = transformCrecimientoAnualData(crecimientoAnualData.values);
      setCrecimientoAnualData(transformedCrecimientoAnual); 
      
      if (transformedCrecimientoAnual.years.length > 0) {
        setSelectedYear(transformedCrecimientoAnual.years[transformedCrecimientoAnual.years.length - 1].toString());
      }

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
      if (crecimientoAnualData.rows.length === 0) {
        setCrecimientoAnualData(fallbackCrecimientoAnualData);
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
        return;
      }
      const instructorNormalizado = instructor ? 
        instructor.toString().trim().replace(/\s+/g, ' ') : 
        'Sin asignar';
      const monthKey = fecha.substring(0, 7);
      if (!transformedData[monthKey]) transformedData[monthKey] = {};
      if (!transformedData[monthKey][escuela]) transformedData[monthKey][escuela] = {};
      if (!transformedData[monthKey][escuela][area]) transformedData[monthKey][escuela][area] = {};
      
      const ventasNum = parseNumberFromString(ventas);
      const cursosNum = parseNumberFromString(cursosVendidos) || 1;
      
      if (transformedData[monthKey][escuela][area][curso]) {
        transformedData[monthKey][escuela][area][curso].ventas += ventasNum;
        transformedData[monthKey][escuela][area][curso].cursos += cursosNum;
        if (!transformedData[monthKey][escuela][area][curso].instructor || 
            transformedData[monthKey][escuela][area][curso].instructor === 'Sin asignar') {
          transformedData[monthKey][escuela][area][curso].instructor = instructorNormalizado;
        }
      } else {
        transformedData[monthKey][escuela][area][curso] = {
          ventas: ventasNum,
          cursos: cursosNum,
          instructor: instructorNormalizado
        };
      }
    });
    return transformedData;
  };

  const transformContactData = (rawData) => {
    const rows = rawData.slice(1);
    const transformedData = {};
    rows.forEach((row) => {
      const [fecha, , , , ventas, cursosVendidos, , medioContacto] = row;
      if (!fecha || !medioContacto) return; 
      const monthKey = fecha.substring(0, 7);
      const medio = medioContacto.trim();
      if (!transformedData[monthKey]) transformedData[monthKey] = {};
      if (!transformedData[monthKey][medio]) transformedData[monthKey][medio] = { ventas: 0, cursos: 0 };
      const ventasNum = parseNumberFromString(ventas);
      const cursosNum = parseNumberFromString(cursosVendidos) || 1;
      transformedData[monthKey][medio].ventas += ventasNum;
      transformedData[monthKey][medio].cursos += cursosNum;
    });
    return transformedData;
  };

  // 🚀 ACTUALIZADO: Función para transformar datos de Crecimiento Anual incluyendo las nuevas tablas
  const transformCrecimientoAnualData = (rawData) => {
    if (!rawData || rawData.length < 3) return fallbackCrecimientoAnualData;

    const headerRow = rawData[1]; 
    const allDataRows = rawData.slice(2);
    const headers = (headerRow || []).slice(0, 15).map(h => h.trim()); 

    // --- TABLA PRINCIPAL (General) ---
    const rows = allDataRows
        .slice(0, 8) 
        .filter(row => row.length > 0 && parseNumberFromString(row[0]) > 0)
        .map(row => row.slice(0, 15));

    // --- NUEVA TABLA: QUERÉTARO (A11:O15) ---
    // Fila 11 es índice 10. Slice(10, 15) toma índices 10, 11, 12, 13, 14.
    const queretaroRows = rawData.slice(10, 15).map(row => row.slice(0, 15));

    // --- NUEVA TABLA: TOTAL (A18:O22) ---
    // Fila 18 es índice 17. Slice(17, 22) toma índices 17, 18, 19, 20, 21.
    const totalRows = rawData.slice(17, 22).map(row => row.slice(0, 15));

    const MONTH_ABBREVIATIONS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthlyMap = {};
    const years = [];
    const yearIndex = headers.findIndex(h => h.toLowerCase().includes('año'));
    const allYears = [];
    const annualGrowthData = [];

    rows.forEach(row => {
        const year = parseNumberFromString(row[yearIndex]);
        if (year > 0) {
            allYears.push(year);
            monthlyMap[year] = [];
            for (let i = 1; i <= 12; i++) {
                const monthName = MONTH_ABBREVIATIONS[i - 1];
                const ventas = parseNumberFromString(row[i]);
                monthlyMap[year].push({
                    name: monthName,
                    [year]: ventas, 
                });
            }
            const crecimientoIndex = headers.length - 1;
            const crecimientoString = row[crecimientoIndex] || '0%';
            const crecimientoValue = parseNumberFromString(crecimientoString); 
            annualGrowthData.push({
                year: year,
                crecimiento: crecimientoValue
            });
        }
    });
    
    const monthlyChartData = [];
    MONTH_ABBREVIATIONS.forEach(monthName => {
        const monthData = { name: monthName };
        allYears.forEach(year => {
            const dataPoint = monthlyMap[year].find(d => d.name === monthName);
            if (dataPoint) {
                monthData[year] = dataPoint[year];
            }
        });
        monthlyChartData.push(monthData);
    });

    return {
        headers: headers,
        rows: rows,
        queretaroRows: queretaroRows, 
        totalRows: totalRows,
        years: allYears.sort((a, b) => a - b),
        monthlyMap: monthlyChartData,
        annualGrowthData: annualGrowthData.sort((a, b) => a.year - b.year)
    };
  };

  const transformCobranzaData = (rawData) => {
    if (!rawData || rawData.length === 0) return {};
    const headers = rawData[0];
    const rows = rawData.slice(1);
    const result = {};
    const meses = headers.slice(1).filter(header => header && header.trim() !== '');
    rows.forEach((row, rowIndex) => {
      const escuela = row[0];
      if (!escuela || escuela.trim() === '') return;
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
              if (ventasChange < -20) {
                newAlerts.push({
                  type: 'warning', category: 'ventas', message: `${course} en ${school} bajó ${Math.abs(ventasChange).toFixed(1)}% en ventas`,
                  details: `De $${previous.ventas.toLocaleString()} a $${current.ventas.toLocaleString()}`, priority: ventasChange < -40 ? 'urgent' : 'high',
                  curso: course, escuela: school, area: area
                });
              }
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
    Object.values(salesData).forEach((monthData) => {
      Object.values(monthData).forEach((schoolData) => {
        Object.values(schoolData).forEach((areaData) => {
          Object.values(areaData).forEach((courseData) => {
            if (courseData.instructor) {
              const instructorNormalizado = courseData.instructor.toString().trim().replace(/\s+/g, ' ');
              instructorsSet.add(instructorNormalizado);
            }
          });
        });
      });
    });
    const instructorsList = Array.from(instructorsSet).filter(instructor => 
      instructor && instructor !== 'Sin asignar' && instructor !== 'No asignado'
    );
    return instructorsList;
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
      if (isNaN(date.getTime())) return monthString;
      return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
    } catch (error) { return monthString; }
  };

  const formatDateShort = (monthString) => {
    try {
      const [year, month] = monthString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      if (isNaN(date.getTime())) return monthString;
      return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
    } catch (error) { return monthString; }
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
      case "up": return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "down": return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
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
            if (instructor) {
              const instructorKey = instructor.toString().trim().replace(/\s+/g, ' ');
              if (!totals[instructorKey]) {
                totals[instructorKey] = { 
                  ventas: 0, cursos: 0, areas: new Set(), escuelas: new Set(), cursos_detalle: [] 
                };
              }
              totals[instructorKey].ventas += courseData.ventas;
              totals[instructorKey].cursos += courseData.cursos;
              totals[instructorKey].areas.add(area);
              totals[instructorKey].escuelas.add(schoolKey);
              totals[instructorKey].cursos_detalle.push({
                curso: course, escuela: schoolKey, area: area, ventas: courseData.ventas, cursos: courseData.cursos
              });
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
    return { totalVentas, totalCursos, ventasGrowth, cursosGrowth, ticketPromedio };
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
        
      case "crecimientoAnual":
        return [];

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
            <li>• Revisar cursos con caída &gt;20% en ventas</li>
            <li>• Considerar promociones para cursos sin ventas</li>
            <li>• Replicar estrategias de cursos con alto crecimiento</li>
            <li>• Programar reunión con instructores de cursos en riesgo</li>
          </ul>
        </div>
      )}
    </div>
  );
  
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Análisis Detallado por Medio de Contacto</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medio de Contacto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ventas ($)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cursos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket Promedio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% del Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rendimiento</th>
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
                              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${porcentaje}%` }}></div>
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
                            {porcentaje > 25 ? 'Excelente' : porcentaje > 15 ? 'Bueno' : 'Mejorable'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AlertsPanel />
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-semibold">Top Vendedores</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(getInstructorTotals(selectedMonth))
                .sort(([,a], [,b]) => b.ventas - a.ventas)
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

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-semibold">Top Áreas</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(getAreaTotals(selectedMonth))
                .sort(([,a], [,b]) => b.ventas - a.ventas)
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

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Book className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold">Top Cursos</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(getCourses(selectedMonth))
                .sort(([,a], [,b]) => b.ventas - a.ventas)
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
    const mesesCobranza = useMemo(() => {
      if (!cobranzaData || Object.keys(cobranzaData).length === 0) return [];
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
      if (!cobranzaData || Object.keys(cobranzaData).length === 0) return totales;
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
  
  // 🚀 ACTUALIZADO: Dashboard de Crecimiento Anual con las 3 tablas
  const CrecimientoAnualDashboard = () => {
    // Extraemos las nuevas filas (queretaroRows, totalRows)
    const { headers, rows, queretaroRows, totalRows, years, monthlyMap, annualGrowthData } = crecimientoAnualData;
    
    const currentYearDataRow = rows.find(r => parseNumberFromString(r[0]) === parseNumberFromString(selectedYear)) || [];
    const totalIndex = headers.length - 2;
    const crecimientoIndex = headers.length - 1;
    const currentYearTotal = parseNumberFromString(currentYearDataRow[totalIndex]);
    const currentYearGrowth = currentYearDataRow[crecimientoIndex] || 'N/A';
    
    const getGrowthIndicator = (value) => {
        const numericValue = parseNumberFromString(value.replace('%', ''));
        const Icon = numericValue > 0 ? TrendingUp : numericValue < 0 ? TrendingDown : Minus;
        const color = numericValue > 0 ? 'text-green-500' : numericValue < 0 ? 'text-red-500' : 'text-gray-500';
        return (
            <div className="flex items-center gap-1">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className={`font-medium ${color}`}>
                    {value}
                </span>
            </div>
        );
    };
      
    const COLORS = ['#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];

    // Componente reutilizable para las tablas
    const SimpleTable = ({ title, dataRows, tableHeaders, colorTheme = "gray" }) => {
        const headerColor = colorTheme === 'blue' ? 'bg-blue-100 text-blue-800' : 
                            colorTheme === 'orange' ? 'bg-orange-100 text-orange-800' : 
                            'bg-gray-100 text-gray-800';
        
        return (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">{title}</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className={headerColor}>
                            <tr>
                                {tableHeaders.map((header, index) => (
                                    <th key={index} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                                        header.toLowerCase().includes('total') ? 'bg-opacity-50 bg-green-300' : ''
                                    }`}>
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {dataRows.map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-gray-50">
                                    {row.map((cell, cellIndex) => (
                                        <td key={cellIndex} className={`px-4 py-3 whitespace-nowrap text-sm ${
                                            cellIndex === 0 ? 'font-bold text-gray-900' : 
                                            cellIndex === tableHeaders.length - 2 ? 'font-bold bg-green-50' : 
                                            'text-gray-800'
                                        }`}>
                                            {cellIndex > 0 && cellIndex < tableHeaders.length - 1 && typeof cell !== 'string' 
                                                ? `$${parseNumberFromString(cell).toLocaleString()}` 
                                                : cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };
      
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <Activity className="w-6 h-6 text-indigo-600" />
          Análisis de Crecimiento Anual
        </h2>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-2">
                <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Año</label>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow p-4 text-white">
                    <p className="text-green-100 text-sm">Ventas Totales {currentYearDataRow[0]}</p>
                    <p className="text-xl font-bold">${currentYearTotal.toLocaleString()}</p>
                </div>
                
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg shadow p-4 text-white">
                    <p className="text-indigo-100 text-sm">Crecimiento vs Año Ant.</p>
                    <div className="flex items-center gap-2">
                        <p className="text-xl font-bold">{currentYearGrowth}</p>
                        {getGrowthIndicator(currentYearGrowth)}
                    </div>
                </div>

                <div className="bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg shadow p-4 text-white">
                    <p className="text-gray-100 text-sm">Meses con ventas</p>
                    <p className="text-xl font-bold">{monthlyMap.filter(d => parseNumberFromString(d[selectedYear]) > 0).length} / 12</p>
                </div>
            </div>
        </div>
        
        {/* 🚀 TABLAS DE DATOS */}
        
        {/* Tabla 1: General (La original) */}
        <SimpleTable 
            title="Resumen General Anual" 
            dataRows={rows} 
            tableHeaders={headers} 
            colorTheme="gray"
        />

        {/* Tabla 2: Querétaro (Nueva) */}
        {queretaroRows && queretaroRows.length > 0 && (
            <SimpleTable 
                title="Querétaro (A11:O15)" 
                dataRows={queretaroRows} 
                tableHeaders={headers} 
                colorTheme="blue"
            />
        )}

        {/* Tabla 3: Total (Nueva) */}
        {totalRows && totalRows.length > 0 && (
            <SimpleTable 
                title="Total (A18:O22)" 
                dataRows={totalRows} 
                tableHeaders={headers} 
                colorTheme="orange"
            />
        )}
        
        {/* GRÁFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">📈 Tendencia Mensual de Ventas por Año</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyMap}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="ventas" orientation="left" tickFormatter={(value) => `${(value/1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(value, name) => [`$${value.toLocaleString()}`, `Ventas ${name}`]} />
                  <Legend />
                  {years.map((year, index) => (
                      <Line 
                          key={year} 
                          type="monotone" 
                          dataKey={year} 
                          stroke={COLORS[index % COLORS.length]} 
                          strokeWidth={2} 
                          name={`Ventas ${year}`}
                      />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">📊 Crecimiento Anual (%)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Crecimiento Anual']} />
                  <Legend />
                  <Bar 
                    dataKey="crecimiento" 
                    name="Crecimiento %"
                    fill="#3B82F6"
                    label={{ position: 'top', formatter: (value) => `${value.toFixed(1)}%`, fill: '#333' }}
                  >
                    {annualGrowthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.crecimiento > 0 ? '#22C55E' : entry.crecimiento < 0 ? '#EF4444' : '#6B7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
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
            <button
              onClick={() => setViewType("crecimientoAnual")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "crecimientoAnual" 
                ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg" 
                : "bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Crecimiento Anual
            </button>
            <button
              onClick={debugInstructors}
              className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-sm hover:bg-yellow-200 font-medium"
            >
              Debug Instructores
            </button>
          </div>

          {viewType !== "executive" && viewType !== "cobranza" && viewType !== "crecimientoAnual" && (
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

        {viewType === "executive" && <ExecutiveDashboard />}
        {viewType === "cobranza" && <CobranzaDashboard />}
        {viewType === "contacto" && <ContactDashboard />}
        {viewType === "crecimientoAnual" && <CrecimientoAnualDashboard />}

        {(viewType === "escuela" || viewType === "area" || viewType === "instructor" || viewType === "curso" || viewType === "contacto") && !isLoading && viewType !== "contacto" && viewType !== "crecimientoAnual" && (
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

export default Dashboard;
