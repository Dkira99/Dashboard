// Evento para procesar el archivo Excel al enviar el formulario
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
        // Se procesa la primera hoja
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

// Objeto para almacenar referencias a los gráficos creados
const charts = {
  salvador: [],
  guatemala: [],
  totals: []
};

/**
 * Función que procesa los datos del Excel.
 * Separa las tablas usando la columna en blanco de la cabecera.
 */
function processExcelData(data) {
  // Validamos que existan datos y al menos una fila de cabecera
  if (!data || data.length === 0) {
    alert('El archivo no tiene el formato esperado');
    return;
  }

  const headerRow = data[0];
  let blankColIndex = -1;
  // Buscamos la primera columna en la cabecera que esté vacía (separador)
  for (let i = 0; i < headerRow.length; i++) {
    if (!headerRow[i] || headerRow[i].toString().trim() === "") {
      blankColIndex = i;
      break;
    }
  }
  if (blankColIndex === -1) {
    alert("No se encontró la columna en blanco que separa las tablas.");
    return;
  }

  // Extraemos las dos tablas:
  // - La primera se compone de las columnas de 0 a (blankColIndex - 1)
  // - La segunda se compone de las columnas de (blankColIndex + 1) a fin
  const salvadorTable = extractTable(data, 0, blankColIndex);
  const guatemalaTable = extractTable(data, blankColIndex + 1, headerRow.length);

  // Referencias a los contenedores donde se insertarán las tablas y gráficos
  const tableContainer1 = document.getElementById('tableContainer1');
  const tableContainer2 = document.getElementById('tableContainer2');
  const salvadorCharts = document.getElementById('salvadorCharts');
  const guatemalaCharts = document.getElementById('guatemalaCharts');

  // Limpiar contenido previo y destruir gráficos anteriores
  [tableContainer1, tableContainer2, salvadorCharts, guatemalaCharts].forEach(container => container.innerHTML = '');
  Object.values(charts).flat().forEach(chart => {
    if (chart instanceof Chart) chart.destroy();
  });
  Object.keys(charts).forEach(key => charts[key] = []);

  // Insertamos las tablas en el HTML
  tableContainer1.innerHTML = createTableHTML(salvadorTable.headers, salvadorTable.rows);
  tableContainer2.innerHTML = createTableHTML(guatemalaTable.headers, guatemalaTable.rows);

  // En cada tabla se asume:
  // • La primera columna es la etiqueta.
  // • La última columna es el total.
  // • Las columnas intermedias son promociones.
  // Se calculan dinámicamente según la cantidad de columnas de cada tabla.
  
  // Para la tabla de El Salvador:
  const salvadorTotalCol = salvadorTable.headers.length - 1;
  generateTotalCharts(salvadorTable, 'salvador', salvadorTotalCol, salvadorCharts);
  if (salvadorTable.headers.length > 2) {
    generatePromotionCharts(salvadorTable, 'salvador', 1, salvadorTable.headers.length - 2, salvadorCharts);
  }
  
  // Para la tabla de Guatemala:
  const guatemalaTotalCol = guatemalaTable.headers.length - 1;
  console.log("Total Column Guatemala:", guatemalaTable.rows.map(row => row[guatemalaTotalCol]));
  generateTotalCharts(guatemalaTable, 'guatemala', guatemalaTotalCol, guatemalaCharts);
  if (guatemalaTable.headers.length > 2) {
    generatePromotionCharts(guatemalaTable, 'guatemala', 1, guatemalaTable.headers.length - 2, guatemalaCharts);
  }
}

/**
 * Extrae una tabla de la matriz de datos, desde startCol (inclusive)
 * hasta endCol (exclusivo). La primera fila se usa como cabecera y se
 * incluyen solo las filas que tengan al menos una celda con contenido.
 */
function extractTable(data, startCol, endCol) {
  const headers = data[0].slice(startCol, endCol);
  const rows = [];

  // Recorremos las filas (omitiendo la cabecera)
  for (let i = 1; i < data.length; i++) {
    // Extraemos el fragmento de la fila que corresponde a la tabla
    const rowSlice = data[i].slice(startCol, endCol);
    // Se incluye la fila solo si tiene al menos una celda no vacía
    if (rowSlice.some(cell => cell !== null && cell !== undefined && cell.toString().trim() !== '')) {
      rows.push(rowSlice);
    }
  }
  return { headers, rows };
}

/**
 * Genera los gráficos de promociones. Recorre las columnas indicadas
 * (desde startCol hasta endCol, que corresponden a las promociones).
 */
function generatePromotionCharts(table, country, startCol, endCol, container) {
  const color = country === 'salvador' ? '#2563eb' : '#10b981';
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

/**
 * Genera el gráfico total usando la columna indicada.
 */
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

/**
 * Crea una tabla HTML a partir de los encabezados y filas.
 */
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

/**
 * Crea un gráfico de barras usando Chart.js.
 */
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
