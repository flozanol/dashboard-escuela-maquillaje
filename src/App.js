const CobranzaDashboard = () => {
    // Obtener todos los meses únicos de los datos de cobranza y ordenarlos cronológicamente
    const mesesCobranza = useMemo(() => {
      const meses = new Set();
      Object.values(cobranzaData).forEach(escuela => {
        Object.keys(escuela).forEach(mes => meses.add(mes));
      });
      
      // Convertir a array y ordenar cronológicamente
      return Array.from(meses).sort((a, b) => {
        const [mesA, añoA] = a.split('-');
        const [mesB, añoB] = b.split('-');
        return new Date(`${añoA}-${mesA}-01`) - new Date(`${añoB}-${mesB}-01`);
      });
    }, [cobranzaData]);

    // Calcular totales por mes
    const totalesPorMes = useMemo(() => {
      const totales = {};
      mesesCobranza.forEach(mes => {
        let totalMes = 0;
        Object.values(cobranzaData).forEach(escuela => {
          // Verificar que el valor sea numérico antes de sumar
          const valor = parseNumberFromString(escuela[mes]) || 0;
          totalMes += valor;
        });
        totales[mes] = totalMes;
      });
      return totales;
    }, [cobranzaData, mesesCobranza]);

    // Función para formatear el nombre del mes
    const formatMonthName = (monthKey) => {
      const [month, year] = monthKey.split('-');
      const date = new Date(`${year}-${month}-01`);
      return date.toLocaleDateString('es-ES', { month: 'long' });
    };

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Cobranza por Escuela
        </h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Escuela
                </th>
                {mesesCobranza.map(mes => (
                  <th key={mes} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {formatMonthName(mes)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(cobranzaData).map(([escuela, montos]) => (
                <tr key={escuela}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-500" />
                      {escuela}
                    </div>
                  </td>
                  {mesesCobranza.map(mes => (
                    <td key={`${escuela}-${mes}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${(parseNumberFromString(montos[mes])?.toLocaleString() || '0'}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Fila de totales */}
              <tr className="bg-gray-50 font-medium">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Total</td>
                {mesesCobranza.map(mes => (
                  <td key={`total-${mes}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${(totalesPorMes[mes] || 0).toLocaleString()}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };
