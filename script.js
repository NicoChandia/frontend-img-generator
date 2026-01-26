async function generar() {
  const prompt = document.getElementById("prompt").value;
  const img = document.getElementById("resultado");
  const loader = document.getElementById("loader");

  // Limpiamos estados anteriores
  img.src = "";
  img.alt = "Generando tu imagen... (esto puede tardar hasta 1 min)";
  loader.classList.remove("hidden"); 

  const backendUrl = "https://backend-img-generator.onrender.com/generar";

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    // Intentamos leer la respuesta como JSON
    const data = await response.json();

    if (response.ok && data.imagen) {
      // ÉXITO: El backend envió la propiedad 'imagen' con el base64
      img.src = data.imagen;
      img.alt = "Imagen generada ✅";
    } else {
      // ERROR CONTROLADO: El backend respondió pero con un error (ej: cuota agotada)
      // Usamos el mensaje que viene del backend o uno genérico
      const mensajeError = data.error || "No se pudo generar";
      img.alt = `❌ Error: ${mensajeError}`;
      console.error("Detalle del error:", mensajeError);
    }

  } catch (error) {
    // ERROR DE RED: El servidor está caído o tardó demasiado (Timeout)
    img.alt = "⚠️ Error de conexión. El servidor gratuito de Render podría estar despertando.";
    console.error("Error de fetch:", error);
  } finally {
    // Siempre ocultamos el spinner, pase lo que pase
    loader.classList.add("hidden");
  }
}