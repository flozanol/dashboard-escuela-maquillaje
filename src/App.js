/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useMemo, useEffect } from 'react';
import DashboardConsejo from './DashboardConsejo';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup as MapPopup } from 'react-leaflet';
import { TrendingUp, TrendingDown, Minus, DollarSign, ShoppingCart, Bell, RefreshCw, Wifi, WifiOff, User, Building, BookOpen, Book, BarChart3, Star, Target, AlertTriangle, Activity, Phone, Mail, Globe, MessageSquare, Users, MapPin, Layers, Calendar } from 'lucide-react';

const SEDE = process.env.REACT_APP_SEDE || 'CDMX';
const MODO = process.env.REACT_APP_MODO || 'ESCUELA';

const GOOGLE_SHEETS_CONFIG = {
  apiKey: process.env.REACT_APP_GSHEETS_API_KEY,
  spreadsheetId: '1DHt8N8bEPElP4Stu1m2Wwb2brO3rLKOSuM8y_Ca3nVg',
  ranges: {
    ventas: SEDE === 'QRO' ? 'Ventas Qro!A:Z' : 'Ventas!A:Z',
    cobranza: 'Cobranza!A:Z',
    crecimientoAnual: 'Crecimiento Anual!A:Z'
  }
};

const fallbackData = { "2024-01": { "Polanco": { "Maquillaje": { "Curso": { ventas: 0, cursos: 0, instructor: "N/A" } } } } };
const fallbackContactData = { "2024-01": { "WhatsApp": { ventas: 0, cursos: 0 } } };
const fallbackAgeData = { "2024-01": { "Desconocido": 0 } };
const fallbackCrecimientoAnualData = { headers: [], rows: [], queretaroRows: [], totalRows: [], years: [], monthlyMap: [], annualGrowthData: [] };

