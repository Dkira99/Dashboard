// Manejo del formulario de carga
document.getElementById('uploadForm').addEventListener('submit', function (event) {
  event.preventDefault();
  const file = document.getElementById('excelFile').files[0];
  const loading = document.getElementById('loading');

  if (file) {
    loading.style.display = 'block';
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Seleccionar la hoja "Diferencia" o, en su defecto, la tercera hoja (índice 2)
        let sheet;
        if (workbook.SheetNames.includes("Diferencia")) {
          sheet = workbook.Sheets["Diferencia"];
        } else if (workbook.SheetNames.length >= 3) {
          sheet = workbook.Sheets[workbook.SheetNames[2]];
        } else {
          throw new Error("El archivo no contiene la hoja 'Diferencia'");
        }
        
        // Convertir la hoja a un arreglo de arreglos (JSON)
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

// Función para extraer una porción de columnas (tabla) de la data
function processTable(data, startCol, endCol) {
  return {
    headers: data[0].slice(startCol, endCol),
    rows: data.slice(1).map(row => row.slice(startCol, endCol))
  };
}

// Función principal para procesar los datos del Excel y generar las tablas y gráficos
function processExcelData(data) {
  if (!data || data.length < 2) {
    alert('El archivo no tiene el formato esperado.');
    return;
  }

  // Se asume que:
  // - La tabla 1 ocupa las columnas 0 a 8
  // - La tabla 2 ocupa las columnas 9 a 17
  const table1 = processTable(data, 0, 8);
  const table2 = processTable(data, 9, 17);

  // Limitar a las primeras 9 filas (exceptuando la cabecera)
  const rowsTable1 = table1.rows.slice(0, 9);
  const rowsTable2 = table2.rows.slice(0, 9);

  // Insertar las tablas en sus contenedores HTML
  document.getElementById('tableContainer1').innerHTML = createTableHTML(table1.headers, rowsTable1);
  document.getElementById('tableContainer2').innerHTML = createTableHTML(table2.headers, rowsTable2);

  // Extraer los datos de la última columna (Total) de ambas tablas
  const totalTable1 = rowsTable1.map(row => parseFloat(row[row.length - 1])); // Última columna de la tabla 1
  const totalTable2 = rowsTable2.map(row => parseFloat(row[row.length - 1])); // Última columna de la tabla 2

  // Extraer los nombres de las filas (suponiendo que la primera columna contiene los nombres)
  const rowNames = rowsTable1.map(row => row[0]); // Usar la primera columna de la tabla 1 para los nombres de filas

  // Crear el gráfico comparativo
  createComparativeChart(rowNames, totalTable1, totalTable2);
}

// Función para crear la tabla HTML a partir de encabezados y filas
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

// Función para crear el gráfico comparativo usando Chart.js
function createComparativeChart(labels, data1, data2) {
  const ctx = document.createElement('canvas');
  document.getElementById('chartsContainer').innerHTML = ''; // Limpiar contenedor de gráficos
  document.getElementById('chartsContainer').appendChild(ctx);

  new Chart(ctx, {
    type: 'bar', // Tipo de gráfico: barra (puedes cambiarlo a 'line', 'pie', etc.)
    data: {
      labels: labels, // Etiquetas: nombres de las filas
      datasets: [
        {
          label: 'Tabla 1',
          data: data1,
          backgroundColor: 'rgba(99, 132, 255, 0.2)',
          borderColor: 'rgba(99, 132, 255, 1)',
          borderWidth: 1
        },
        {
          label: 'Tabla 2',
          data: data2,
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
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
