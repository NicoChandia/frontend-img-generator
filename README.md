# Generador de imágenes con IA

Frontend del generador de imágenes: escribís una idea y se genera una imagen con **FLUX.1-schnell**.

**Demo:** https://nicochandia.github.io/frontend-img-generator/

## Arquitectura

```
GitHub Pages (este repo)  →  API Flask en Render  →  Hugging Face Inference Providers
HTML + CSS + JS              proxy: guarda el token,     provider="auto": elige un
sin frameworks               CORS solo para este dominio proveedor con el modelo activo
```

- **Frontend estático**: sin frameworks ni build. Estados de carga, error y resultado, historial de la sesión, descarga, accesible con teclado y lector de pantalla, modo claro/oscuro según el sistema.
- **Backend** ([backend-img-generator](https://github.com/NicoChandia/backend-img-generator)): el token de Hugging Face nunca llega al navegador.
- **Resiliencia**: cuando Hugging Face dejó de servir Stable Diffusion XL en su proveedor propio, se migró a selección automática de proveedor sin tocar el frontend.
- Al abrir la página se "despierta" el servidor de Render (plan gratuito) para que la primera imagen no tarde de más.

## Correr en local

Abrí `index.html` con un servidor estático (por ejemplo, la extensión Live Server de VS Code).
El backend solo acepta pedidos desde `nicochandia.github.io`, así que en local vas a ver el error de conexión: es esperado.
