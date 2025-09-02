async function generar() {
  const prompt = document.getElementById("prompt").value;
  const img = document.getElementById("resultado");
  const loader = document.getElementById("loader");

  img.src = "";
  img.alt = "Generando...";
  loader.classList.remove("hidden"); // mostrar spinner

  const backendUrl = "https://backend-img-generator.onrender.com/generar";

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      img.alt = "❌ Error al generar la imagen";
      loader.classList.add("hidden");
      return;
    }

    const data = await response.json();
    img.src = data.imagen;
    img.alt = "Imagen generada ✅";
  } catch (error) {
    img.alt = "⚠️ Error de conexión con el servidor";
  } finally {
    loader.classList.add("hidden"); // ocultar spinner
  }
}
