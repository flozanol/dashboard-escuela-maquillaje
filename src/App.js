import React, { useEffect, useMemo, useState } from 'react';
import DashboardConsejo from './DashboardConsejo';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  ShoppingCart,
  Bell,
  RefreshCw,
  Wifi,
  WifiOff,
  User,
  Building,
  BookOpen,
  Book,
  BarChart3,
  Target,
  AlertTriangle,
  Phone,
  Mail,
  Globe,
  MessageSquare,
  Users,
  MapPin,
  Calendar,
  Activity,
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
  },
};

const fallbackData = {
  '2024-06': {
    Polanco: {
      Maquillaje: {
        'Maquillaje Básico': { ventas: 26000, cursos: 22, instructor: 'Ana Martínez' },
        'Maquillaje Profesional': { ventas: 39000, cursos: 17, instructor: 'Sofía López' },
      },
      Certificaciones: {
        'Certificación Básica': { ventas: 29000, cursos: 26, instructor: 'Roberto Silva' },
      },
    },
    Online: {
      Maquillaje: {
        'Curso Online Básico': { ventas: 21000, cursos: 40, instructor: 'Ana Martínez' },
      },
    },
  },
  '2024-07': {
    Polanco: {
      Maquillaje: {
        'Maquillaje Básico': { ventas: 28000, cursos: 24, instructor: 'Ana Martínez' },
        'Maquillaje Profesional': { ventas: 42000, cursos: 18, instructor: 'Sofía López' },
      },
      Certificaciones: {
        'Certificación Básica': { ventas: 35000, cursos: 35, instructor: 'Roberto Silva' },
      },
    },
    Online: {
      Maquillaje: {
        'Curso Online Básico': { ventas: 25000, cursos: 50, instructor: 'Ana Martínez' },
      },
    },
  },
};

const fallbackContactData = {
  '2024-06': {
    WhatsApp: { ventas: 50000, cursos: 40 },
    Instagram: { ventas: 36000, cursos: 30 },
    Facebook: { ventas: 30000, cursos: 24 },
    Teléfono: { ventas: 20000, cursos: 16 },
    Email: { ventas: 15000, cursos: 11 },
  },
  '2024-07': {
    WhatsApp: { ventas: 52000, cursos: 42 },
    Instagram: { ventas: 38000, cursos: 35 },
    Facebook: { ventas: 35000, cursos: 28 },
    Teléfono: { ventas: 22000, cursos: 18 },
    Email: { ventas: 18000, cursos: 15 },
  },
};

const fallbackAgeData = {
  '2024-07': {
    '18-24': 15,
    '25-34': 45,
    '35-44': 20,
    '45-54': 10,
    '55+': 5,
  },
};

const fallbackCobranzaData = {
  Polanco: { '2024-04': 180000, '2024-05': 210000, '2024-06': 190000, '2024-07': 230000 },
  Online: { '2024-04': 90000, '2024-05': 120000, '2024-06': 110000, '2024-07': 135000 },
  Satélite: { '2024-04': 75000, '2024-05': 82000, '2024-06': 98000, '2024-07': 102000 },
};

const fallbackMapData = {
  '2024-07': {
    '11560': { count: 14, ventas: 42000 },
    '03100': { count: 9, ventas: 28000 },
    '76100': { count: 6, ventas: 19000 },
  },
};

