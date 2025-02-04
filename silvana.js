/**********************
 * Variables globales
 **********************/
let barChartInstance;
let pieChartInstance;

/**************************************************************
 * Escuchar el submit del formulario y procesar el archivo
 **************************************************************/
document.getElementById('uploadForm').addEventListener('submit', function(event) {
  event.preventDefault();

  const fileInput = document.getElementById('excelFile');
  const file = fileInput.files[0];
  if (!file) {
    alert("Por favor, selecciona un archivo Excel.");
    return;
  }

  // Mostrar indicador de carga
  const loadingIndicator = document.getElementById('loading');
  loadingIndicator.style.display = 'block';

  // Usar FileReader para leer el archivo
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      // Parsear el contenido binario del Excel
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      // Tomar la primera hoja del Excel
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convertir la hoja en un array de arrays (header: 1 => primera fila como array)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Procesar los datos
      processExcelData(jsonData);

    } catch (error) {
      console.error("Error al procesar el archivo:", error);
      alert('Error al leer el archivo: ' + error.message);
    } finally {
      // Ocultar el indicador de carga
      loadingIndicator.style.display = 'none';
    }
  };
  
  reader.readAsArrayBuffer(file);
});

/**************************************************************
 * Función para procesar el contenido del Excel en arrays
 **************************************************************/
function processExcelData(data) {
  // Revisar si hay al menos 2 filas (encabezados + 1 fila de datos)
  if (!data || data.length < 2) {
    alert("El archivo no contiene datos suficientes.");
    return;
  }

  // Extraer la primera fila como encabezados
  const headers = data[0];
  console.log("Encabezados detectados:", headers);

  // Buscar índice de las columnas "Fecha", "Egresos" y "Persona"
  const fechaIndex = headers.indexOf("Fecha");
  const egresosIndex = headers.indexOf("Egresos");
  const personaIndex = headers.indexOf("Persona");

  console.log("Indices de columnas:", { fechaIndex, egresosIndex, personaIndex });

  // Si no se encuentran, se detiene el proceso
  if (fechaIndex === -1 || egresosIndex === -1 || personaIndex === -1) {
    alert("El archivo debe contener las columnas 'Fecha', 'Egresos' y 'Persona' en la primera fila.");
    return;
  }

  /**************************************************************
   * 1. Gráfico de barras: sumamos Egresos por Fecha
   **************************************************************/
  const acumuladosPorFecha = {};

  // Recorremos desde la segunda fila (i=1), sumando los egresos por fecha
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue; // fila vacía

    const fecha = row[fechaIndex];
    const egreso = parseFloat(row[egresosIndex]) || 0;

    if (!fecha) continue; // sin fecha, no lo contamos

    if (acumuladosPorFecha[fecha]) {
      acumuladosPorFecha[fecha] += egreso;
    } else {
      acumuladosPorFecha[fecha] = egreso;
    }
  }

  // Ordenar fechas y armar los arrays
  const fechas = Object.keys(acumuladosPorFecha).sort((a, b) => new Date(a) - new Date(b));
  const totalesFecha = fechas.map(fecha => acumuladosPorFecha[fecha]);

  console.log("Fechas:", fechas);
  console.log("Totales Egresos por Fecha:", totalesFecha);

  generateBarChart(fechas, totalesFecha);

  /**************************************************************
   * 2. Gráfico circular: contaremos la FRECUENCIA de cada persona
   **************************************************************/
  const frecuenciaPorPersona = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue; // fila vacía

    const persona = row[personaIndex];
    // Omitimos filas donde no haya persona
    if (!persona) continue;

    // En lugar de sumar, simplemente contamos UNA vez
    if (frecuenciaPorPersona[persona]) {
      frecuenciaPorPersona[persona]++;
    } else {
      frecuenciaPorPersona[persona] = 1;
    }
  }

  const personas = Object.keys(frecuenciaPorPersona);
  const totalesPersona = personas.map(p => frecuenciaPorPersona[p]);

  console.log("Personas:", personas);
  console.log("Frecuencias:", totalesPersona);

  // Generar el gráfico doughnut (basado en la cantidad de apariciones)
  generatePieChart(personas, totalesPersona);
}

/**************************************************************
 * Función para generar el gráfico de barras (Egresos x Fecha)
 **************************************************************/
function generateBarChart(labels, data) {
  const canvas = document.getElementById('egresosChart');
  const ctx = canvas.getContext('2d');

  // Si existe un gráfico anterior, lo destruimos
  if (barChartInstance) {
    barChartInstance.destroy();
  }

  // Crear un degradado vertical para las barras
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#1E88E5');                  // Azul fuerte
  gradient.addColorStop(1, 'rgba(75, 192, 192, 0.2)');  // Turquesa suave

  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Total Egresos',
        data: data,
        backgroundColor: gradient,
        borderColor: '#1E88E5',
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1500,
        easing: 'easeInOutQuart'
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              // Formatear el valor con separadores de miles
              return value.toLocaleString();
            },
            color: '#333'
          },
          grid: {
            color: 'rgba(0,0,0,0.1)'
          }
        },
        x: {
          ticks: {
            color: '#333'
          },
          grid: {
            display: false
          }
        }
      },
      plugins: {
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          titleColor: '#fff',
          bodyColor: '#fff',
          callbacks: {
            label: function(context) {
              return 'Total Egresos: ' + Number(context.parsed.y).toLocaleString();
            }
          }
        },
        legend: {
          display: false
        }
      }
    }
  });
}

/**************************************************************
 * Función para generar el gráfico doughnut (FRECUENCIA x Persona)
 **************************************************************/
function generatePieChart(labels, data) {
  const canvas = document.getElementById('depositosPieChart');
  const ctx = canvas.getContext('2d');

  // Si existe un gráfico anterior, lo destruimos
  if (pieChartInstance) {
    pieChartInstance.destroy();
  }

  pieChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        // Usamos paleta: Azul, Teal, Morado
        backgroundColor: getBlueTealPurple(labels.length),
        // Añadimos bordes blancos para resaltar los sectores
        borderColor: '#fff',
        borderWidth: 2,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '50%', // Hace la dona más grande
      animation: {
        duration: 1500,
        easing: 'easeInOutQuart'
      },
      plugins: {
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          titleColor: '#fff',
          bodyColor: '#fff',
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const currentValue = context.raw;
              const percentage = ((currentValue / total) * 100).toFixed(2);
              return `${context.label}: ${percentage}%`;
            }
          }
        },
        legend: {
          position: 'bottom',
          labels: {
            color: '#333'
          }
        }
      }
    }
  });
}

/**************************************************************
 * Función para generar la paleta: Azul, Teal, Morado
 **************************************************************/
function getBlueTealPurple(n) {
  // Tres colores en una secuencia cíclica
  const colorPalette = [
    '#1E88E5',               // Azul fuerte
    'rgba(75, 192, 192, 0.8)', // Teal
    '#7E57C2'               // Morado
  ];

  const result = [];
  for (let i = 0; i < n; i++) {
    result.push(colorPalette[i % colorPalette.length]);
  }
  return result;
}
