// Escuchamos el evento "submit" del formulario
document.getElementById('uploadForm').addEventListener('submit', function(event) {
    event.preventDefault();
  
    // Obtenemos el archivo seleccionado
    const file = document.getElementById('excelFile').files[0];
    if (!file) {
      alert('Por favor, selecciona un archivo Excel primero.');
      return;
    }
  
    // Mostramos el indicador de carga
    const loadingIndicator = document.getElementById('loading');
    loadingIndicator.style.display = 'block';
  
    // Usamos FileReader para leer el contenido del Excel
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
        // Procesamos los datos
        processExcelData(jsonData);
      } catch (error) {
        console.error('Error al leer el archivo:', error);
        alert('Hubo un error al procesar el archivo. Revisa la consola para más detalles.');
      } finally {
        // Ocultamos el indicador de carga
        loadingIndicator.style.display = 'none';
      }
    };
  
    reader.readAsArrayBuffer(file);
  });
  
  
  // Función para extraer y limpiar los datos del Excel
  function processExcelData(data) {
    // Checamos si al menos hay 2 filas (cabeceras y al menos 1 fila de datos)
    if (!data || data.length < 2) {
      alert("El archivo no contiene datos suficientes o está vacío.");
      return;
    }
  
    const labels = [];
    const values = [];
  
    // data es un array de arrays. Recorremos cada fila.
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      // row[0] será la etiqueta; row[1] será el valor
      if (row.length >= 2) {
        labels.push(row[0]);
        const numericValue = parseFloat(row[1]);
        values.push(isNaN(numericValue) ? 0 : numericValue);
      }
    }
  
    console.log('Labels:', labels);
    console.log('Values:', values);
  
    if (labels.length === 0 || values.length === 0) {
      alert('No se encontraron datos válidos en el archivo.');
      return;
    }
  
    // Generamos la gráfica con los datos
    generateBarChart(labels, values);
  }
  
  
  // Función para generar la gráfica de barras
  function generateBarChart(labels, data) {
    // Obtenemos el contexto del canvas donde se dibujará la gráfica
    const canvas = document.getElementById('balanceChart');
    const ctx = canvas.getContext('2d');
  
    // Si ya existe una instancia previa de la gráfica, la destruimos
    if (window.balanceChartInstance) {
      window.balanceChartInstance.destroy();
    }
  
    // Creamos un degradado vertical:
    //   - de arriba (color más fuerte) a abajo (más transparente)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(26, 115, 232, 1)');   // Azul más fuerte
    gradient.addColorStop(1, 'rgba(26, 115, 232, 0.2)'); // Azul clarito
  
    // Creamos la nueva instancia del gráfico
    window.balanceChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Dayana',
          data: data,
          backgroundColor: gradient,
          borderColor: '#0056b3',  // Azul oscuro para el borde
          borderWidth: 2,
          // Opciones de las barras
          borderRadius: 6,         // Bordes redondeados
          borderSkipped: false,    // Borde superior desactivado
          barPercentage: 0.7,      // Grosor de la barra
          categoryPercentage: 0.7
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
            // Ajusta stepSize según tus datos; si tu valor es chico, pon stepSize más pequeño.
            ticks: {
              beginAtZero: true,
              stepSize: 5000,
              font: {
                size: 14
              },
              color: '#333'
            },
            grid: {
              color: 'rgba(0,0,0,0.1)'
            }
          },
          x: {
            ticks: {
              font: {
                size: 14
              },
              color: '#333'
            },
            grid: {
              display: false
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: {
                size: 16
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(26, 115, 232, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            bodyFont: {
              size: 14
            },
            titleFont: {
              size: 16
            }
          }
        }
      }
    });
  }
  