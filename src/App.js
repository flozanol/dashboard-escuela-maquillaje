// Componente principal del dashboard ejecutivo
const ExecutiveDashboard = () => {
  // Función para obtener datos de ventas por escuela y mes
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

  // Función para obtener datos de cursos por escuela y mes
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

  // Función para calcular totales por mes (ventas)
  const calculateMonthlySalesTotals = (salesData) => {
    const totals = {};
    months.forEach(month => {
      totals[month] = 0;
      schools.forEach(school => {
        totals[month] += salesData[school][month];
      });
    });
    return totals;
  };

  // Función para calcular totales por mes (cursos)
  const calculateMonthlyCoursesTotals = (coursesData) => {
    const totals = {};
    months.forEach(month => {
      totals[month] = 0;
      schools.forEach(school => {
        totals[month] += coursesData[school][month];
      });
    });
    return totals;
  };

  const salesBySchool = getSalesBySchoolAndMonth();
  const coursesBySchool = getCoursesBySchoolAndMonth();
  const monthlySalesTotals = calculateMonthlySalesTotals(salesBySchool);
  const monthlyCoursesTotals = calculateMonthlyCoursesTotals(coursesBySchool);

  return (
    <div className="space-y-6">
      {/* ... (todo el contenido previo se mantiene igual) ... */}

      {/* Tabla de Ventas por Escuela y Mes */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Ventas por Escuela (en pesos)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Escuela</th>
                {months.map(month => (
                  <th key={month} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {formatDateShort(month)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schools.map(school => (
                <tr key={school}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-500" />
                      {school}
                    </div>
                  </td>
                  {months.map(month => (
                    <td key={month} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${salesBySchool[school][month].toLocaleString()}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Fila de Totales */}
              <tr className="bg-gray-50 font-medium">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Total</td>
                {months.map(month => (
                  <td key={`total-${month}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${monthlySalesTotals[month].toLocaleString()}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla de Cursos por Escuela y Mes */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Cursos Vendidos por Escuela</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Escuela</th>
                {months.map(month => (
                  <th key={month} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {formatDateShort(month)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schools.map(school => (
                <tr key={school}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-500" />
                      {school}
                    </div>
                  </td>
                  {months.map(month => (
                    <td key={month} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {coursesBySchool[school][month].toLocaleString()}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Fila de Totales */}
              <tr className="bg-gray-50 font-medium">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Total</td>
                {months.map(month => (
                  <td key={`total-${month}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {monthlyCoursesTotals[month].toLocaleString()}
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
