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
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          processExcelData(jsonData);
        } catch (error) {
          alert('Error al procesar el archivo: ' + error.message);
        } finally {
          loading.style.display = 'none';
        }
      };
      reader.readAsArrayBuffer(file);
    }
  });
  
  const charts = {
    salvador: [],
    guatemala: [],
    totals: []
  };
  
  function processExcelData(data) {
    const tableContainer1 = document.getElementById('tableContainer1');
    const tableContainer2 = document.getElementById('tableContainer2');
    const salvadorCharts = document.getElementById('salvadorCharts');
    const guatemalaCharts = document.getElementById('guatemalaCharts');
  
    // Limpiar contenido previo
    [tableContainer1, tableContainer2, salvadorCharts, guatemalaCharts].forEach(container => container.innerHTML = '');
  
    // Destruir gráficos anteriores
    Object.values(charts).flat().forEach(chart => {
      if (chart instanceof Chart) chart.destroy();
    });
    Object.keys(charts).forEach(key => charts[key] = []);
  
    // Validar estructura mínima del archivo
    if (!data || data.length < 17) {
      alert('El archivo no tiene el formato esperado');
      return;
    }
  
    // Procesar datos para cada tabla
    const salvadorTable = processTable(data, 0, 8);
    const guatemalaTable = processTable(data, 9, 17);
  
    // Insertar tablas
    tableContainer1.innerHTML = createTableHTML(salvadorTable.headers, salvadorTable.rows);
    tableContainer2.innerHTML = createTableHTML(guatemalaTable.headers, guatemalaTable.rows);
  
    // Generar gráficos
    generateTotalCharts(salvadorTable, 'salvador', 7, salvadorCharts);
    generatePromotionCharts(salvadorTable, 'salvador', 1, 6, salvadorCharts);
  
    generateTotalCharts(guatemalaTable, 'guatemala', 7, guatemalaCharts);
    generatePromotionCharts(guatemalaTable, 'guatemala', 1, 6, guatemalaCharts);
  }
  
  function processTable(data, startCol, endCol) {
    return {
      headers: data[0].slice(startCol, endCol),
      rows: data.slice(1, 17).map(row => row.slice(startCol, endCol))
    };
  }
  
  function generatePromotionCharts(table, country, startCol, endCol, container) {
    const color = country === 'salvador' ? '#2563eb' : '#10b981';
  
    // Contenedor para gráficos de promociones
    const promotionContainer = document.createElement('div');
    promotionContainer.className = 'promotion-charts';
    container.appendChild(promotionContainer);
  
    for (let colIndex = startCol; colIndex <= endCol; colIndex++) {
      const promotionData = table.rows
        .map(row => ({
          label: row[0],
          value: parseFloat(row[colIndex]) || 0
        }))
        .filter(item => item.value > 0);
  
      if (promotionData.length > 0) {
        const chartId = `${country}Promo${colIndex}`;
        const chartTitle = `${table.headers[colIndex]} - ${country.toUpperCase()}`;
  
        const chartHTML = `
          <div class="chart-box">
            <h3>${chartTitle}</h3>
            <canvas id="${chartId}"></canvas>
          </div>
        `;
        promotionContainer.insertAdjacentHTML('beforeend', chartHTML);
  
        const newChart = createBarChart(
          chartId,
          promotionData.map(d => d.label),
          promotionData.map(d => d.value),
          table.headers[colIndex],
          color
        );
        charts[country].push(newChart);
      }
    }
  }
  
  function generateTotalCharts(table, country, totalColIndex, container) {
    const color = country === 'salvador' ? '#1e3a8a' : '#059669';
    const currency = country === 'salvador' ? 'USD' : 'GTQ';
  
    const totalData = table.rows
      .map(row => ({
        label: row[0],
        value: parseFloat(row[totalColIndex]) || 0
      }))
      .filter(item => item.value > 0);
  
    if (totalData.length > 0) {
      const chartId = `${country}Total`;
      const chartTitle = `TOTAL ${country.toUpperCase()} (${currency})`;
  
      const chartHTML = `
        <div class="chart-box full-width">
          <h2>${chartTitle}</h2>
          <canvas id="${chartId}"></canvas>
        </div>
      `;
      container.insertAdjacentHTML('afterbegin', chartHTML);
  
      const newChart = createBarChart(
        chartId,
        totalData.map(d => d.label),
        totalData.map(d => d.value),
        `Total ${currency}`,
        color
      );
      charts.totals.push(newChart);
    }
  }
  
  function createTableHTML(headers, rows) {
    return `
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              ${row.map((cell, index) => `<td>${index === 0 ? `<strong>${cell}</strong>` : cell}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  
  function createBarChart(canvasId, labels, data, labelText, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: labelText,
          data: data,
          backgroundColor: color + '80',
          borderColor: color,
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
              callback: function(value) {
                return Number(value).toLocaleString();
              }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${Number(context.parsed.y).toLocaleString()}`;
              }
            }
          }
        }
      }
    });
  }
  
  // Modo oscuro: cambiar tema al hacer clic en el botón
  const darkModeToggle = document.getElementById('darkModeToggle');
  darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    darkModeToggle.textContent = document.body.classList.contains('dark-mode')
      ? '🌞 Cambiar a Modo Claro'
      : '🌙 Cambiar a Modo Oscuro';
  });
  