const fallbackCrecimientoAnualData = {
  headers: ['Año', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Total', 'Crecimiento'],
  rows: [
    [2022, 2000000, 2500000, 2800000, 3100000, 3500000, 3800000, 4000000, 4200000, 4500000, 4800000, 5000000, 5200000, 45400000, 'N/A'],
    [2023, 3000000, 3500000, 4000000, 4500000, 5000000, 5500000, 6000000, 6500000, 7000000, 7500000, 8000000, 8500000, 75000000, '65.2%'],
    [2024, 4000000, 4800000, 5500000, 6200000, 7000000, 7800000, 8500000, 0, 0, 0, 0, 0, 43800000, '15.6%'],
  ],
  years: [2022, 2023, 2024],
  monthlyMap: [
    { name: 'Ene', 2022: 2000000, 2023: 3000000, 2024: 4000000 },
    { name: 'Feb', 2022: 2500000, 2023: 3500000, 2024: 4800000 },
    { name: 'Mar', 2022: 2800000, 2023: 4000000, 2024: 5500000 },
    { name: 'Abr', 2022: 3100000, 2023: 4500000, 2024: 6200000 },
    { name: 'May', 2022: 3500000, 2023: 5000000, 2024: 7000000 },
    { name: 'Jun', 2022: 3800000, 2023: 5500000, 2024: 7800000 },
    { name: 'Jul', 2022: 4000000, 2023: 6000000, 2024: 8500000 },
    { name: 'Ago', 2022: 4200000, 2023: 6500000, 2024: 0 },
    { name: 'Sep', 2022: 4500000, 2023: 7000000, 2024: 0 },
    { name: 'Oct', 2022: 4800000, 2023: 7500000, 2024: 0 },
    { name: 'Nov', 2022: 5000000, 2023: 8000000, 2024: 0 },
    { name: 'Dic', 2022: 5200000, 2023: 8500000, 2024: 0 },
  ],
  annualGrowthData: [
    { year: 2022, crecimiento: 0 },
    { year: 2023, crecimiento: 65.2 },
    { year: 2024, crecimiento: 15.6 },
  ],
};

const COLORS = ['#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];

const cn = (...classes) => classes.filter(Boolean).join(' ');

const parseNumberFromString = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return Number.isNaN(value) ? 0 : value;
  const str = String(value).trim();
  if (!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return 0;
  const cleaned = str.replace(/[$,\s]/g, '').replace(/[^\d.-]/g, '');
  if (!cleaned || cleaned === '.' || cleaned === '-') return 0;
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? 0 : n;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value || 0);

const formatDateForDisplay = (monthString) => {
  try {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    if (Number.isNaN(date.getTime())) return monthString;
    return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long' });
  } catch {
    return monthString;
  }
};

const formatDateShort = (monthString) => {
  try {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    if (Number.isNaN(date.getTime())) return monthString;
    return date.toLocaleDateString('es-MX', { year: '2-digit', month: 'short' });
  } catch {
    return monthString;
  }
};

const getContactIcon = (method) => {
  const methodLower = String(method || '').toLowerCase();
  if (methodLower.includes('whatsapp')) return MessageSquare;
  if (methodLower.includes('instagram') || methodLower.includes('facebook')) return Users;
  if (methodLower.includes('teléfono') || methodLower.includes('telefono')) return Phone;
  if (methodLower.includes('email') || methodLower.includes('correo')) return Mail;
  return Globe;
};

const KpiCard = ({ title, value, subtitle, icon: Icon, tone = 'blue' }) => {
  const toneMap = {
    blue: 'from-blue-500 to-blue-600 text-white',
    green: 'from-green-500 to-green-600 text-white',
    purple: 'from-purple-500 to-purple-600 text-white',
    orange: 'from-orange-500 to-orange-600 text-white',
    red: 'from-red-500 to-red-600 text-white',
    indigo: 'from-indigo-500 to-indigo-600 text-white',
  };

  return (
    <div className={cn('bg-gradient-to-r rounded-lg shadow p-6', toneMap[tone] || toneMap.blue)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {subtitle ? <p className="text-sm opacity-90 mt-1">{subtitle}</p> : null}
        </div>
        {Icon ? <Icon className="w-8 h-8 opacity-80" /> : null}
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    connected: { icon: Wifi, text: 'Conectado a Google Sheets', className: 'text-green-600' },
    error: { icon: WifiOff, text: 'Error al cargar, usando respaldo', className: 'text-red-600' },
    disconnected: { icon: WifiOff, text: 'Usando datos de ejemplo', className: 'text-gray-600' },
  };
  const cfg = map[status] || map.disconnected;
  const Icon = cfg.icon;
  return (
    <div className={cn('flex items-center gap-2 text-sm', cfg.className)}>
      <Icon className="w-4 h-4" />
      <span>{cfg.text}</span>
    </div>
  );
};

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState('2024-07');
  const [selectedSchool, setSelectedSchool] = useState('Polanco');
  const [selectedArea, setSelectedArea] = useState('Maquillaje');
  const [viewType, setViewType] = useState('executive');
  const [metricType, setMetricType] = useState('ventas');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedContactMonths, setSelectedContactMonths] = useState([]);
  const [salesData, setSalesData] = useState(fallbackData);
  const [contactData, setContactData] = useState(fallbackContactData);
  const [ageData, setAgeData] = useState(fallbackAgeData);
  const [cobranzaData, setCobranzaData] = useState(fallbackCobranzaData);
  const [mapData, setMapData] = useState(fallbackMapData);
  const [crecimientoAnualData, setCrecimientoAnualData] = useState(fallbackCrecimientoAnualData);
  const [isLoading, setIsLoading] = useState(true);
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  const [alerts, setAlerts] = useState([]);

  const months = useMemo(() => Object.keys(salesData).sort(), [salesData]);
  const schools = useMemo(() => {
    const set = new Set();
    Object.values(salesData).forEach((monthData) => Object.keys(monthData || {}).forEach((school) => set.add(school)));
    return Array.from(set);
  }, [salesData]);

  const areas = useMemo(() => {
    const set = new Set();
    Object.values(salesData).forEach((monthData) => {
      Object.values(monthData || {}).forEach((schoolData) => {
        Object.keys(schoolData || {}).forEach((area) => set.add(area));
      });
    });
    return Array.from(set);
  }, [salesData]);

  const getSchoolTotals = (month) => {
    const totals = {};
    const monthData = salesData[month] || {};
    Object.keys(monthData).forEach((school) => {
      totals[school] = { ventas: 0, cursos: 0 };
      Object.values(monthData[school] || {}).forEach((areaData) => {
        Object.values(areaData || {}).forEach((courseData) => {
          totals[school].ventas += parseNumberFromString(courseData?.ventas);
          totals[school].cursos += parseNumberFromString(courseData?.cursos);
        });
      });
    });
    return totals;
  };

  const getAreaTotals = (month, school = null) => {
    const totals = {};
    const monthData = salesData[month] || {};
    const schoolsToProcess = school ? [school] : Object.keys(monthData);
    schoolsToProcess.forEach((schoolKey) => {
      Object.keys(monthData[schoolKey] || {}).forEach((area) => {
        if (!totals[area]) totals[area] = { ventas: 0, cursos: 0 };
        Object.values(monthData[schoolKey][area] || {}).forEach((courseData) => {
          totals[area].ventas += parseNumberFromString(courseData?.ventas);
          totals[area].cursos += parseNumberFromString(courseData?.cursos);
        });
      });
    });
    return totals;
  };

  const getCourses = (month, school = null, area = null) => {
    const courses = {};
    const monthData = salesData[month] || {};
    const schoolsToProcess = school ? [school] : Object.keys(monthData);
    schoolsToProcess.forEach((schoolKey) => {
      const schoolData = monthData[schoolKey] || {};
      const areasToProcess = area ? [area] : Object.keys(schoolData);
      areasToProcess.forEach((areaKey) => {
        Object.entries(schoolData[areaKey] || {}).forEach(([course, courseData]) => {
          const key = `${course} (${schoolKey})`;
          if (!courses[key]) {
            courses[key] = {
              ventas: 0,
              cursos: 0,
              instructor: courseData?.instructor || 'Sin asignar',
              escuela: schoolKey,
              area: areaKey,
            };
          }
          courses[key].ventas += parseNumberFromString(courseData?.ventas);
          courses[key].cursos += parseNumberFromString(courseData?.cursos);
        });
      });
    });
    return courses;
  };

  const getInstructorTotals = (month, school = null) => {
    const totals = {};
    const monthData = salesData[month] || {};
    const schoolsToProcess = school ? [school] : Object.keys(monthData);
    schoolsToProcess.forEach((schoolKey) => {
      Object.entries(monthData[schoolKey] || {}).forEach(([area, areaData]) => {
        Object.entries(areaData || {}).forEach(([course, courseData]) => {
          const instructor = courseData?.instructor || 'Sin asignar';
          if (!totals[instructor]) {
            totals[instructor] = { ventas: 0, cursos: 0, areas: new Set(), escuelas: new Set(), cursosdetalle: [] };
          }
          totals[instructor].ventas += parseNumberFromString(courseData?.ventas);
          totals[instructor].cursos += parseNumberFromString(courseData?.cursos);
          totals[instructor].areas.add(area);
          totals[instructor].escuelas.add(schoolKey);
          totals[instructor].cursosdetalle.push({ curso: course, area, escuela: schoolKey });
        });
      });
    });
    Object.keys(totals).forEach((instructor) => {
      totals[instructor].areas = Array.from(totals[instructor].areas);
      totals[instructor].escuelas = Array.from(totals[instructor].escuelas);
    });
    return totals;
  };

  const getContactTotals = (month) => contactData[month] || {};

  const transformGoogleSheetsData = (rawData = []) => {
    if (!rawData.length) return fallbackData;
    const rows = rawData.slice(1);
    const transformed = {};
    rows.forEach((row) => {
      const [fecha, escuela, area, curso, ventas, cursosVendidos, instructor] = row;
      if (!fecha || !escuela || !area || !curso) return;
      const monthKey = String(fecha).substring(0, 7);
      if (!transformed[monthKey]) transformed[monthKey] = {};
      if (!transformed[monthKey][escuela]) transformed[monthKey][escuela] = {};
      if (!transformed[monthKey][escuela][area]) transformed[monthKey][escuela][area] = {};
      transformed[monthKey][escuela][area][curso] = {
        ventas: parseNumberFromString(ventas),
        cursos: parseNumberFromString(cursosVendidos) || 1,
        instructor: instructor || 'Sin asignar',
      };
    });
    return Object.keys(transformed).length ? transformed : fallbackData;
  };

  const transformContactData = (rawData = []) => {
    if (!rawData.length) return fallbackContactData;
    const rows = rawData.slice(1);
    const transformed = {};
    rows.forEach((row) => {
      const [fecha, , , , ventas, cursosVendidos, , medioContacto] = row;
      if (!fecha || !medioContacto) return;
      const monthKey = String(fecha).substring(0, 7);
      if (!transformed[monthKey]) transformed[monthKey] = {};
      if (!transformed[monthKey][medioContacto]) transformed[monthKey][medioContacto] = { ventas: 0, cursos: 0 };
      transformed[monthKey][medioContacto].ventas += parseNumberFromString(ventas);
      transformed[monthKey][medioContacto].cursos += parseNumberFromString(cursosVendidos) || 1;
    });
    return Object.keys(transformed).length ? transformed : fallbackContactData;
  };

  const transformAgeData = (rawData = []) => {
    if (!rawData.length) return fallbackAgeData;
    const rows = rawData.slice(1);
    const transformed = {};
    rows.forEach((row) => {
      const fecha = row[0];
      const rawAge = row[8] ? String(row[8]).trim() : '';
      if (!fecha) return;
      const monthKey = String(fecha).substring(0, 7);
      if (!transformed[monthKey]) transformed[monthKey] = {};
      let ageRange = 'Sin dato';
      const ageNum = parseInt(rawAge, 10);
      if (!Number.isNaN(ageNum)) {
        if (ageNum < 18) ageRange = 'Menores de 18';
        else if (ageNum <= 24) ageRange = '18-24';
        else if (ageNum <= 34) ageRange = '25-34';
        else if (ageNum <= 44) ageRange = '35-44';
        else if (ageNum <= 54) ageRange = '45-54';
        else ageRange = '55+';
      }
      transformed[monthKey][ageRange] = (transformed[monthKey][ageRange] || 0) + 1;
    });
    return Object.keys(transformed).length ? transformed : fallbackAgeData;
  };

  const transformMapData = (rawData = []) => {
    if (!rawData.length) return fallbackMapData;
    const rows = rawData.slice(1);
    const transformed = {};
    rows.forEach((row) => {
      const fecha = row[0];
      const ventas = row[4];
      const cp = row[9] ? String(row[9]).trim() : '';
      if (!fecha || !cp) return;
      const monthKey = String(fecha).substring(0, 7);
      if (!transformed[monthKey]) transformed[monthKey] = {};
      if (!transformed[monthKey][cp]) transformed[monthKey][cp] = { count: 0, ventas: 0 };
      transformed[monthKey][cp].count += 1;
      transformed[monthKey][cp].ventas += parseNumberFromString(ventas);
    });
    return Object.keys(transformed).length ? transformed : fallbackMapData;
  };

  const transformCobranzaData = (rawData = []) => {
    if (!rawData.length) return fallbackCobranzaData;
    const headers = rawData[0] || [];
    const rows = rawData.slice(1);
    const result = {};
    const meses = headers.slice(1).filter(Boolean);
    rows.forEach((row) => {
      const escuela = row[0];
      if (!escuela) return;
      result[escuela] = {};
      meses.forEach((mes, index) => {
        result[escuela][mes] = parseNumberFromString(row[index + 1]);
      });
    });
    return Object.keys(result).length ? result : fallbackCobranzaData;
  };

  const transformCrecimientoAnualData = (rawData = []) => {
    if (!rawData.length || rawData.length < 3) return fallbackCrecimientoAnualData;
    const headerRow = rawData[1] || [];
    const rows = rawData.slice(2).filter((row) => parseNumberFromString(row[0]) > 0).map((row) => row.slice(0, 15));
    const years = rows.map((row) => parseNumberFromString(row[0])).filter(Boolean);
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthlyMap = monthNames.map((monthName, idx) => {
      const item = { name: monthName };
      rows.forEach((row) => {
        const year = parseNumberFromString(row[0]);
        item[year] = parseNumberFromString(row[idx + 1]);
      });
      return item;
    });
    const annualGrowthData = rows.map((row) => ({ year: parseNumberFromString(row[0]), crecimiento: parseNumberFromString(row[14]) }));
    return {
      headers: headerRow.slice(0, 15),
      rows,
      years,
      monthlyMap,
      annualGrowthData,
    };
  };

  const fetchGoogleSheetsData = async (showLoading = true) => {
    if (!GOOGLE_SHEETS_CONFIG.apiKey) {
      setConnectionStatus('disconnected');
      setIsLoading(false);
      setIsManualRefresh(false);
      setLastUpdated(new Date());
      return;
    }

    try {
      if (showLoading) setIsLoading(true);
      setIsManualRefresh(showLoading);

      const ventasUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${encodeURIComponent(GOOGLE_SHEETS_CONFIG.ranges.ventas)}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`;
      const cobranzaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${encodeURIComponent(GOOGLE_SHEETS_CONFIG.ranges.cobranza)}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`;
      const crecimientoUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/values/${encodeURIComponent(GOOGLE_SHEETS_CONFIG.ranges.crecimientoAnual)}?key=${GOOGLE_SHEETS_CONFIG.apiKey}`;

      const [ventasResponse, cobranzaResponse, crecimientoResponse] = await Promise.all([
        fetch(ventasUrl),
        fetch(cobranzaUrl),
        fetch(crecimientoUrl),
      ]);

      const ventasJson = ventasResponse.ok ? await ventasResponse.json() : { values: [] };
      const cobranzaJson = cobranzaResponse.ok ? await cobranzaResponse.json() : { values: [] };
      const crecimientoJson = crecimientoResponse.ok ? await crecimientoResponse.json() : { values: [] };

      setSalesData(transformGoogleSheetsData(ventasJson.values));
      setContactData(transformContactData(ventasJson.values));
      setAgeData(transformAgeData(ventasJson.values));
      setMapData(transformMapData(ventasJson.values));
      setCobranzaData(transformCobranzaData(cobranzaJson.values));
      const crecimientoTransformado = transformCrecimientoAnualData(crecimientoJson.values);
      setCrecimientoAnualData(crecimientoTransformado);
      if (crecimientoTransformado.years?.length) {
        setSelectedYear(String(crecimientoTransformado.years[crecimientoTransformado.years.length - 1]));
      }
      setConnectionStatus('connected');
      setErrorMessage('');
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching Google Sheets data:', error);
      setConnectionStatus('error');
      setErrorMessage(error.message || 'Error al cargar datos');
      setSalesData(fallbackData);
      setContactData(fallbackContactData);
      setAgeData(fallbackAgeData);
      setCobranzaData(fallbackCobranzaData);
      setMapData(fallbackMapData);
      setCrecimientoAnualData(fallbackCrecimientoAnualData);
    } finally {
      setIsLoading(false);
      setIsManualRefresh(false);
    }
  };

  useEffect(() => {
    fetchGoogleSheetsData();
  }, []);

  useEffect(() => {
    if (!months.includes(selectedMonth) && months.length) {
      setSelectedMonth(months[months.length - 1]);
    }
  }, [months, selectedMonth]);

  useEffect(() => {
    if (!schools.includes(selectedSchool) && schools.length) {
      setSelectedSchool(schools[0]);
    }
  }, [schools, selectedSchool]);

  useEffect(() => {
    if (!areas.includes(selectedArea) && areas.length) {
      setSelectedArea(areas[0]);
    }
  }, [areas, selectedArea]);

  useEffect(() => {
    const monthKeys = Object.keys(salesData).sort();
    if (monthKeys.length < 2) {
      setAlerts([]);
      return;
    }
    const currentMonth = monthKeys[monthKeys.length - 1];
    const previousMonth = monthKeys[monthKeys.length - 2];
    const newAlerts = [];
    Object.keys(salesData[currentMonth] || {}).forEach((school) => {
      Object.keys(salesData[currentMonth][school] || {}).forEach((area) => {
        Object.keys(salesData[currentMonth][school][area] || {}).forEach((course) => {
          const current = salesData[currentMonth][school][area][course];
          const previous = salesData[previousMonth]?.[school]?.[area]?.[course];
          if (!previous || !previous.ventas) return;
          const ventasChange = ((current.ventas - previous.ventas) / previous.ventas) * 100;
          if (ventasChange < -20) {
            newAlerts.push({
              type: 'warning',
              priority: ventasChange < -40 ? 'urgent' : 'high',
              message: `${course} en ${school} bajó ${Math.abs(ventasChange).toFixed(1)}% en ventas`,
              details: `De ${formatCurrency(previous.ventas)} a ${formatCurrency(current.ventas)}`,
              escuela: school,
              area,
            });
          }
        });
      });
    });
    setAlerts(newAlerts.slice(0, 12));
  }, [salesData]);

  const executiveKPIs = useMemo(() => {
    const currentMonth = salesData[selectedMonth] || {};
    let totalVentas = 0;
    let totalCursos = 0;
    Object.values(currentMonth).forEach((schoolData) => {
      Object.values(schoolData || {}).forEach((areaData) => {
        Object.values(areaData || {}).forEach((courseData) => {
          totalVentas += parseNumberFromString(courseData?.ventas);
          totalCursos += parseNumberFromString(courseData?.cursos);
        });
      });
    });

    const currentIndex = months.indexOf(selectedMonth);
    const previousMonth = currentIndex > 0 ? months[currentIndex - 1] : null;
    let prevVentas = 0;
    let prevCursos = 0;
    if (previousMonth) {
      Object.values(salesData[previousMonth] || {}).forEach((schoolData) => {
        Object.values(schoolData || {}).forEach((areaData) => {
          Object.values(areaData || {}).forEach((courseData) => {
            prevVentas += parseNumberFromString(courseData?.ventas);
            prevCursos += parseNumberFromString(courseData?.cursos);
          });
        });
      });
    }

    return {
      totalVentas,
      totalCursos,
      ticketPromedio: totalCursos ? totalVentas / totalCursos : 0,
      ventasGrowth: prevVentas ? ((totalVentas - prevVentas) / prevVentas) * 100 : 0,
      cursosGrowth: prevCursos ? ((totalCursos - prevCursos) / prevCursos) * 100 : 0,
    };
  }, [months, salesData, selectedMonth]);

  const viewData = useMemo(() => {
    switch (viewType) {
      case 'escuela': {
        const totals = getSchoolTotals(selectedMonth);
        return Object.entries(totals).map(([nombre, data]) => ({ nombre, valor: data[metricType], promedio: data[metricType] }));
      }
      case 'area': {
        const totals = getAreaTotals(selectedMonth, selectedSchool);
        return Object.entries(totals).map(([nombre, data]) => ({ nombre, valor: data[metricType], promedio: data[metricType] }));
      }
      case 'instructor': {
        const totals = getInstructorTotals(selectedMonth, selectedSchool);
        return Object.entries(totals).map(([nombre, data]) => ({ nombre, valor: data[metricType], areas: data.areas.join(', ') }));
      }
      case 'curso': {
        const totals = getCourses(selectedMonth, selectedSchool, selectedArea);
        return Object.entries(totals).map(([nombre, data]) => ({ nombre, valor: data[metricType], instructor: data.instructor }));
      }
      default:
        return [];
    }
  }, [viewType, selectedMonth, selectedSchool, selectedArea, metricType, salesData]);

  const contactTotals = useMemo(() => {
    const monthsToUse = selectedContactMonths.length ? selectedContactMonths : months;
    const totals = {};
    monthsToUse.forEach((month) => {
      Object.entries(getContactTotals(month)).forEach(([method, data]) => {
        if (!totals[method]) totals[method] = { ventas: 0, cursos: 0 };
        totals[method].ventas += parseNumberFromString(data.ventas);
        totals[method].cursos += parseNumberFromString(data.cursos);
      });
    });
    return totals;
  }, [months, selectedContactMonths, contactData]);

  const contactPieData = useMemo(() => {
    return Object.entries(contactTotals).map(([name, data]) => ({ name, value: data[metricType] || 0 }));
  }, [contactTotals, metricType]);

  const contactTrendData = useMemo(() => {
    return months.map((month) => {
      const row = { month: formatDateShort(month) };
      Object.entries(getContactTotals(month)).forEach(([method, data]) => {
        row[method] = data[metricType] || 0;
      });
      return row;
    });
  }, [months, contactData, metricType]);

  const cobranzaSchools = useMemo(() => Object.keys(cobranzaData), [cobranzaData]);
  const cobranzaMonths = useMemo(() => {
    const set = new Set();
    Object.values(cobranzaData).forEach((schoolData) => Object.keys(schoolData || {}).forEach((month) => set.add(month)));
    return Array.from(set).sort();
  }, [cobranzaData]);

  const totalesPorMes = useMemo(() => {
    const totals = {};
    cobranzaMonths.forEach((month) => {
      totals[month] = cobranzaSchools.reduce((sum, school) => sum + parseNumberFromString(cobranzaData[school]?.[month]), 0);
    });
    return totals;
  }, [cobranzaMonths, cobranzaSchools, cobranzaData]);

  const totalesPorEscuela = useMemo(() => {
    const totals = {};
    cobranzaSchools.forEach((school) => {
      totals[school] = cobranzaMonths.reduce((sum, month) => sum + parseNumberFromString(cobranzaData[school]?.[month]), 0);
    });
    return totals;
  }, [cobranzaSchools, cobranzaMonths, cobranzaData]);

  const cobranzaChartData = useMemo(() => {
    return cobranzaMonths.map((month) => ({ name: formatDateShort(month), total: totalesPorMes[month] || 0 }));
  }, [cobranzaMonths, totalesPorMes]);

  const crecimientoChartData = crecimientoAnualData.monthlyMap || [];
  const crecimientoYears = crecimientoAnualData.years || [];

  const mapEntries = Object.entries(mapData[selectedMonth] || {});

  const renderTrendIcon = (value) => {
    if (value > 5) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (value < -5) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const ContactDashboard = () => {
    const totalVentas = Object.values(contactTotals).reduce((sum, item) => sum + item.ventas, 0);
    const totalCursos = Object.values(contactTotals).reduce((sum, item) => sum + item.cursos, 0);

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Calendar className="w-4 h-4 text-purple-600" />
              Filtrar meses
            </div>
            {selectedContactMonths.length > 0 ? (
              <button className="text-xs text-purple-600 hover:text-purple-800" onClick={() => setSelectedContactMonths([])}>
                Ver todos
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {months.map((month) => {
              const isSelected = selectedContactMonths.includes(month);
              return (
                <button
                  key={month}
                  onClick={() =>
                    setSelectedContactMonths((prev) =>
                      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
                    )
                  }
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    isSelected ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-50 text-gray-600 border-gray-200'
                  )}
                >
                  {formatDateForDisplay(month)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard title="Total Ventas" value={formatCurrency(totalVentas)} subtitle="Por medios de contacto" icon={DollarSign} tone="purple" />
          <KpiCard title="Total Cursos" value={totalCursos.toLocaleString('es-MX')} subtitle="Cursos vendidos" icon={ShoppingCart} tone="indigo" />
          <KpiCard title="Canales activos" value={Object.keys(contactTotals).length} subtitle="Medios con actividad" icon={Users} tone="orange" />
          <KpiCard title="Ticket promedio" value={formatCurrency(totalCursos ? totalVentas / totalCursos : 0)} subtitle="Por canal" icon={Target} tone="blue" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Distribución por medio</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={contactPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {contactPieData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => (metricType === 'ventas' ? formatCurrency(value) : value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Tendencia por medio</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={contactTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => (metricType === 'ventas' ? formatCurrency(value) : value)} />
                  <Legend />
                  {Object.keys(contactTotals).map((method, index) => (
                    <Line key={method} type="monotone" dataKey={method} stroke={COLORS[index % COLORS.length]} strokeWidth={2} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold">Detalle por canal</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Canal</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ventas</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cursos</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ticket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {Object.entries(contactTotals).map(([method, data]) => {
                  const Icon = getContactIcon(method);
                  const ticketPromedio = data.cursos ? data.ventas / data.cursos : 0;
                  return (
                    <tr key={method} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-500" />
                          {method}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(data.ventas)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{data.cursos.toLocaleString('es-MX')}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(ticketPromedio)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const CobranzaDashboard = () => {
    const totalCobranza = Object.values(totalesPorMes).reduce((sum, value) => sum + value, 0);
    const promedioMensual = cobranzaMonths.length ? totalCobranza / cobranzaMonths.length : 0;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard title="Total cobranza" value={formatCurrency(totalCobranza)} subtitle={`${cobranzaMonths.length} meses registrados`} icon={DollarSign} tone="blue" />
          <KpiCard title="Escuelas activas" value={cobranzaSchools.length} subtitle="Con cobranza registrada" icon={Building} tone="indigo" />
          <KpiCard title="Promedio mensual" value={formatCurrency(promedioMensual)} subtitle="Promedio por mes" icon={BarChart3} tone="purple" />
          <KpiCard title="Mejor mes" value={formatCurrency(Math.max(0, ...Object.values(totalesPorMes)))} subtitle="Pico de cobranza" icon={TrendingUp} tone="green" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Cobranza por mes</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cobranzaChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="total" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Ranking por escuela</h3>
            <div className="space-y-4">
              {Object.entries(totalesPorEscuela)
                .sort(([, a], [, b]) => b - a)
                .map(([school, total]) => {
                  const maxValue = Math.max(...Object.values(totalesPorEscuela), 1);
                  const pct = (total / maxValue) * 100;
                  return (
                    <div key={school}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{school}</span>
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(total)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold">Detalle mensual</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Escuela</th>
                  {cobranzaMonths.map((month) => (
                    <th key={month} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      {formatDateShort(month)}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {cobranzaSchools.map((school) => (
                  <tr key={school} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{school}</td>
                    {cobranzaMonths.map((month) => (
                      <td key={`${school}-${month}`} className="px-6 py-4 text-sm text-gray-900">
                        {formatCurrency(cobranzaData[school]?.[month] || 0)}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-sm font-semibold text-blue-700">{formatCurrency(totalesPorEscuela[school] || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const GrowthDashboard = () => {
    const currentYearDataRow = (crecimientoAnualData.rows || []).find((row) => String(row[0]) === String(selectedYear));
    const currentYearTotal = currentYearDataRow ? parseNumberFromString(currentYearDataRow[13]) : 0;
    const currentYearGrowth = currentYearDataRow ? currentYearDataRow[14] : '0%';

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard title={`Ventas ${selectedYear}`} value={formatCurrency(currentYearTotal)} subtitle="Total anual" icon={DollarSign} tone="green" />
          <KpiCard title="Crecimiento" value={String(currentYearGrowth)} subtitle="Vs año anterior" icon={Activity} tone="blue" />
          <KpiCard title="Meses con venta" value={`${crecimientoChartData.filter((d) => parseNumberFromString(d[selectedYear]) > 0).length} / 12`} subtitle="Meses activos" icon={Calendar} tone="orange" />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold">Tendencia anual</h3>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              {crecimientoYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={crecimientoChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                {crecimientoYears.map((year, index) => (
                  <Line key={year} type="monotone" dataKey={year} stroke={COLORS[index % COLORS.length]} strokeWidth={year === Number(selectedYear) ? 4 : 2} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const MapDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard title="CPs activos" value={mapEntries.length} subtitle={formatDateForDisplay(selectedMonth)} icon={MapPin} tone="red" />
        <KpiCard title="Registros" value={mapEntries.reduce((sum, [, value]) => sum + (value.count || 0), 0)} subtitle="Conteo de alumnos" icon={Users} tone="blue" />
        <KpiCard title="Ventas mapa" value={formatCurrency(mapEntries.reduce((sum, [, value]) => sum + (value.ventas || 0), 0))} subtitle="Monto asociado" icon={DollarSign} tone="green" />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Mapa simplificado por código postal</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">CP</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Registros</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ventas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {mapEntries.map(([cp, data]) => (
                <tr key={cp} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{cp}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{data.count}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(data.ventas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const AlertsPanel = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold">Alertas automáticas</h3>
        </div>
        <button onClick={() => setAlerts([])} className="text-xs text-gray-500 hover:text-gray-700">
          Limpiar
        </button>
      </div>
      {alerts.length === 0 ? (
        <p className="text-sm text-gray-500">No hay alertas en este momento.</p>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div key={`${alert.message}-${index}`} className="p-3 rounded-lg border border-yellow-200 bg-yellow-50">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                  <p className="text-xs text-gray-600 mt-1">{alert.details}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const ExecutiveDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Ventas totales" value={formatCurrency(executiveKPIs.totalVentas)} subtitle={`${executiveKPIs.ventasGrowth >= 0 ? '+' : ''}${executiveKPIs.ventasGrowth.toFixed(1)}% vs mes anterior`} icon={DollarSign} tone="blue" />
        <KpiCard title="Cursos vendidos" value={executiveKPIs.totalCursos.toLocaleString('es-MX')} subtitle={`${executiveKPIs.cursosGrowth >= 0 ? '+' : ''}${executiveKPIs.cursosGrowth.toFixed(1)}% vs mes anterior`} icon={ShoppingCart} tone="green" />
        <KpiCard title="Ticket promedio" value={formatCurrency(executiveKPIs.ticketPromedio)} subtitle="Por curso vendido" icon={Target} tone="purple" />
        <KpiCard title="Alertas activas" value={alerts.length} subtitle={`${schools.length} escuelas monitoreadas`} icon={Bell} tone="orange" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-lg shadow p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold">Desglose por vista</h3>
            <div className="flex flex-wrap gap-2">
              {['escuela', 'area', 'instructor', 'curso'].map((type) => (
                <button
                  key={type}
                  onClick={() => setViewType(type)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border',
                    viewType === type ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200'
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {viewData.map((row) => (
                  <tr key={row.nombre} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.nombre}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{metricType === 'ventas' ? formatCurrency(row.valor) : row.valor}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{row.areas || row.instructor || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <AlertsPanel />
      </div>
    </div>
  );

  const currentAgeDistribution = Object.entries(ageData[selectedMonth] || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard IDIP</h1>
              <p className="text-sm text-gray-500">Vista segura para compilar y operar mientras se reconstruye el archivo grande.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={connectionStatus} />
              {lastUpdated ? <span className="text-xs text-gray-500">Actualizado: {lastUpdated.toLocaleTimeString('es-MX')}</span> : null}
              <button
                onClick={() => fetchGoogleSheetsData(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className={cn('w-4 h-4', isManualRefresh && 'animate-spin')} />
                Actualizar
              </button>
            </div>
          </div>
          {errorMessage ? <p className="text-sm text-red-600 mt-2">Detalle: {errorMessage}</p> : null}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Mes</label>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                {months.map((month) => (
                  <option key={month} value={month}>{formatDateForDisplay(month)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Escuela</label>
              <select value={selectedSchool} onChange={(e) => setSelectedSchool(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                {schools.map((school) => (
                  <option key={school} value={school}>{school}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Área</label>
              <select value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                {areas.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Métrica</label>
              <select value={metricType} onChange={(e) => setMetricType(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                <option value="ventas">Ventas</option>
                <option value="cursos">Cursos</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Vista</label>
              <select value={viewType} onChange={(e) => setViewType(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                <option value="executive">Ejecutivo</option>
                <option value="contacto">Contacto</option>
                <option value="cobranza">Cobranza</option>
                <option value="crecimientoAnual">Crecimiento anual</option>
                <option value="mapa">Mapa</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">Cargando datos desde Google Sheets...</div>
        ) : null}

        {!isLoading && viewType === 'executive' ? <ExecutiveDashboard /> : null}
        {!isLoading && viewType === 'contacto' ? <ContactDashboard /> : null}
        {!isLoading && viewType === 'cobranza' ? <CobranzaDashboard /> : null}
        {!isLoading && viewType === 'crecimientoAnual' ? <GrowthDashboard /> : null}
        {!isLoading && viewType === 'mapa' ? <MapDashboard /> : null}

        {!isLoading && currentAgeDistribution.length > 0 ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Distribución de edades</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentAgeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        {!isLoading && viewType === 'executive' ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              {renderTrendIcon(executiveKPIs.ventasGrowth)}
              <h3 className="text-lg font-semibold">Resumen del mes</h3>
            </div>
            <p className="text-sm text-gray-600">
              En {formatDateForDisplay(selectedMonth)}, la operación suma {formatCurrency(executiveKPIs.totalVentas)} y {executiveKPIs.totalCursos.toLocaleString('es-MX')} cursos,
              con ticket promedio de {formatCurrency(executiveKPIs.ticketPromedio)}.
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default function App() {
  if (MODO === 'CONSEJO') {
    return <DashboardConsejo />;
  }

  return <Dashboard />;
}