/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import DashboardConsejo from './DashboardConsejo';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup as MapPopup } from 'react-leaflet';
import { 
  TrendingUp, TrendingDown, Minus, DollarSign, ShoppingCart, Bell, RefreshCw, 
  Wifi, WifiOff, User, Building, BookOpen, Book, BarChart3, Star, Target, 
  AlertTriangle, Phone, Mail, Globe, MessageSquare, Users, MapPin, 
  Calendar 
} from 'lucide-react';

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

const fallbackData = { "2024-01": { "Polanco": { "Maquillaje": { "Curso Demo": { ventas: 0, cursos: 0, instructor: "N/A" } } } } };
const fallbackContactData = { "2024-01": { "WhatsApp": { ventas: 0, cursos: 0 } } };
const fallbackAgeData = { "2024-01": { "Desconocido": 0 } };
const fallbackCrecimientoAnualData = { headers: [], rows: [], queretaroRows: [], totalRows: [], years: [], monthlyMap: [], annualGrowthData: [] };

// --- HELPERS ---
const parseNumberFromString = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const cleaned = value.toString().trim().replace(/[$,\s%]/g, '').replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
};

const formatDateForDisplay = (monthString) => {
  try {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return isNaN(date.getTime()) ? monthString : date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
  } catch (e) { return monthString; }
};

