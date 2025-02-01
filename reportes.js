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
          // Suponemos que la segunda hoja corresponde a Reportes
          const sheet = workbook.Sheets[workbook.SheetNames[1]];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
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
  
  function processReportData(data) {
    if (!data || data.length < 2) {
      alert('El archivo no tiene el formato esperado.');
      return;
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    // Total de Reportes
    const totalReportes = rows.length;
    document.getElementById('totalCount').textContent = totalReportes;
    
    // Reportes por Skin (asumimos que la columna "Skin" está en el índice 1)
    const skinCounts = { SALVADOR: 0, GUATEMALA: 0, GENERAL: 0 };
    rows.forEach(row => {
      const skin = (row[1] || "").toUpperCase().trim();
      if (skinCounts.hasOwnProperty(skin)) {
        skinCounts[skin]++;
      }
    });
    document.getElementById('skinSalvador').textContent = skinCounts.SALVADOR;
    document.getElementById('skinGuatemala').textContent = skinCounts.GUATEMALA;
    document.getElementById('skinGeneral').textContent = skinCounts.GENERAL;
    
    // Generar gráficos para cada dimensión:
    // Asumimos los índices: Área (3), Categoría (5), Prioridad (8), Estado (9), Gestión (11), Proveedor (12)
    createChartFromColumn(rows, 3, 'chartArea', 'Área');
    createChartFromColumn(rows, 5, 'chartCategoria', 'Categoría');
    createChartFromColumn(rows, 8, 'chartPrioridad', 'Prioridad');
    createChartFromColumn(rows, 9, 'chartEstado', 'Estado');
    createChartFromColumn(rows, 11, 'chartGestion', 'Gestión');
    createChartFromColumn(rows, 12, 'chartProveedor', 'Proveedor');
    
    // (Opcional) Si no deseas mostrar la tabla, simplemente comenta o elimina la siguiente línea:
    // document.getElementById('reportTableContainer').innerHTML = createReportTableHTML(headers, rows);
  }
  
  function createChartFromColumn(rows, colIndex, canvasId, label) {
    const counts = {};
    rows.forEach(row => {
      const cellValue = row[colIndex];
      // Solo se cuentan las celdas que tengan un valor no vacío
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
  
  // (Opcional) Función para generar la tabla detallada, ya no se usará si no deseas mostrarla
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
  
  // Modo oscuro: cambiar tema al hacer clic en el botón y persistir la preferencia en localStorage
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
  