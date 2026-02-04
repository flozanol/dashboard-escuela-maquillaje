import React, { useState, useMemo, useEffect } from 'react';
import DashboardConsejo from './DashboardConsejo';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup as MapPopup } from 'react-leaflet';
import { 
  TrendingUp, TrendingDown, Minus, DollarSign, ShoppingCart, Bell, RefreshCw, 
  Wifi, WifiOff, User, Building, BookOpen, Book, BarChart3, Star, Target, 
  AlertTriangle, Phone, Mail, Globe, MessageSquare, Users, MapPin, 
  Calendar, Monitor
} from 'lucide-react';

const SEDE = process.env.REACT_APP_SEDE || 'CDMX';
const MODO = process.env.REACT_APP_MODO || 'ESCUELA';

const GOOGLE_SHEETS_CONFIG = {
  apiKey: process.env.REACT_APP_GSHEETS_API_KEY,
  spreadsheetId: '1DHt8N8bEPElP4Stu1m2Wwb2brO3rLKOSuM8y_Ca3nVg',
  ranges: {
    ventas: SEDE === 'QRO' ? 'Ventas Qro!A:Z' : 'Ventas!A:Z',
    cobranza: 'Cobranza!A:Z',
    crecimientoAnual: 'Crecimiento Anual!A:Z',
    objetivos: 'Objetivos!A:E'
  }
};

// --- DATOS DE RESPALDO (Fallback) ---
const fallbackData = {
  "2024-01": {
    "Polanco": {
      "Maquillaje": {
        "Curso Demo": { ventas: 0, cursos: 0, instructor: "N/A" }
      }
    }
  }
};
const fallbackContactData = { "2024-01": { "WhatsApp": { ventas: 0, cursos: 0 } } };
const fallbackAgeData = { "2024-01": { "Desconocido": 0 } };
const fallbackObjetivosData = {};
const fallbackCrecimientoAnualData = {
  headers: [], rows: [], queretaroRows: [], totalRows: [], 
  years: [2024, 2025], monthlyMap: [], annualGrowthData: []
};

