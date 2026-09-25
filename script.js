// URL del backend (Flask en Render)
const API = "https://backend-img-generator.onrender.com"

// Si el servidor no responde en este tiempo, se cancela el pedido
const TIMEOUT_MS = 120_000
const MAX_HISTORY = 8

const EXAMPLES = [
  "a red apple on a wooden table, soft morning light, photo",
  "patagonian landscape at sunset, snowy mountains, lake, cinematic",
  "a cute robot teaching programming to kids, pixar style",
  "isometric illustration of a small fruit packing factory",
]

const $ = (id) => document.getElementById(id)

const form = $("form")
const promptInput = $("prompt")
const submitBtn = $("submit")
const count = $("count")

const states = {
  empty: $("state-empty"),
  loading: $("state-loading"),
  error: $("state-error"),
  result: $("state-result"),
}

const history = [] // { prompt, url, seconds }
let lastPrompt = ""
let timerId = null
let generating = false

// ---------- Estado del servidor ----------
// Render (plan gratuito) apaga el servidor si no se usa. Al abrir la página
// lo "despertamos" para que la primera imagen no tarde de más.
function setServerStatus(state, text) {
  $("server-status").dataset.state = state
  $("server-status-text").textContent = text
}

async function wakeServer() {
  setServerStatus("waking", "Despertando el servidor…")
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 90_000)
  try {
    const res = await fetch(API + "/", { signal: controller.signal, cache: "no-store" })
    if (!res.ok) throw new Error()
    setServerStatus("ready", "Servidor listo")
  } catch {
    setServerStatus("down", "El servidor no responde. Probá en un rato.")
  } finally {
    clearTimeout(t)
  }
}

// ---------- UI ----------
function show(name) {
  for (const [key, el] of Object.entries(states)) el.hidden = key !== name
}

function formatSeconds(ms) {
  return (ms / 1000).toFixed(1).replace(".", ",") + " s"
}

function startTimer() {
  const start = performance.now()
  const timer = $("timer")
  const hint = $("loading-hint")
  timer.textContent = "0,0 s"
  hint.textContent = "Suele tardar menos de 15 segundos."
  timerId = setInterval(() => {
    const elapsed = performance.now() - start
    timer.textContent = formatSeconds(elapsed)
    if (elapsed > 20_000) {
      hint.textContent = "El servidor gratuito puede tardar hasta un minuto en despertar. Ya casi…"
    }
  }, 100)
  return start
}

function stopTimer() {
  clearInterval(timerId)
  timerId = null
}

function setGenerating(value) {
  generating = value
  submitBtn.disabled = value
  submitBtn.querySelector(".btn-label").textContent = value ? "Generando…" : "Generar"
  form.setAttribute("aria-busy", String(value))
}

function showResult(item) {
  $("result-img").src = item.url
  $("result-img").alt = `Imagen generada a partir de: ${item.prompt}`
  $("result-prompt").textContent = `“${item.prompt}”`
  $("result-meta").textContent = `Generada en ${formatSeconds(item.seconds * 1000)} · FLUX.1-schnell`
  $("download").href = item.url
  $("download").download = slug(item.prompt) + ".png"
  show("result")
  renderHistory(item)
}

function showError(message) {
  $("error-text").textContent = message
  show("error")
  $("retry").focus()
}

function slug(text) {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "imagen"
  )
}

function renderHistory(current) {
  const list = $("history")
  list.innerHTML = ""
  $("history-section").hidden = history.length < 2
  history.forEach((item) => {
    const li = document.createElement("li")
    const btn = document.createElement("button")
    btn.type = "button"
    btn.title = item.prompt
    btn.setAttribute("aria-label", `Ver imagen: ${item.prompt}`)
    btn.setAttribute("aria-current", String(item === current))
    const img = document.createElement("img")
    img.src = item.url
    img.alt = ""
    btn.append(img)
    btn.addEventListener("click", () => showResult(item))
    li.append(btn)
    list.append(li)
  })
}

// El backend devuelve la imagen en base64. La pasamos a un Blob para que
// la descarga y el historial no guarden cadenas de 1 MB en el DOM.
async function dataUrlToObjectUrl(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob()
  return URL.createObjectURL(blob)
}

// ---------- Generar ----------
async function generate(prompt) {
  if (generating) return
  prompt = prompt.trim()
  if (!prompt) {
    promptInput.focus()
    return
  }

  lastPrompt = prompt
  setGenerating(true)
  show("loading")
  // En pantallas chicas el resultado queda debajo del formulario: lo traemos a la vista
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches
  document.querySelector(".stage").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" })
  const start = startTimer()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(API + "/generar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    })

    let data = {}
    try {
      data = await res.json()
    } catch {
      // respuesta sin JSON (por ejemplo, un error del proxy de Render)
    }

    if (!res.ok || !data.imagen) {
      throw new Error(data.error || `El servidor respondió con error ${res.status}.`)
    }

    const item = {
      prompt,
      url: await dataUrlToObjectUrl(data.imagen),
      seconds: (performance.now() - start) / 1000,
    }
    history.unshift(item)
    const removed = history.splice(MAX_HISTORY)
    removed.forEach((old) => URL.revokeObjectURL(old.url))
    setServerStatus("ready", "Servidor listo")
    showResult(item)
  } catch (err) {
    if (err.name === "AbortError") {
      showError("El servidor tardó demasiado en responder. Probá de nuevo.")
    } else if (err instanceof TypeError) {
      showError("No se pudo conectar con el servidor. Puede estar despertando: esperá unos segundos y reintentá.")
    } else {
      showError(err.message)
    }
  } finally {
    clearTimeout(timeout)
    stopTimer()
    setGenerating(false)
  }
}

// ---------- Eventos ----------
form.addEventListener("submit", (e) => {
  e.preventDefault()
  generate(promptInput.value)
})

promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    form.requestSubmit()
  }
})

promptInput.addEventListener("input", () => {
  count.textContent = promptInput.value.length
})

$("retry").addEventListener("click", () => generate(lastPrompt))

$("copy").addEventListener("click", async (e) => {
  const btn = e.currentTarget
  try {
    await navigator.clipboard.writeText(lastPrompt)
    btn.textContent = "¡Copiado!"
  } catch {
    btn.textContent = "No se pudo copiar"
  }
  setTimeout(() => (btn.textContent = "Copiar prompt"), 2000)
})

for (const text of EXAMPLES) {
  const li = document.createElement("li")
  const btn = document.createElement("button")
  btn.type = "button"
  btn.className = "chip"
  btn.textContent = text
  btn.addEventListener("click", () => {
    promptInput.value = text
    count.textContent = text.length
    promptInput.focus()
  })
  li.append(btn)
  $("examples").append(li)
}

show("empty")
wakeServer()
