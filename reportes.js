// Escucha el submit del formulario para cargar el archivo Excel
document.getElementById('uploadForm').addEventListener('submit', function(event) {
  event.preventDefault();
  const file = document.getElementById('excelFile').files[0];
  const loading = document.getElementById('loading');
  
  if (file) {
    loading.style.display = 'block';
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // IMPORTANTE: ajusta el índice de la hoja según la posición real de tus datos
        const sheet = workbook.Sheets[workbook.SheetNames[1]]; 

        // Convertir la hoja a JSON (matriz de filas)
        // Cada elemento de 'jsonData' será un array de celdas: [colA, colB, colC, ...]
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Procesar la información
        processReportData(jsonData);

      } catch (error) {
        alert('Error al procesar el archivo: ' + error.message);
      } finally {
        loading.style.display = 'none';
      }
    };
    reader.readAsArrayBuffer(file);
  }
});

// Función principal para procesar la información de reportes
function processReportData(data) {
  if (!data || data.length < 2) {
    alert('El archivo no tiene el formato esperado.');
    return;
  }

  const rows = data.slice(1); // Omitimos encabezados
  let totalReportes = 0;

  // Objeto para contar skins
  const skinCounts = {
    SALVADOR: 0,
    GUATEMALA: 0,
    "SIN ASIGNAR": 0
  };

  rows.forEach(row => {
    // Verificar si la fila tiene datos
    if (row.length === 0 || row.every(cell => cell === undefined || cell === null || cell.toString().trim() === "")) {
      return; // Saltar filas vacías
    }

    // Contar reportes totales
    const valorColA = row[0];
    if (valorColA !== undefined && valorColA !== null && valorColA.toString().trim() !== "") {
      totalReportes++;
    }

    // Contar por Skin (columna B, índice 1)
    let valorColB = (row[1] || "").toString().trim().toUpperCase();

    console.log(`Procesando fila: ${row} | Valor Columna B: ${valorColB}`);

    if (valorColB === "SALVADOR") {
      skinCounts.SALVADOR++;
    } else if (valorColB === "GUATEMALA") {
      skinCounts.GUATEMALA++;
    } else {
      skinCounts["SIN ASIGNAR"]++;
    }
  });

  
  // Actualizar los valores en la página
  document.getElementById('totalCount').textContent = totalReportes;
  document.getElementById('skinSalvador').textContent = skinCounts.SALVADOR;
  document.getElementById('skinGuatemala').textContent = skinCounts.GUATEMALA;
  document.getElementById('skinGeneral').textContent = skinCounts["SIN ASIGNAR"];

  // ====== 3. Generar gráficos ======
  // Ajusta los índices de columnas según tu estructura real
  createChartFromColumn(rows, 3, 'chartArea', 'Área');
  createChartFromColumn(rows, 5, 'chartCategoria', 'Categoría');
  createChartFromColumn(rows, 8, 'chartPrioridad', 'Prioridad');
  createChartFromColumn(rows, 9, 'chartEstado', 'Estado');
  createChartFromColumn(rows, 11, 'chartGestion', 'Gestión');
  createChartFromColumn(rows, 12, 'chartProveedor', 'Proveedor');

  // (Opcional) Mostrar tabla en pantalla (descomentar si la deseas)
  // const headers = data[0]; 
  // document.getElementById('reportTableContainer').innerHTML = createReportTableHTML(headers, rows);
}

// Crea un gráfico de barras a partir de una columna dada
function createChartFromColumn(rows, colIndex, canvasId, label) {
  const counts = {};

  rows.forEach(row => {
    const cellValue = row[colIndex];
    // Solo se cuentan las celdas con valor no vacío
    if (cellValue !== undefined && cellValue !== null && cellValue.toString().trim() !== "") {
      counts[cellValue] = (counts[cellValue] || 0) + 1;
    }
  });

  const labels = Object.keys(counts);
  const data = Object.values(counts);

  const ctx = document.getElementById(canvasId).getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: data,
        backgroundColor: 'rgba(37, 99, 235, 0.5)',
        borderColor: '#2563eb',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => Number(value).toLocaleString()
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context => `${context.dataset.label}: ${Number(context.parsed.y).toLocaleString()}`
          }
        }
      }
    }
  });
}

// (Opcional) Genera HTML para tabla detallada
function createReportTableHTML(headers, rows) {
  let html = '<table><thead><tr>';
  headers.forEach(header => {
    html += `<th>${header}</th>`;
  });
  html += '</tr></thead><tbody>';
  rows.forEach(row => {
    html += '<tr>';
    row.forEach((cell, index) => {
      html += index === 0 ? `<td><strong>${cell}</strong></td>` : `<td>${cell}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

// ====== Modo oscuro ====== //
const darkModeToggle = document.getElementById('darkModeToggle');
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark-mode');
  darkModeToggle.textContent = '🌞 Cambiar a Modo Claro';
}
darkModeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  darkModeToggle.textContent = isDark ? '🌞 Cambiar a Modo Claro' : '🌙 Cambiar a Modo Oscuro';
  localStorage.setItem('darkMode', isDark);
});