const Dashboard = () => {
  const currentDate = new Date();
  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
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
  const [coordsCache, setCoordsCache] = useState({}); 
  const [crecimientoAnualData, setCrecimientoAnualData] = useState(fallbackCrecimientoAnualData); 
  
  const [showFullHistoryMap, setShowFullHistoryMap] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  const [alerts, setAlerts] = useState([]);

  // --- HELPERS ---
  const parseNumberFromString = (value) => {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    const str = value.toString().trim();
    if (str === '' || str.toLowerCase() === 'null') return 0;
    const cleaned = str.replace(/[$,\s]/g, '').replace(/[^\d.-]/g, '');
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

  const sortMonthsChronologically = (months) => {
    return months.sort(); // Simplificado para estabilidad
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

  // --- API ---
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
    } catch (e) { console.warn(e); }
    return null;
  };

  const fetchGoogleSheetsData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    
    try {
      const ventasRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.ranges.ventas}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`);
      if (!ventasRes.ok) throw new Error(`Error Ventas`);
      const ventasData = await ventasRes.json();
      
      setSalesData(transformGoogleSheetsData(ventasData.values));
      setContactData(transformContactData(ventasData.values));
      setAgeData(transformAgeData(ventasData.values));
      setMapData(transformMapData(ventasData.values));
      
      try {
        const cobRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.ranges.cobranza}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`);
        if (cobRes.ok) setCobranzaData(transformCobranzaData((await cobRes.json()).values));
      } catch (e) {}
      
      try {
        const crecRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.ranges.crecimientoAnual}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`);
        if (crecRes.ok) setCrecimientoAnualData(transformCrecimientoAnualData((await crecRes.json()).values));
      } catch (e) {}

      setConnectionStatus('connected');
      setErrorMessage('');
    } catch (error) {
      console.error(error);
      setConnectionStatus('error');
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- TRANSFORMS (ORIGINAL LOGIC) ---
  const transformGoogleSheetsData = (rawData) => {
    const rows = rawData.slice(1);
    const transformedData = {};
    rows.forEach((row) => {
      const [fecha, escuela, area, curso, ventas, cursosVendidos, instructor] = row;
      if (!fecha || !escuela) return;
      const monthKey = fecha.substring(0, 7);
      if (!transformedData[monthKey]) transformedData[monthKey] = {};
      if (!transformedData[monthKey][escuela]) transformedData[monthKey][escuela] = {};
      if (!transformedData[monthKey][escuela][area]) transformedData[monthKey][escuela][area] = {};
      const v = parseNumberFromString(ventas);
      const c = parseNumberFromString(cursosVendidos) || 1;
      if (transformedData[monthKey][escuela][area][curso]) {
        transformedData[monthKey][escuela][area][curso].ventas += v;
        transformedData[monthKey][escuela][area][curso].cursos += c;
      } else {
        transformedData[monthKey][escuela][area][curso] = { ventas: v, cursos: c, instructor: instructor || 'Sin asignar' };
      }
    });
    return transformedData;
  };

  const transformContactData = (rawData) => {
    const rows = rawData.slice(1);
    const transformedData = {};
    rows.forEach((row) => {
      const [fecha, , , , ventas, cursosVendidos, , medio] = row;
      if (!fecha || !medio) return;
      const monthKey = fecha.substring(0, 7);
      const m = medio.trim();
      if (!transformedData[monthKey]) transformedData[monthKey] = {};
      if (!transformedData[monthKey][m]) transformedData[monthKey][m] = { ventas: 0, cursos: 0 };
      transformedData[monthKey][m].ventas += parseNumberFromString(ventas);
      transformedData[monthKey][m].cursos += parseNumberFromString(cursosVendidos) || 1;
    });
    return transformedData;
  };

  const transformAgeData = (rawData) => {
    const rows = rawData.slice(1);
    const transformedData = {};
    rows.forEach((row) => {
        const fecha = row[0];
        const rawAge = row[8] ? row[8].toString().trim() : '';
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
        } else if (rawAge !== '') ageRange = "Otro";
        if (!transformedData[monthKey][ageRange]) transformedData[monthKey][ageRange] = 0;
        transformedData[monthKey][ageRange] += 1; 
    });
    return transformedData;
  };

  const transformMapData = (rawData) => {
    const rows = rawData.slice(1);
    const transformedData = {}; 
    rows.forEach((row) => {
        const fecha = row[0];
        const ventas = row[4]; 
        const cp = row[9] ? row[9].toString().trim() : '';
        if (!fecha || !cp || cp.length < 4) return;
        const monthKey = fecha.substring(0, 7);
        if (!transformedData[monthKey]) transformedData[monthKey] = {};
        if (!transformedData[monthKey][cp]) transformedData[monthKey][cp] = { count: 0, ventas: 0 };
        transformedData[monthKey][cp].count += 1;
        transformedData[monthKey][cp].ventas += parseNumberFromString(ventas);
    });
    return transformedData;
  };

  const transformCobranzaData = (rawData) => {
    if (!rawData || rawData.length === 0) return {};
    const headers = rawData[0];
    const rows = rawData.slice(1);
    const result = {};
    const meses = headers.slice(1).filter(h => h && h.trim() !== '');
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
    const rows = allDataRows.slice(0, 8).filter(r => r.length > 0 && parseNumberFromString(r[0]) > 0).map(r => r.slice(0, 15));
    const queretaroRows = rawData.slice(10, 15).map(r => r.slice(0, 15));
    const totalRows = rawData.slice(17, 22).map(r => r.slice(0, 15));
    const MONTH_ABBREVIATIONS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthlyMap = [];
    const annualGrowthData = [];
    const years = [];
    const yearIndex = headers.findIndex(h => h.toLowerCase().includes('año'));
    rows.forEach(row => {
        const y = parseNumberFromString(row[yearIndex]);
        if (y > 0) {
            years.push(y);
            annualGrowthData.push({ year: y, crecimiento: parseNumberFromString(row[headers.length-1] || '0') });
        }
    });
    MONTH_ABBREVIATIONS.forEach((m, i) => {
        const d = { name: m };
        rows.forEach(r => {
            const y = parseNumberFromString(r[yearIndex]);
            if (y > 0) d[y] = parseNumberFromString(r[i+1]);
        });
        monthlyMap.push(d);
    });
    return { headers, rows, queretaroRows, totalRows, years: years.sort((a,b)=>a-b), monthlyMap, annualGrowthData: annualGrowthData.sort((a,b)=>a.year-b.year) };
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
  }, [selectedMonth, mapData, showFullHistoryMap]);

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
                        newAlerts.push({ type: 'warning', message: `${c} bajó ventas`, details: `${s} - ${a}`, escuela: s, area: a });
                    }
                });
            });
        });
    }
    setAlerts(newAlerts.slice(0, 15));
  }, [salesData]);

  // --- MEMOS ---
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

  const getContactTotals = (month) => contactData[month] || {};

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
        case "contacto":
            const coTotals = getContactTotals(selectedMonth);
            return Object.keys(coTotals).map(c => ({ nombre: c, valor: coTotals[c][metricType], promedio: 0, tendencia: "stable", icono: MessageSquare }));
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
  }, [viewType, selectedMonth, selectedSchool, selectedArea, metricType, compareMonths, salesData]);

  // --- COMPONENTES ---
  const ExecutiveDashboard = () => {
    const currentMonthData = salesData[selectedMonth] || {};
    let totalVentas = 0;
    let totalCursos = 0;
    Object.keys(currentMonthData).forEach(schoolName => {
        Object.keys(currentMonthData[schoolName]).forEach(areaName => {
            Object.values(currentMonthData[schoolName][areaName]).forEach(curso => {
                totalVentas += curso.ventas;
                totalCursos += curso.cursos;
            });
        });
    });
    const ticketPromedio = totalCursos > 0 ? totalVentas / totalCursos : 0;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
                    <p className="text-green-100 text-sm">Ventas Totales</p>
                    <p className="text-3xl font-bold">${totalVentas.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg shadow p-6 text-white">
                    <p className="text-gray-100 text-sm">Cursos Vendidos</p>
                    <p className="text-3xl font-bold">{totalCursos.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-r from-green-400 to-green-500 rounded-lg shadow p-6 text-white">
                    <p className="text-green-100 text-sm">Ticket Promedio</p>
                    <p className="text-3xl font-bold">${ticketPromedio.toFixed(0)}</p>
                </div>
                <div className="bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg shadow p-6 text-white">
                    <p className="text-gray-100 text-sm">Alertas Activas</p>
                    <p className="text-3xl font-bold">{alerts.length}</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Alertas</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {alerts.length === 0 ? <p className="text-gray-400 text-sm">No hay alertas</p> : alerts.map((a, i) => (
                            <div key={i} className="p-2 bg-yellow-50 text-yellow-800 rounded text-sm border-l-4 border-yellow-500"><strong>{a.message}</strong> - {a.details}</div>
                        ))}
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Tendencia Mensual</h3>
                    <div className="h-80">
                        <ResponsiveContainer>
                            <LineChart data={months.map(m => ({ month: formatDateShort(m), ventas: Object.values(getSchoolTotals(m)).reduce((a,b)=>a+b.ventas,0) }))}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="ventas" stroke="#22C55E" strokeWidth={3} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  const CobranzaDashboard = () => {
    const meses = sortMonthsChronologically([...new Set(Object.values(cobranzaData).flatMap(s => Object.keys(s)))]);
    const escuelas = Object.keys(cobranzaData);
    return (
        <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="px-4 py-2">Escuela</th>{meses.map(m => <th key={m} className="px-4 py-2">{m}</th>)}</tr></thead>
                <tbody>{escuelas.map(e => <tr key={e} className="border-t"><td className="px-4 py-2 font-medium">{e}</td>{meses.map(m => <td key={m} className="px-4 py-2">${(cobranzaData[e][m] || 0).toLocaleString()}</td>)}</tr>)}</tbody>
            </table>
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
                        <CircleMarker key={m.cp} center={[m.lat, m.lng]} radius={m.count < 5 ? 10 : 20} pathOptions={{ color: 'red' }}><MapPopup>CP: {m.cp}<br/>Alumnos: {m.count}</MapPopup></CircleMarker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
  };

  const CrecimientoAnualDashboard = () => {
      const { annualGrowthData } = crecimientoAnualData;
      return (
          <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Crecimiento Anual</h3>
              <div className="h-80"><ResponsiveContainer><BarChart data={annualGrowthData}><XAxis dataKey="year" /><YAxis /><Bar dataKey="crecimiento" fill="#3B82F6" /></BarChart></ResponsiveContainer></div>
          </div>
      );
  };

  if (MODO === 'CONSEJO') return <DashboardConsejo />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard IDIP {SEDE}</h1>
            <div className="flex gap-2 text-sm text-gray-500">
                {connectionStatus === 'connected' ? <span className="text-green-600">● Conectado</span> : <span className="text-red-600">● {connectionStatus}</span>}
            </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            <button onClick={() => setViewType("executive")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "executive" ? "bg-green-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}><BarChart3 className="w-4 h-4" /> Ejecutivo</button>
            <button onClick={() => setViewType("escuela")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "escuela" ? "bg-green-600 text-white" : "bg-gray-100"}`}><Building className="w-4 h-4" /> Por Escuela</button>
            <button onClick={() => setViewType("area")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "area" ? "bg-green-600 text-white" : "bg-gray-100"}`}><BookOpen className="w-4 h-4" /> Por Área</button>
            <button onClick={() => setViewType("instructor")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "instructor" ? "bg-green-600 text-white" : "bg-gray-100"}`}><User className="w-4 h-4" /> Por Vendedor</button>
            <button onClick={() => setViewType("curso")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "curso" ? "bg-green-600 text-white" : "bg-gray-100"}`}><Book className="w-4 h-4" /> Por Curso</button>
            <button onClick={() => setViewType("contacto")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "contacto" ? "bg-purple-600 text-white" : "bg-gray-100"}`}><MessageSquare className="w-4 h-4" /> Contacto</button>
            <button onClick={() => setViewType("mapa")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "mapa" ? "bg-red-600 text-white" : "bg-gray-100"}`}><MapPin className="w-4 h-4" /> Mapa</button>
            <button onClick={() => setViewType("cobranza")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "cobranza" ? "bg-blue-600 text-white" : "bg-gray-100"}`}><DollarSign className="w-4 h-4" /> Cobranza</button>
            <button onClick={() => setViewType("crecimientoAnual")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${viewType === "crecimientoAnual" ? "bg-indigo-600 text-white" : "bg-gray-100"}`}><TrendingUp className="w-4 h-4" /> Crecimiento</button>
          </div>
        </div>

        {viewType !== 'executive' && viewType !== 'cobranza' && viewType !== 'crecimientoAnual' && viewType !== 'mapa' && (
            <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4 flex-wrap">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Mes</label>
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border rounded p-2">
                        {months.map(m => <option key={m} value={m}>{formatDateForDisplay(m)}</option>)}
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
                {viewType === 'curso' && (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase">Área</label>
                        <select value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)} className="border rounded p-2">
                            <option value="">Todas</option>
                            {areas.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                )}
                {viewType === 'comparacion' && (
                    <div className="flex gap-2">
                        <select value={compareMonths[0]} onChange={(e) => setCompareMonths([e.target.value, compareMonths[1]])} className="border rounded p-2">{months.map(m => <option key={m} value={m}>{formatDateShort(m)}</option>)}</select>
                        <select value={compareMonths[1]} onChange={(e) => setCompareMonths([compareMonths[0], e.target.value])} className="border rounded p-2">{months.map(m => <option key={m} value={m}>{formatDateShort(m)}</option>)}</select>
                    </div>
                )}
            </div>
        )}

        {viewType === "executive" && <ExecutiveDashboard />}
        {viewType === "cobranza" && <CobranzaDashboard />}
        {viewType === "mapa" && <MapDashboard />}
        {viewType === "crecimientoAnual" && <CrecimientoAnualDashboard />}
        
        {(viewType === "escuela" || viewType === "area" || viewType === "instructor" || viewType === "curso" || viewType === "comparacion" || viewType === "contacto") && (
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold mb-4 capitalize">Análisis por {viewType}</h3>
                <div className="h-96">
                    <ResponsiveContainer>
                        <BarChart data={getViewData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
                            <YAxis />
                            <Tooltip />
                            {viewType === 'comparacion' ? (
                                <>
                                    <Bar dataKey={compareMonths[0]} fill="#8884d8" name={formatDateShort(compareMonths[0])} />
                                    <Bar dataKey={compareMonths[1]} fill="#82ca9d" name={formatDateShort(compareMonths[1])} />
                                    <Legend />
                                </>
                            ) : (
                                <Bar dataKey="valor" fill="#8884d8" />
                            )}
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