const formatDateShort = (monthString) => {
  try {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return isNaN(date.getTime()) ? monthString : date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' });
  } catch (e) { return monthString; }
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

  // --- FETCHING ---
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
    } catch (e) { }
    return null;
  };

  const fetchGoogleSheetsData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const ventasRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.ranges.ventas}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`);
      if (!ventasRes.ok) throw new Error(`Error Ventas`);
      const ventasData = await ventasRes.json();
      
      processVentasData(ventasData.values);
      
      // Fetch Cobranza
      try {
        const cobRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.ranges.cobranza}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`);
        if (cobRes.ok) processCobranzaData((await cobRes.json()).values);
      } catch (e) {}
      
      // Fetch Crecimiento
      try {
        const crecRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${GOOGLE_SHEETS_CONFIG.ranges.crecimientoAnual}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`);
        if (crecRes.ok) processCrecimientoData((await crecRes.json()).values);
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

  const processVentasData = (rows) => {
    const rawData = rows.slice(1);
    const sData = {};
    const cData = {};
    const aData = {};
    const mData = {};

    rawData.forEach(row => {
        const [fecha, escuela, area, curso, ventas, cursosVendidos, instructor, medio, edad, cp] = row;
        if (!fecha || !escuela) return;
        
        const monthKey = fecha.substring(0, 7);
        const v = parseNumberFromString(ventas);
        const c = parseNumberFromString(cursosVendidos) || 1;
        const instr = instructor ? instructor.trim() : 'Sin asignar';

        // Sales Data
        if (!sData[monthKey]) sData[monthKey] = {};
        if (!sData[monthKey][escuela]) sData[monthKey][escuela] = {};
        if (!sData[monthKey][escuela][area]) sData[monthKey][escuela][area] = {};
        
        if (sData[monthKey][escuela][area][curso]) {
            sData[monthKey][escuela][area][curso].ventas += v;
            sData[monthKey][escuela][area][curso].cursos += c;
        } else {
            sData[monthKey][escuela][area][curso] = { ventas: v, cursos: c, instructor: instr };
        }

        // Contact Data
        if (medio) {
            const m = medio.trim();
            if (!cData[monthKey]) cData[monthKey] = {};
            if (!cData[monthKey][m]) cData[monthKey][m] = { ventas: 0, cursos: 0 };
            cData[monthKey][m].ventas += v;
            cData[monthKey][m].cursos += c;
        }

        // Age Data
        if (edad) {
            if (!aData[monthKey]) aData[monthKey] = {};
            let range = "Desconocido";
            const age = parseInt(edad);
            if (!isNaN(age)) {
                if (age < 18) range = "<18";
                else if (age <= 24) range = "18-24";
                else if (age <= 34) range = "25-34";
                else if (age <= 44) range = "35-44";
                else if (age <= 54) range = "45-54";
                else range = "55+";
            }
            if (!aData[monthKey][range]) aData[monthKey][range] = 0;
            aData[monthKey][range] += 1;
        }

        // Map Data
        if (cp && cp.length >= 4) {
            if (!mData[monthKey]) mData[monthKey] = {};
            if (!mData[monthKey][cp]) mData[monthKey][cp] = { count: 0, ventas: 0 };
            mData[monthKey][cp].count += 1;
            mData[monthKey][cp].ventas += v;
        }
    });

    setSalesData(sData);
    setContactData(cData);
    setAgeData(aData);
    setMapData(mData);
  };

  const processCobranzaData = (rows) => {
    const headers = rows[0];
    const data = rows.slice(1);
    const result = {};
    const months = headers.slice(1).filter(h => h);
    data.forEach(row => {
        const school = row[0];
        if (school) {
            result[school.trim()] = {};
            months.forEach((m, i) => {
                result[school.trim()][m.trim()] = parseNumberFromString(row[i+1]);
            });
        }
    });
    setCobranzaData(result);
  };

  const processCrecimientoData = (rows) => {
      // Simplificado para robustez
      const headerRow = rows[1] || [];
      const dataRows = rows.slice(2);
      const headers = headerRow.slice(0, 15);
      const yearIndex = headers.findIndex(h => h && h.toLowerCase().includes('año'));
      const years = [];
      const annualGrowthData = [];
      
      const processedRows = dataRows.slice(0, 8).filter(r => r.length > 0 && parseNumberFromString(r[0]) > 0);
      
      processedRows.forEach(row => {
          const y = parseNumberFromString(row[yearIndex]);
          if (y > 0) {
              years.push(y);
              annualGrowthData.push({ year: y, crecimiento: parseNumberFromString(row[14] || '0') });
          }
      });
      
      setCrecimientoAnualData({
          headers,
          rows: processedRows,
          years: years.sort((a,b)=>a-b),
          annualGrowthData: annualGrowthData.sort((a,b)=>a.year-b.year)
      });
  };

  useEffect(() => { fetchGoogleSheetsData(); }, []);
  useEffect(() => { const i = setInterval(() => fetchGoogleSheetsData(false), 3600000); return () => clearInterval(i); }, []);

  // --- MEMOS & UI HELPERS ---
  const months = useMemo(() => Object.keys(salesData).sort(), [salesData]);
  const schools = useMemo(() => {
      const s = new Set();
      Object.values(salesData).forEach(m => Object.keys(m).forEach(sch => s.add(sch)));
      return Array.from(s);
  }, [salesData]);
  const areas = useMemo(() => {
      const a = new Set();
      Object.values(salesData).forEach(m => Object.values(m).forEach(sch => Object.keys(sch).forEach(ar => a.add(ar))));
      return Array.from(a);
  }, [salesData]);

  // Alert Logic
  useEffect(() => {
      const newAlerts = [];
      const sortedMonths = Object.keys(salesData).sort();
      if (sortedMonths.length > 1) {
          const curr = sortedMonths[sortedMonths.length - 1];
          const prev = sortedMonths[sortedMonths.length - 2];
          Object.keys(salesData[curr]).forEach(s => {
              Object.keys(salesData[curr][s]).forEach(a => {
                  Object.keys(salesData[curr][s][a]).forEach(c => {
                      const currVal = salesData[curr][s][a][c].ventas;
                      const prevVal = salesData[prev]?.[s]?.[a]?.[c]?.ventas;
                      if (prevVal && currVal < prevVal * 0.7) {
                          newAlerts.push({ message: `${c} (${s})`, details: `Bajó ${((1 - currVal/prevVal)*100).toFixed(0)}%` });
                      }
                  });
              });
          });
      }
      setAlerts(newAlerts.slice(0, 10));
  }, [salesData]);

  const getAggregation = (type) => {
      const data = [];
      if (type === 'escuela') {
          schools.forEach(s => {
              const val = salesData[selectedMonth]?.[s] ? 
                  Object.values(salesData[selectedMonth][s]).reduce((acc, a) => 
                      acc + Object.values(a).reduce((sum, c) => sum + c[metricType], 0), 0) : 0;
              data.push({ name: s, value: val });
          });
      } else if (type === 'area') {
          const relevantSchools = selectedSchool ? [selectedSchool] : schools;
          const areaTotals = {};
          relevantSchools.forEach(s => {
              if (salesData[selectedMonth]?.[s]) {
                  Object.entries(salesData[selectedMonth][s]).forEach(([a, courses]) => {
                      if (!areaTotals[a]) areaTotals[a] = 0;
                      areaTotals[a] += Object.values(courses).reduce((sum, c) => sum + c[metricType], 0);
                  });
              }
          });
          Object.entries(areaTotals).forEach(([k, v]) => data.push({ name: k, value: v }));
      } else if (type === 'instructor') {
          const instrTotals = {};
          const relevantSchools = selectedSchool ? [selectedSchool] : schools;
          relevantSchools.forEach(s => {
              if (salesData[selectedMonth]?.[s]) {
                  Object.values(salesData[selectedMonth][s]).forEach(area => {
                      Object.values(area).forEach(c => {
                          const i = c.instructor || 'Sin asignar';
                          if (!instrTotals[i]) instrTotals[i] = 0;
                          instrTotals[i] += c[metricType];
                      });
                  });
              }
          });
          Object.entries(instrTotals).forEach(([k, v]) => data.push({ name: k, value: v }));
      } else if (type === 'curso') {
          const courseTotals = {};
          const relevantSchools = selectedSchool ? [selectedSchool] : schools;
          relevantSchools.forEach(s => {
              if (salesData[selectedMonth]?.[s]) {
                  const relevantAreas = selectedArea ? [selectedArea] : Object.keys(salesData[selectedMonth][s]);
                  relevantAreas.forEach(a => {
                      if (salesData[selectedMonth][s][a]) {
                          Object.entries(salesData[selectedMonth][s][a]).forEach(([cName, cData]) => {
                              if (!courseTotals[cName]) courseTotals[cName] = 0;
                              courseTotals[cName] += cData[metricType];
                          });
                      }
                  });
              }
          });
          Object.entries(courseTotals).forEach(([k, v]) => data.push({ name: k, value: v }));
      }
      return data.sort((a, b) => b.value - a.value);
  };

  const ExecutiveView = () => {
      const data = getAggregation('escuela'); // Get total sales per school
      const totalVentas = data.reduce((sum, item) => sum + (metricType === 'ventas' ? item.value : 0), 0);
      
      // Calculate totals manually for the cards
      let tVentas = 0, tCursos = 0;
      if (salesData[selectedMonth]) {
          Object.values(salesData[selectedMonth]).forEach(s => {
              Object.values(s).forEach(a => {
                  Object.values(a).forEach(c => {
                      tVentas += c.ventas;
                      tCursos += c.cursos;
                  });
              });
          });
      }

      return (
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-green-600 rounded-lg shadow p-6 text-white">
                      <p className="text-green-100">Ventas Totales</p>
                      <p className="text-3xl font-bold">${tVentas.toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-600 rounded-lg shadow p-6 text-white">
                      <p className="text-blue-100">Cursos Vendidos</p>
                      <p className="text-3xl font-bold">{tCursos}</p>
                  </div>
                  <div className="bg-purple-600 rounded-lg shadow p-6 text-white">
                      <p className="text-purple-100">Ticket Promedio</p>
                      <p className="text-3xl font-bold">${tCursos ? (tVentas/tCursos).toFixed(0) : 0}</p>
                  </div>
                  <div className="bg-gray-600 rounded-lg shadow p-6 text-white">
                      <p className="text-gray-100">Alertas</p>
                      <p className="text-3xl font-bold">{alerts.length}</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-bold mb-4">Top Vendedores</h3>
                      <div className="space-y-2 h-64 overflow-y-auto">
                          {getAggregation('instructor').slice(0, 10).map((i, idx) => (
                              <div key={idx} className="flex justify-between border-b py-2">
                                  <span>{i.name}</span>
                                  <span className="font-bold">{metricType === 'ventas' ? `$${i.value.toLocaleString()}` : i.value}</span>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-bold mb-4">Top Cursos</h3>
                      <div className="space-y-2 h-64 overflow-y-auto">
                          {getAggregation('curso').slice(0, 10).map((i, idx) => (
                              <div key={idx} className="flex justify-between border-b py-2">
                                  <span className="text-sm truncate w-2/3">{i.name}</span>
                                  <span className="font-bold">{metricType === 'ventas' ? `$${i.value.toLocaleString()}` : i.value}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold mb-4">Distribución de Edad</h3>
                  <div className="h-64">
                      <ResponsiveContainer>
                          <BarChart data={Object.entries(ageData[selectedMonth] || {}).map(([k,v]) => ({name:k, value:v}))}>
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
      );
  };

  const MapDashboard = () => {
      // Restore Map logic safely
      useEffect(() => {
          const load = async () => {
              const cps = Object.keys(mapData[selectedMonth] || {});
              for (const cp of cps) if (!coordsCache[cp]) await fetchCoordinatesForCP(cp);
          };
          load();
      }, [selectedMonth]);

      const data = Object.entries(mapData[selectedMonth] || {}).map(([cp, d]) => {
          const coords = coordsCache[cp];
          return coords ? { cp, ...coords, ...d } : null;
      }).filter(Boolean);

      return (
          <div className="bg-white rounded-lg shadow p-6 h-96">
              <h3 className="text-lg font-bold mb-4">Mapa de Alumnos ({formatDateForDisplay(selectedMonth)})</h3>
              <MapContainer center={[19.4326, -99.1332]} zoom={10} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {data.map(m => (
                      <CircleMarker key={m.cp} center={[m.lat, m.lng]} radius={m.count > 5 ? 20 : 10} pathOptions={{ color: 'red' }}>
                          <MapPopup>{m.placeName} ({m.count} alumnos)</MapPopup>
                      </CircleMarker>
                  ))}
              </MapContainer>
          </div>
      );
  };

  if (MODO === 'CONSEJO') return <DashboardConsejo />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Dashboard IDIP {SEDE}</h1>
        
        <div className="bg-white rounded-lg shadow p-4 mb-6 overflow-x-auto flex gap-4">
            <button onClick={() => setViewType("executive")} className={`px-4 py-2 rounded font-bold ${viewType === 'executive' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>Ejecutivo</button>
            <button onClick={() => setViewType("escuela")} className={`px-4 py-2 rounded font-bold ${viewType === 'escuela' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>Escuela</button>
            <button onClick={() => setViewType("area")} className={`px-4 py-2 rounded font-bold ${viewType === 'area' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>Área</button>
            <button onClick={() => setViewType("instructor")} className={`px-4 py-2 rounded font-bold ${viewType === 'instructor' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>Instructor</button>
            <button onClick={() => setViewType("curso")} className={`px-4 py-2 rounded font-bold ${viewType === 'curso' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>Curso</button>
            <button onClick={() => setViewType("mapa")} className={`px-4 py-2 rounded font-bold ${viewType === 'mapa' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>Mapa</button>
            <button onClick={() => setViewType("cobranza")} className={`px-4 py-2 rounded font-bold ${viewType === 'cobranza' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>Cobranza</button>
            <button onClick={() => setViewType("crecimientoAnual")} className={`px-4 py-2 rounded font-bold ${viewType === 'crecimientoAnual' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>Crecimiento</button>
        </div>

        {viewType !== 'executive' && viewType !== 'cobranza' && viewType !== 'crecimientoAnual' && viewType !== 'mapa' && (
            <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4 flex-wrap">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Mes</label>
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border p-2 rounded">
                        {months.map(m => <option key={m} value={m}>{formatDateForDisplay(m)}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Métrica</label>
                    <select value={metricType} onChange={(e) => setMetricType(e.target.value)} className="border p-2 rounded">
                        <option value="ventas">Ventas ($)</option>
                        <option value="cursos">Cursos</option>
                    </select>
                </div>
                {(viewType === 'area' || viewType === 'instructor' || viewType === 'curso') && (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase">Escuela</label>
                        <select value={selectedSchool} onChange={(e) => setSelectedSchool(e.target.value)} className="border p-2 rounded">
                            <option value="">Todas</option>
                            {schools.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                )}
            </div>
        )}

        {viewType === 'executive' && <ExecutiveView />}
        {viewType === 'mapa' && <MapDashboard />}
        {viewType === 'crecimientoAnual' && (
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4">Crecimiento Anual</h3>
                <div className="h-80"><ResponsiveContainer><BarChart data={crecimientoAnualData.annualGrowthData}><XAxis dataKey="year" /><YAxis /><Bar dataKey="crecimiento" fill="#3B82F6" /></BarChart></ResponsiveContainer></div>
            </div>
        )}
        {viewType === 'cobranza' && (
            <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
                <table className="min-w-full text-sm"><thead className="bg-gray-100"><tr><th>Escuela</th>{Object.keys(cobranzaData[Object.keys(cobranzaData)[0]] || {}).map(m => <th key={m}>{m}</th>)}</tr></thead><tbody>{Object.entries(cobranzaData).map(([s, d]) => <tr key={s} className="border-t"><td>{s}</td>{Object.values(d).map((v, i) => <td key={i}>${v.toLocaleString()}</td>)}</tr>)}</tbody></table>
            </div>
        )}

        {(viewType === 'escuela' || viewType === 'area' || viewType === 'instructor' || viewType === 'curso') && (
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4 capitalize">Análisis por {viewType}</h3>
                <div className="h-96 mb-8">
                    <ResponsiveContainer>
                        <BarChart data={getAggregation(viewType)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#82ca9d" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-gray-100 uppercase font-bold">
                            <tr>
                                <th className="px-4 py-2">Nombre</th>
                                <th className="px-4 py-2">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {getAggregation(viewType).map((row, i) => (
                                <tr key={i} className="border-t hover:bg-gray-50">
                                    <td className="px-4 py-2 font-medium">{row.name}</td>
                                    <td className="px-4 py-2">{metricType === 'ventas' ? `$${row.value.toLocaleString()}` : row.value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
