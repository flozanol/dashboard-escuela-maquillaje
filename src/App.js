import React, { useState, useMemo, useEffect } from 'react';
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
  // Estados
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

  // Función de debug para instructores
  const debugInstructors = () => {
    console.log('\n🔍 ===== DEBUG INSTRUCTORES - INICIO =====');
    console.log('📊 Estructura completa de datos:', salesData);
    
    Object.entries(salesData).forEach(([month, monthData]) => {
      console.log(`\n📅 === MES: ${month} ===`);
      Object.entries(monthData).forEach(([school, schoolData]) => {
        console.log(`  🏫 Escuela: ${school}`);
        Object.entries(schoolData).forEach(([area, areaData]) => {
          console.log(`    📚 Área: ${area}`);
          Object.entries(areaData).forEach(([course, courseData]) => {
            console.log(`      📖 Curso: "${course}"`);
            console.log(`         👤 Instructor: "${courseData.instructor}" (tipo: ${typeof courseData.instructor})`);
            console.log(`         💰 Ventas: ${courseData.ventas}`);
            console.log(`         📊 Cursos: ${courseData.cursos}`);
          });
        });
      });
    });
    
    const todosLosInstructores = new Set();
    Object.values(salesData).forEach(monthData => {
      Object.values(monthData).forEach(schoolData => {
        Object.values(schoolData).forEach(areaData => {
          Object.values(areaData).forEach(courseData => {
            if (courseData.instructor) {
              todosLosInstructores.add(courseData.instructor.toString().trim());
            }
          });
        });
      });
    });
    
    console.log(`📊 Total de instructores únicos: ${todosLosInstructores.size}`);
    console.log('👥 Lista completa de instructores:');
    Array.from(todosLosInstructores).forEach((instructor, index) => {
      console.log(`   ${index + 1}. "${instructor}"`);
    });
    
    console.log('\n🔍 ===== DEBUG INSTRUCTORES - FIN =====\n');
  };

  // Función para parsear números
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

  // Función para transformar datos de Google Sheets
  const transformGoogleSheetsData = (rawData) => {
    const headers = rawData[0];
    const rows = rawData.slice(1);
    const transformedData = {};
    
    console.log('📊 Transformando datos de Google Sheets...');
    console.log('Headers:', headers);
    console.log('Total de filas:', rows.length);
    
    rows.forEach((row, index) => {
      const fecha = row[0];
      const escuela = row[1];
      const area = row[2];
      const curso = row[3];
      const ventas = row[4];
      const cursosVendidos = row[5];
      const instructor = row[6]; // Columna G (índice 6)
      
      console.log(`📝 Fila ${index + 2}:`, {
        fecha, escuela, area, curso, ventas, cursosVendidos,
        instructor: `"${instructor}"`
      });
      
      if (!fecha || !escuela || !area || !curso) {
        console.warn(`Fila ${index + 2} incompleta:`, row);
        return;
      }
      
      let instructorNormalizado;
      if (!instructor || instructor === '' || instructor === null || instructor === undefined) {
        instructorNormalizado = 'Sin asignar';
      } else {
        instructorNormalizado = instructor.toString()
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/[""'']/g, '"')
          .replace(/\u00A0/g, ' ');
        
        if (instructorNormalizado === '') {
          instructorNormalizado = 'Sin asignar';
        }
      }
      
      console.log(`👤 Instructor procesado: "${instructor}" -> "${instructorNormalizado}"`);
      
      const monthKey = fecha.substring(0, 7);
      
      if (!transformedData[monthKey]) transformedData[monthKey] = {};
      if (!transformedData[monthKey][escuela]) transformedData[monthKey][escuela] = {};
      if (!transformedData[monthKey][escuela][area]) transformedData[monthKey][escuela][area] = {};
      
      const ventasNum = parseNumberFromString(ventas);
      const cursosNum = parseNumberFromString(cursosVendidos) || 1;
      
      if (transformedData[monthKey][escuela][area][curso]) {
        transformedData[monthKey][escuela][area][curso].ventas += ventasNum;
        transformedData[monthKey][escuela][area][curso].cursos += cursosNum;
        
        const instructorExistente = transformedData[monthKey][escuela][area][curso].instructor;
        if (instructorExistente === 'Sin asignar' && instructorNormalizado !== 'Sin asignar') {
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
    
    console.log('✅ Datos transformados:', transformedData);
    return transformedData;
  };

  // Resto del código permanece igual...
  // [Aquí irían todas las demás funciones sin cambios]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard IDIP</h1>
        </div>

        {/* Navegación */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => setViewType("executive")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                viewType === "executive" 
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg" 
                  : "bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard Ejecutivo
            </button>
            
            <button
              onClick={debugInstructors}
              className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-sm hover:bg-yellow-200 font-medium"
            >
              Debug Instructores
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Dashboard funcionando</h2>
          <p>Haz clic en "Debug Instructores" para ver los logs en la consola.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