const Dashboard = () => {
  // --- CONFIGURACIÓN INICIAL ---
  const currentDate = new Date();
  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const currentYearStr = currentDate.getFullYear().toString();

  // --- ESTADOS ---
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [selectedSchool, setSelectedSchool] = useState("Polanco");
  const [selectedArea, setSelectedArea] = useState("Maquillaje");
  
  const [viewType, setViewType] = useState("executive");
  const [metricType, setMetricType] = useState("ventas");
  const [compareMonths, setCompareMonths] = useState(["2024-01", "2024-02"]);
  
  const [salesData, setSalesData] = useState(fallbackData);
  const [cobranzaData, setCobranzaData] = useState({});
  const [contactData, setContactData] = useState(fallbackContactData);
  const [ageData, setAgeData] = useState(fallbackAgeData);
  const [mapData, setMapData] = useState({}); 
  const [objetivosData, setObjetivosData] = useState(fallbackObjetivosData);
  const [crecimientoAnualData, setCrecimientoAnualData] = useState(fallbackCrecimientoAnualData);
  
  const [coordsCache, setCoordsCache] = useState({}); 
  const [showFullHistoryMap, setShowFullHistoryMap] = useState(true);
  
  const [isLoading, setIsLoading] = useState(true);
  // Eliminada variable lastUpdated que causaba error por no usarse
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [alerts, setAlerts] = useState([]);

  // --- HELPERS DE PARSEO ---
  const debugInstructors = () => console.log('DEBUG: Verificando datos...');

  const parseNumberFromString = (value) => {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    const str = value.toString().trim();
    if (str === '' || str.toLowerCase() === 'null') return 0;
    const cleaned = str.replace(/[$,\s%]/g, '').replace(/[^\d.-]/g, '');
    const number = parseFloat(cleaned);
    return isNaN(number) ? 0 : number;
  };

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
    const change = lastTwo[0] === 0 ? 0 : ((lastTwo[1] - lastTwo[0]) / lastTwo[0]) * 100;
    if (change > 5) return "up";
    if (change < -5) return "down";
    return "stable";
  };

  const TrendIcon = ({ trend }) => {
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  // --- CARGA DE COORDENADAS (API) ---
  const fetchCoordinatesForCP = async (cp) => {
    if (!cp || cp.length < 4) return null;
    if (coordsCache[cp]) return coordsCache[cp];
    try {
        const response = await fetch(`https://api.zippopotam.us/mx/${cp}`);
        if (!response.ok) return null;
        const data = await response.json();
        if (data.places && data.places.length > 0) {
            const coords = {
                lat: parseFloat(data.places[0].latitude),
                lng: parseFloat(data.places[0].longitude),
                placeName: data.places[0]['place name'],
                state: data.places[0].state
            };
            setCoordsCache(prev => ({ ...prev, [cp]: coords }));
            return coords;
        }
    } catch (e) { console.warn(`Error CP ${cp}`, e); }
    return null;
  };

  // --- TRANSFORMACIÓN DE DATOS ---
  const transformGoogleSheetsData = (rawData) => {
    const rows = rawData.slice(1);
    const transformedData = {};
    rows.forEach((row) => {
      const [fecha, escuela, area, curso, ventas, cursosVendidos, instructor] = row;
      if (!fecha || !escuela || !area || !curso) return;
      const instructorNormalizado = instructor ? instructor.toString().trim().replace(/\s+/g, ' ') : 'Sin asignar';
      const monthKey = fecha.substring(0, 7);
      if (!transformedData[monthKey]) transformedData[monthKey] = {};
      if (!transformedData[monthKey][escuela]) transformedData[monthKey][escuela] = {};
      if (!transformedData[monthKey][escuela][area]) transformedData[monthKey][escuela][area] = {};
      const ventasNum = parseNumberFromString(ventas);
      const cursosNum = parseNumberFromString(cursosVendidos) || 1;
      if (transformedData[monthKey][escuela][area][curso]) {
        transformedData[monthKey][escuela][area][curso].ventas += ventasNum;
        transformedData[monthKey][escuela][area][curso].cursos += cursosNum;
      } else {
        transformedData[monthKey][escuela][area][curso] = { ventas: ventasNum, cursos: cursosNum, instructor: instructorNormalizado };
      }
    });
    return transformedData;
  };

  const transformContactData = (rawData) => {
    const rows = rawData.slice(1);
    const transformedData = {};
    const MEDIO_INDEX = 7; 
    rows.forEach((row) => {
      const fecha = row[0];
      const ventas = row[4];
      const cursosVendidos = row[5];
      const medioContacto = row[MEDIO_INDEX];
      if (!fecha || !medioContacto) return;
      const monthKey = fecha.substring(0, 7);
      const medio = medioContacto.trim();
      if (!transformedData[monthKey]) transformedData[monthKey] = {};
      if (!transformedData[monthKey][medio]) transformedData[monthKey][medio] = { ventas: 0, cursos: 0 };
      transformedData[monthKey][medio].ventas += parseNumberFromString(ventas);
      transformedData[monthKey][medio].cursos += (parseNumberFromString(cursosVendidos) || 1);
    });
    return transformedData;
  };

  const transformAgeData = (rawData) => {
    const rows = rawData.slice(1);
    const transformedData = {};
    const AGE_COLUMN_INDEX = 8; 
    rows.forEach((row) => {
        const fecha = row[0];
        const rawAge = row[AGE_COLUMN_INDEX] ? row[AGE_COLUMN_INDEX].toString().trim() : '';
        if (!fecha) return;
        const monthKey = fecha.substring(0, 7);
        if (!transformedData[monthKey]) transformedData[monthKey] = {};
        let ageRange = "Desconocido";
        const ageNum = parseInt(rawAge);
        if (!isNaN(ageNum) && ageNum > 0) {
            if (ageNum < 18) ageRange = "Menores de 18";
            else if (ageNum >= 18 && ageNum <= 24) ageRange = "18-24";
            else if (ageNum >= 25 && ageNum <= 34) ageRange = "25-34";
            else if (ageNum >= 35 && ageNum <= 44) ageRange = "35-44";
            else if (ageNum >= 45 && ageNum <= 54) ageRange = "45-54";
            else ageRange = "55+";
        } else if (rawAge !== '') {
            ageRange = "Otro";
        } else {
            ageRange = "Sin dato";
        }
        if (!transformedData[monthKey][ageRange]) transformedData[monthKey][ageRange] = 0;
        transformedData[monthKey][ageRange] += 1; 
    });
    return transformedData;
  };

  const transformMapData = (rawData) => {
    const rows = rawData.slice(1);
    const transformedData = {}; 
    const CP_COLUMN_INDEX = 9; 
    rows.forEach((row) => {
        const fecha = row[0];
        const ventas = row[4]; 
        const cp = row[CP_COLUMN_INDEX] ? row[CP_COLUMN_INDEX].toString().trim() : '';
        if (!fecha || !cp || cp.length < 4) return;
        const monthKey = fecha.substring(0, 7);
        if (!transformedData[monthKey]) transformedData[monthKey] = {};
        if (!transformedData[monthKey][cp]) transformedData[monthKey][cp] = { count: 0, ventas: 0 };
        transformedData[monthKey][cp].count += 1;
        transformedData[monthKey][cp].ventas += parseNumberFromString(ventas);
    });
    return transformedData;
  };

  const transformObjetivosData = (rawData) => {
    if (!rawData || rawData.length < 2) return {};
    const rows = rawData.slice(1);
    const result = {};
    rows.forEach(row => {
        const mes = row[0]; 
        const sedeRaw = row[1];
        if (!mes || !sedeRaw) return;
        if (!result[mes]) {
            result[mes] = {
                cdmx: { ventas: 0, cursos: 0 },
                qro: { ventas: 0, cursos: 0 },
                online: { ventas: 0, cursos: 0 }
            };
        }
        const sedeLower = sedeRaw.toLowerCase().trim();
        let key = 'cdmx';
        if (sedeLower.includes('quer') || sedeLower.includes('qro')) key = 'qro';
        else if (sedeLower.includes('online')) key = 'online';
        result[mes][key] = {
            ventas: parseNumberFromString(row[2]),
            cursos: parseNumberFromString(row[3])
        };
    });
    return result;
  };

  const transformCobranzaData = (rawData) => {
    if (!rawData || rawData.length === 0) return {};
    const headers = rawData[0];
    const rows = rawData.slice(1);
    const result = {};
    const meses = headers.slice(1).filter(header => header && header.trim() !== '');
    rows.forEach((row) => {
      const escuela = row[0];
      if (!escuela) return;
      const escuelaClean = escuela.trim();
      result[escuelaClean] = {};
      meses.forEach((mes, i) => {
        result[escuelaClean][mes.trim()] = parseNumberFromString(row[i + 1]);
      });
    });
    return result;
  };

  const transformCrecimientoAnualData = (rawData) => {
    if (!rawData || rawData.length < 3) return fallbackCrecimientoAnualData;
    const headerRow = rawData[1]; 
    const allDataRows = rawData.slice(2);
    const headers = (headerRow || []).slice(0, 15).map(h => h.trim()); 
    const rows = allDataRows.slice(0, 8).filter(row => row.length > 0 && parseNumberFromString(row[0]) > 0).map(r => r.slice(0, 15));
    const queretaroRows = rawData.slice(10, 15).map(r => r.slice(0, 15));
    const totalRows = rawData.slice(17, 22).map(r => r.slice(0, 15));
    const MONTH_ABBREVIATIONS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthlyMap = [];
    const annualGrowthData = [];
    const years = [];
    const yearIndex = headers.findIndex(h => h.toLowerCase().includes('año'));
    rows.forEach(row => {
        const year = parseNumberFromString(row[yearIndex]);
        if (year > 0) {
            years.push(year);
            annualGrowthData.push({ year: year, crecimiento: parseNumberFromString(row[headers.length - 1] || '0') });
        }
    });
    MONTH_ABBREVIATIONS.forEach((monthName, i) => {
        const monthData = { name: monthName };
        rows.forEach(row => {
            const year = parseNumberFromString(row[yearIndex]);
            if (year > 0) {
                monthData[year] = parseNumberFromString(row[i + 1]);
            }
        });
        monthlyMap.push(monthData);
    });
    return {
        headers, rows, queretaroRows, totalRows,
        years: years.sort((a, b) => a - b),
        monthlyMap,
        annualGrowthData: annualGrowthData.sort((a, b) => a.year - b.year)
    };
  };

  // --- FETCHING PRINCIPAL ---
  const fetchGoogleSheetsData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setIsManualRefresh(showLoading);
    try {
      const ventasRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.ranges.ventas}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`);
      if (!ventasRes.ok) throw new Error(`Error Ventas: ${ventasRes.status}`);
      const ventasData = await ventasRes.json();
      setSalesData(transformGoogleSheetsData(ventasData.values));
      setContactData(transformContactData(ventasData.values)); 
      setAgeData(transformAgeData(ventasData.values));
      setMapData(transformMapData(ventasData.values));
      
      try {
        const cobRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.ranges.cobranza}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`);
        if (cobRes.ok) {
            const cobData = await cobRes.json();
            setCobranzaData(transformCobranzaData(cobData.values));
        }
      } catch (e) { console.warn("Cobranza error", e); }
      
      try {
        const crecRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.ranges.crecimientoAnual}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`);
        if (crecRes.ok) {
            const crecData = await crecRes.json();
            setCrecimientoAnualData(transformCrecimientoAnualData(crecData.values));
        }
      } catch (e) { console.warn("Crecimiento error", e); }

      try {
        const objRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.ranges.objetivos}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`);
        if (objRes.ok) {
            const objData = await objRes.json();
            setObjetivosData(transformObjetivosData(objData.values));
        }
      } catch (e) { console.warn("Objetivos error", e); }

      setConnectionStatus('connected');
      setErrorMessage('');
    } catch (error) {
      console.error('Critical Fetch Error:', error);
      setConnectionStatus('error');
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
      setIsManualRefresh(false);
    }
  };

  useEffect(() => { fetchGoogleSheetsData(); }, []);
  useEffect(() => { const i = setInterval(() => fetchGoogleSheetsData(false), 3600000); return () => clearInterval(i); }, []);

  useEffect(() => {
    const loadCoordinates = async () => {
        let cpsToLoad = [];
        if (showFullHistoryMap) {
            Object.values(mapData).forEach(monthData => { cpsToLoad = [...cpsToLoad, ...Object.keys(monthData)]; });
        } else {
            if (mapData[selectedMonth]) cpsToLoad = Object.keys(mapData[selectedMonth]);
        }
        cpsToLoad = [...new Set(cpsToLoad)];
        const missingCPs = cpsToLoad.filter(cp => !coordsCache[cp]);
        for (const cp of missingCPs) {
            await fetchCoordinatesForCP(cp);
            await new Promise(r => setTimeout(r, 80)); 
        }
    };
    loadCoordinates();
  }, [selectedMonth, mapData, showFullHistoryMap, coordsCache]);

  useEffect(() => {
    const newAlerts = [];
    const months = Object.keys(salesData).sort();
    if (months.length > 1) {
        const curr = months[months.length - 1];
        const prev = months[months.length - 2];
        Object.keys(salesData[curr]).forEach(s => {
            Object.keys(salesData[curr][s]).forEach(a => {
                Object.keys(salesData[curr][s][a]).forEach(c => {
                    const currentVal = salesData[curr][s][a][c].ventas;
                    const prevVal = salesData[prev]?.[s]?.[a]?.[c]?.ventas;
                    if(prevVal && currentVal < prevVal * 0.8) {
                        newAlerts.push({ type: 'warning', message: `${c} bajó ventas`, details: `${s} - ${a}`, escuela: s, area: a, priority: 'high' });
                    }
                });
            });
        });
    }
    setAlerts(newAlerts.slice(0, 15));
  }, [salesData]);

  // --- MEMOS DE FILTROS ---
  const months = useMemo(() => Object.keys(salesData).sort(), [salesData]);
  const schools = useMemo(() => {
    const set = new Set();
    Object.values(salesData).forEach(m => Object.keys(m).forEach(s => set.add(s)));
    return Array.from(set);
  }, [salesData]);
  const areas = useMemo(() => {
    const set = new Set();
    Object.values(salesData).forEach(m => Object.values(m).forEach(s => Object.keys(s).forEach(a => set.add(a))));
    return Array.from(set);
  }, [salesData]);

  // --- AGGREGATION HELPERS ---
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

  const getAreaTotals = (month, school) => {
    const totals = {};
    if (!salesData[month]) return totals;
    const schoolsToProcess = school ? [school] : Object.keys(salesData[month]);
    schoolsToProcess.forEach(s => {
      if (salesData[month][s]) {
        Object.keys(salesData[month][s]).forEach(a => {
          if (!totals[a]) totals[a] = { ventas: 0, cursos: 0 };
          Object.values(salesData[month][s][a]).forEach(c => {
            totals[a].ventas += c.ventas;
            totals[a].cursos += c.cursos;
          });
        });
      }
    });
    return totals;
  };

  const getInstructorTotals = (month, school) => {
    const totals = {};
    if (!salesData[month]) return totals;
    const schoolsToProcess = school ? [school] : Object.keys(salesData[month]);
    schoolsToProcess.forEach(s => {
      if (salesData[month][s]) {
        Object.values(salesData[month][s]).forEach(areaData => {
          Object.values(areaData).forEach(cData => {
            const instr = cData.instructor || "Sin asignar";
            if (!totals[instr]) totals[instr] = { ventas: 0, cursos: 0 };
            totals[instr].ventas += cData.ventas;
            totals[instr].cursos += cData.cursos;
          });
        });
      }
    });
    return totals;
  };

  const getCourses = (month, school, area) => {
    const courses = {};
    if (!salesData[month]) return courses;
    const schoolsToProcess = school ? [school] : Object.keys(salesData[month]);
    schoolsToProcess.forEach(s => {
        if (salesData[month][s]) {
            const areasToProcess = area ? [area] : Object.keys(salesData[month][s]);
            areasToProcess.forEach(a => {
                if (salesData[month][s][a]) {
                    Object.entries(salesData[month][s][a]).forEach(([cName, cData]) => {
                        const key = `${cName} (${s})`;
                        if (!courses[key]) courses[key] = { ventas: 0, cursos: 0, instructor: cData.instructor };
                        courses[key].ventas += cData.ventas;
                        courses[key].cursos += cData.cursos;
                    });
                }
            });
        }
    });
    return courses;
  };

  const getViewData = useMemo(() => {
    switch (viewType) {
        case "escuela":
            return schools.map(s => {
                const t = getSchoolTotals(selectedMonth)[s] || { ventas: 0, cursos: 0 };
                return { nombre: s, valor: t[metricType], promedio: t[metricType], tendencia: "stable", icono: Building };
            });
        case "area":
            return Object.keys(getAreaTotals(selectedMonth, selectedSchool)).map(a => {
                const t = getAreaTotals(selectedMonth, selectedSchool)[a];
                return { nombre: a, valor: t[metricType], promedio: t[metricType], tendencia: "stable", icono: BookOpen };
            });
        case "instructor":
            const iTotals = getInstructorTotals(selectedMonth, selectedSchool);
            return Object.keys(iTotals).map(i => ({ nombre: i, valor: iTotals[i][metricType], promedio: 0, tendencia: "stable", icono: User }));
        case "curso":
            const cTotals = getCourses(selectedMonth, selectedSchool, selectedArea);
            return Object.keys(cTotals).map(c => ({ nombre: c, valor: cTotals[c][metricType], promedio: 0, tendencia: "stable", icono: Book }));
        case "comparacion":
            return schools.map(s => {
                const d = { escuela: s };
                compareMonths.forEach(m => {
                    const t = getSchoolTotals(m);
                    d[m] = t[s] ? t[s][metricType] : 0;
                });
                return d;
            });
        default: return [];
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewType, selectedMonth, selectedSchool, selectedArea, metricType, compareMonths]);

  // --- SUB COMPONENTS ---
  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-sm">
      {connectionStatus === 'connected' && <><Wifi className="w-4 h-4 text-green-500" /><span className="text-green-600">Conectado</span></>}
      {connectionStatus === 'error' && <><WifiOff className="w-4 h-4 text-red-500" /><span className="text-red-600">Error</span></>}
      <button onClick={() => fetchGoogleSheetsData(true)} disabled={isLoading} className="ml-2 text-gray-500 hover:text-blue-500"><RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /></button>
    </div>
  );

  const ExecutiveDashboard = () => {
    const currentMonthData = salesData[selectedMonth] || {};
    const currentTargets = objetivosData[selectedMonth] || { cdmx: { ventas: 0, cursos: 0 }, qro: { ventas: 0, cursos: 0 }, online: { ventas: 0, cursos: 0 } };

    let metrics = { cdmx: { ventas: 0, cursos: 0 }, qro: { ventas: 0, cursos: 0 }, online: { ventas: 0, cursos: 0 }, total: { ventas: 0, cursos: 0 } };
    
    Object.keys(currentMonthData).forEach(schoolName => {
        Object.keys(currentMonthData[schoolName]).forEach(areaName => {
            Object.values(currentMonthData[schoolName][areaName]).forEach(curso => {
                const monto = curso.ventas;
                const qty = curso.cursos;
                const lowerSchool = schoolName.toLowerCase();
                const lowerArea = areaName.toLowerCase();
                const isOnline = lowerSchool.includes('online') || lowerArea.includes('online');
                const isQro = lowerSchool.includes('queretaro') || lowerSchool.includes('querétaro') || lowerSchool.includes('qro');
                
                let targetKey = 'cdmx';
                if (isOnline) targetKey = 'online';
                else if (isQro) targetKey = 'qro';
                
                metrics[targetKey].ventas += monto;
                metrics[targetKey].cursos += qty;
                metrics.total.ventas += monto;
                metrics.total.cursos += qty;
            });
        });
    });

    let annualMetrics = { cdmx: 0, qro: 0, online: 0, total: 0, totalCursos: 0 };
    Object.keys(salesData).forEach(monthKey => {
        if (monthKey.startsWith(selectedYear)) {
            const monthData = salesData[monthKey];
            Object.keys(monthData).forEach(schoolName => {
                Object.keys(monthData[schoolName]).forEach(areaName => {
                    Object.values(monthData[schoolName][areaName]).forEach(curso => {
                        const monto = curso.ventas;
                        const qty = curso.cursos;
                        const lowerSchool = schoolName.toLowerCase();
                        const lowerArea = areaName.toLowerCase();
                        const isOnline = lowerSchool.includes('online') || lowerArea.includes('online');
                        const isQro = lowerSchool.includes('queretaro') || lowerSchool.includes('querétaro') || lowerSchool.includes('qro');
                        
                        if (isOnline) annualMetrics.online += monto;
                        else if (isQro) annualMetrics.qro += monto;
                        else annualMetrics.cdmx += monto;
                        
                        annualMetrics.total += monto;
                        annualMetrics.totalCursos += qty;
                    });
                });
            });
        }
    });

    const getProgress = (actual, target) => target > 0 ? (actual / target) * 100 : 0;

    const ObjectiveCard = ({ title, dataKey, color, icon: Icon }) => {
        const isSales = metricType === 'ventas';
        const actual = isSales ? metrics[dataKey].ventas : metrics[dataKey].cursos;
        const target = isSales ? currentTargets[dataKey]?.ventas || 0 : currentTargets[dataKey]?.cursos || 0;
        const progress = getProgress(actual, target);
        
        const colorClass = color === 'purple' ? 'text-purple-600' : color === 'blue' ? 'text-blue-600' : 'text-green-600';
        const bgClass = color === 'purple' ? 'bg-purple-100' : color === 'blue' ? 'bg-blue-100' : 'bg-green-100';
        const barClass = color === 'purple' ? 'bg-purple-500' : color === 'blue' ? 'bg-blue-500' : 'bg-green-500';

        return (
            <div className="bg-white rounded-lg shadow p-6 relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-gray-500 text-sm font-medium">{title}</p>
                        <h3 className="text-2xl font-bold text-gray-800 mt-1">{isSales ? `$${actual.toLocaleString()}` : actual.toLocaleString()}</h3>
                    </div>
                    <div className={`p-3 rounded-full ${bgClass}`}><Icon className={`w-6 h-6 ${colorClass}`} /></div>
                </div>
                <div className="mb-2 flex justify-between text-xs text-gray-600">
                    <span>Meta: {isSales ? `$${target.toLocaleString()}` : target.toLocaleString()}</span>
                    <span className={progress >= 100 ? "text-green-600 font-bold" : "text-gray-500"}>{progress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5"><div className={`h-2.5 rounded-full transition-all duration-500 ${barClass}`} style={{ width: `${Math.min(progress, 100)}%` }}></div></div>
            </div>
        );
    };

    const TotalCard = ({ title, value, subtext, color, icon: Icon }) => (
        <div className={`bg-gradient-to-r ${color} rounded-lg shadow p-6 text-white`}>
            <div className="flex items-center justify-between">
                <div><p className="text-white text-opacity-80 text-sm">{title}</p><p className="text-3xl font-bold mt-1">${value.toLocaleString()}</p><p className="text-white text-opacity-70 text-xs mt-2">{subtext}</p></div>
                <Icon className="w-8 h-8 text-white text-opacity-80" />
            </div>
        </div>
    );

    return (
      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
            <ConnectionStatus />
            {errorMessage && <span className="text-xs text-red-500">{errorMessage}</span>}
            <button onClick={() => fetchGoogleSheetsData(true)} disabled={isLoading} className="text-sm bg-gray-100 px-3 py-1 rounded">{isLoading ? '...' : 'Actualizar'}</button>
        </div>

        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Target className="w-6 h-6 text-red-500" /> Objetivos Mensuales</h2>
                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100 p-1 rounded-lg text-sm">
                        <button onClick={() => setMetricType('ventas')} className={`px-3 py-1 rounded ${metricType === 'ventas' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>$$$</button>
                        <button onClick={() => setMetricType('cursos')} className={`px-3 py-1 rounded ${metricType === 'cursos' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}># Cursos</button>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded shadow-sm border">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="font-bold text-gray-800 bg-transparent outline-none cursor-pointer">
                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ObjectiveCard title="CDMX" dataKey="cdmx" color="green" icon={Building} />
                <ObjectiveCard title="Querétaro" dataKey="qro" color="blue" icon={MapPin} />
                <ObjectiveCard title="Online" dataKey="online" color="purple" icon={Monitor} />
            </div>
        </div>

        <div>
            <div className="flex items-center justify-between mb-4 mt-8">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><BarChart3 className="w-6 h-6 text-indigo-500" /> Resumen Anual {selectedYear}</h2>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Año:</span>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="border rounded px-2 py-1 text-sm font-bold">
                        {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <TotalCard title="CDMX Total" value={annualMetrics.cdmx} subtext="Acumulado anual" color="from-green-500 to-green-600" icon={Building} />
                <TotalCard title="Querétaro Total" value={annualMetrics.qro} subtext="Acumulado anual" color="from-blue-500 to-blue-600" icon={MapPin} />
                <TotalCard title="Online Total" value={annualMetrics.online} subtext="Acumulado anual" color="from-purple-500 to-purple-600" icon={Monitor} />
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-500">
                    <div className="flex justify-between">
                        <div><p className="text-gray-500 text-sm">Total General</p><p className="text-2xl font-bold text-gray-800">${annualMetrics.total.toLocaleString()}</p></div>
                        <div><p className="text-gray-500 text-sm text-right">Ticket Prom.</p><p className="text-xl font-bold text-gray-800 text-right">${annualMetrics.totalCursos > 0 ? (annualMetrics.total / annualMetrics.totalCursos).toLocaleString(undefined, {maximumFractionDigits:0}) : 0}</p></div>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Alertas</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
                {alerts.length === 0 ? <p className="text-gray-400 text-sm">No hay alertas</p> : alerts.map((a, i) => (
                    <div key={i} className="p-2 bg-yellow-50 text-yellow-800 rounded text-sm border-l-4 border-yellow-500">
                        <strong>{a.message}</strong> - {a.details}
                    </div>
                ))}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Tendencia de Ventas ({selectedYear})</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={Object.keys(salesData).filter(m => m.startsWith(selectedYear)).sort().map(month => {
                    const mData = salesData[month];
                    let mTotal = 0;
                    Object.values(mData).forEach(s => Object.values(s).forEach(a => Object.values(a).forEach(c => mTotal += c.ventas)));
                    return { month: month.substring(5), ventas: mTotal };
                })}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                  <Line type="monotone" dataKey="ventas" stroke="#4F46E5" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6 mt-6">
             <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Distribución de Edades ({selectedMonth})</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={Object.entries(ageData[selectedMonth] || {}).map(([name, value]) => ({ name, value }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
             </div>
        </div>
      </div>
    );
  };

  const CobranzaDashboard = () => {
    const meses = useMemo(() => sortMonthsChronologically([...new Set(Object.values(cobranzaData).flatMap(s => Object.keys(s)))]), [cobranzaData]);
    const escuelas = Object.keys(cobranzaData);
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
                <h3 className="text-lg font-semibold mb-4">Reporte de Cobranza</h3>
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50"><tr><th className="px-4 py-2">Escuela</th>{meses.map(m => <th key={m} className="px-4 py-2">{m}</th>)}</tr></thead>
                    <tbody>{escuelas.map(e => <tr key={e} className="border-t"><td className="px-4 py-2 font-medium">{e}</td>{meses.map(m => <td key={m} className="px-4 py-2">${(cobranzaData[e][m] || 0).toLocaleString()}</td>)}</tr>)}</tbody>
                </table>
            </div>
        </div>
    );
  };

  const MapDashboard = () => {
    const mapCenter = SEDE === 'QRO' ? [20.5888, -100.3899] : [19.4326, -99.1332];
    const dataForMap = showFullHistoryMap ? Object.values(mapData).reduce((acc, m) => {
        Object.entries(m).forEach(([cp, d]) => { if (!acc[cp]) acc[cp] = { count: 0, ventas: 0 }; acc[cp].count += d.count; acc[cp].ventas += d.ventas; });
        return acc;
    }, {}) : (mapData[selectedMonth] || {});
    
    const markers = Object.entries(dataForMap).map(([cp, info]) => {
        const coords = coordsCache[cp];
        return coords ? { cp, ...coords, ...info } : null;
    }).filter(Boolean);

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2"><MapPin className="w-6 h-6 text-red-500" /> Mapa</h2>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setShowFullHistoryMap(false)} className={`px-3 py-1 rounded ${!showFullHistoryMap ? 'bg-white shadow' : ''}`}>Mes</button>
                    <button onClick={() => setShowFullHistoryMap(true)} className={`px-3 py-1 rounded ${showFullHistoryMap ? 'bg-white shadow' : ''}`}>Histórico</button>
                </div>
            </div>
            <div className="h-96 w-full rounded-lg overflow-hidden border relative z-0">
                <MapContainer center={mapCenter} zoom={11} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {markers.map(m => (
                        <CircleMarker key={m.cp} center={[m.lat, m.lng]} radius={m.count < 5 ? 10 : 20} pathOptions={{ color: 'red' }}>
                            <MapPopup>CP: {m.cp}<br/>Alumnos: {m.count}</MapPopup>
                        </CircleMarker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
  };

  const ContactDashboard = () => {
      const totals = contactData[selectedMonth] || {};
      const data = Object.entries(totals).map(([name, val]) => ({ name, value: val.ventas }));
      return (
          <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Medios de Contacto ({selectedMonth})</h3>
              <div className="h-80">
                  <ResponsiveContainer><BarChart data={data}><XAxis dataKey="name" /><YAxis /><Bar dataKey="value" fill="#82ca9d" /></BarChart></ResponsiveContainer>
              </div>
          </div>
      );
  };

  const CrecimientoAnualDashboard = () => {
      const { annualGrowthData } = crecimientoAnualData;
      return (
          <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Crecimiento Anual</h3>
              <div className="h-80">
                  <ResponsiveContainer><BarChart data={annualGrowthData}><XAxis dataKey="year" /><YAxis /><Bar dataKey="crecimiento" fill="#3B82F6" /></BarChart></ResponsiveContainer>
              </div>
          </div>
      );
  };

  if (MODO === 'CONSEJO') return <DashboardConsejo />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard IDIP</h1>
            <ConnectionStatus />
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            <button onClick={() => setViewType("executive")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "executive" ? "bg-green-600 text-white" : "bg-gray-100"}`}><BarChart3 className="w-4 h-4" /> Ejecutivo</button>
            <button onClick={() => setViewType("escuela")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "escuela" ? "bg-green-600 text-white" : "bg-gray-100"}`}><Building className="w-4 h-4" /> Por Escuela</button>
            <button onClick={() => setViewType("area")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "area" ? "bg-green-600 text-white" : "bg-gray-100"}`}><BookOpen className="w-4 h-4" /> Por Área</button>
            <button onClick={() => setViewType("instructor")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "instructor" ? "bg-green-600 text-white" : "bg-gray-100"}`}><User className="w-4 h-4" /> Por Vendedor</button>
            <button onClick={() => setViewType("curso")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "curso" ? "bg-green-600 text-white" : "bg-gray-100"}`}><Book className="w-4 h-4" /> Por Curso</button>
            <button onClick={() => setViewType("contacto")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "contacto" ? "bg-purple-600 text-white" : "bg-gray-100"}`}><MessageSquare className="w-4 h-4" /> Contacto</button>
            <button onClick={() => setViewType("mapa")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "mapa" ? "bg-red-600 text-white" : "bg-gray-100"}`}><MapPin className="w-4 h-4" /> Mapa</button>
            <button onClick={() => setViewType("cobranza")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "cobranza" ? "bg-blue-600 text-white" : "bg-gray-100"}`}><DollarSign className="w-4 h-4" /> Cobranza</button>
            <button onClick={() => setViewType("crecimientoAnual")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "crecimientoAnual" ? "bg-indigo-600 text-white" : "bg-gray-100"}`}><TrendingUp className="w-4 h-4" /> Crecimiento</button>
            <button onClick={debugInstructors} className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium">Debug</button>
          </div>
        </div>

        {/* Filtros Generales */}
        {viewType !== 'executive' && viewType !== 'cobranza' && viewType !== 'crecimientoAnual' && viewType !== 'mapa' && (
            <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4 flex-wrap">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Mes</label>
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border rounded p-2">
                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Métrica</label>
                    <select value={metricType} onChange={(e) => setMetricType(e.target.value)} className="border rounded p-2">
                        <option value="ventas">Ventas ($)</option>
                        <option value="cursos">Cursos</option>
                    </select>
                </div>
                {(viewType === 'area' || viewType === 'instructor' || viewType === 'curso') && (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase">Escuela</label>
                        <select value={selectedSchool} onChange={(e) => setSelectedSchool(e.target.value)} className="border rounded p-2">
                            <option value="">Todas</option>
                            {schools.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                )}
                {viewType === 'comparacion' && (
                    <div className="flex gap-2">
                        <select value={compareMonths[0]} onChange={(e) => setCompareMonths([e.target.value, compareMonths[1]])} className="border rounded p-2">{months.map(m => <option key={m} value={m}>{m}</option>)}</select>
                        <select value={compareMonths[1]} onChange={(e) => setCompareMonths([compareMonths[0], e.target.value])} className="border rounded p-2">{months.map(m => <option key={m} value={m}>{m}</option>)}</select>
                    </div>
                )}
            </div>
        )}

        {/* Renderizado de Vistas */}
        {viewType === "executive" && <ExecutiveDashboard />}
        {viewType === "cobranza" && <CobranzaDashboard />}
        {viewType === "mapa" && <MapDashboard />}
        {viewType === "crecimientoAnual" && <CrecimientoAnualDashboard />}
        {viewType === "contacto" && <ContactDashboard />}
        
        {(viewType === "escuela" || viewType === "area" || viewType === "instructor" || viewType === "curso" || viewType === "comparacion") && (
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold mb-4 capitalize">Análisis por {viewType}</h3>
                <div className="h-96">
                    <ResponsiveContainer>
                        <BarChart data={getViewData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={viewType === 'escuela' || viewType === 'comparacion' ? 'nombre' : 'nombre'} angle={-45} textAnchor="end" height={100} />
                            <YAxis />
                            <Tooltip />
                            {viewType === 'comparacion' ? (
                                <>
                                    <Bar dataKey={compareMonths[0]} fill="#8884d8" name={compareMonths[0]} />
                                    <Bar dataKey={compareMonths[1]} fill="#82ca9d" name={compareMonths[1]} />
                                    <Legend />
                                </>
                            ) : (
                                <Bar dataKey="valor" fill="#8884d8" />
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {viewType !== 'comparacion' && (
                    <div className="mt-8 overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                            <thead className="bg-gray-50 font-bold"><tr><th className="p-3">Nombre</th><th className="p-3">Valor</th><th className="p-3">Tendencia</th></tr></thead>
                            <tbody>
                                {getViewData.map((row, i) => (
                                    <tr key={i} className="border-t hover:bg-gray-50">
                                        <td className="p-3 font-medium">{row.nombre}</td>
                                        <td className="p-3">{row.valor.toLocaleString()}</td>
                                        <td className="p-3"><TrendIcon trend={row.tendencia} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
