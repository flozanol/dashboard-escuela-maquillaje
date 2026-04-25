import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Star, AlertTriangle, Download } from 'lucide-react';

const CobranzaAnalytics = ({ datosCobranza, modo }) => {
  // Si no han llegado los datos de Google Sheets, no mostramos nada
  if (!datosCobranza) return null;

  // Función para descargar los archivos Excel (CSV)
  const descargarCSV = (tipo) => {
    const lista = tipo === 'CUMPLE' ? datosCobranza.cumpleañeros : datosCobranza.morososCriticos;
    const headers = "Nombre,CURP,Modalidad\n";
    const rows = lista.map(a => `${a.nombre},${a.curp},${a.modalidad}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `IDIP_${tipo}_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  return (
    <div className="mt-10 p-6 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
      <h2 className="text-2xl font-black text-gray-800 uppercase mb-6">🚀 Módulo de Cobranza Mundial</h2>
      
      {/* 1. SECCIÓN OPERATIVA: Aparece solo en Polanco/Querétaro */}
      {modo === 'ESCUELA' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Tarjeta Cumpleaños */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-yellow-400">
            <div className="flex items-center gap-3 mb-4">
              <Star className="text-yellow-500" />
              <h3 className="font-bold text-gray-700 uppercase text-xs">Marketing: Cumpleañeros (CURP)</h3>
            </div>
            <button onClick={() => descargarCSV('CUMPLE')} className="w-full bg-yellow-500 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-yellow-600 transition-all">
              <Download size={16} /> BAJAR LISTA DE REGALOS ({datosCobranza.cumpleañeros.length})
            </button>
          </div>

          {/* Tarjeta Morosos */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-red-500">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-500" />
              <h3 className="font-bold text-gray-700 uppercase text-xs">Cobranza: Morosidad Crítica</h3>
            </div>
            <button onClick={() => descargarCSV('MOROSOS')} className="w-full bg-red-500 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-600 transition-all">
              <Download size={16} /> BAJAR LISTA RECUPERACIÓN ({datosCobranza.morososCriticos.length})
            </button>
          </div>
        </div>
      )}

      {/* 2. SECCIÓN DIRECCIÓN: Gráfico de Calidad de Ingreso */}
      <div className="bg-white p-8 rounded-3xl shadow-sm">
        <h3 className="font-bold mb-6 text-gray-500 uppercase text-[10px] tracking-widest">Salud Financiera: Adelantado vs Atrasado</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={datosCobranza.stats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{fontSize: 10, fontWeight: 'bold'}} />
              <YAxis tick={{fontSize: 10}} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="adelantado" name="Adelantado" stackId="1" stroke="#86C332" fill="#86C332" fillOpacity={0.6} />
              <Area type="monotone" dataKey="aTiempo" name="A Tiempo" stackId="1" stroke="#6D6E71" fill="#6D6E71" fillOpacity={0.6} />
              <Area type="monotone" dataKey="atrasado" name="Atrasado" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default CobranzaAnalytics;