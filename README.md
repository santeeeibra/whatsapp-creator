# 🚀 WhatsApp Creator — Video to Sticker & GIF (1 Click)

Convertí videos de **X (Twitter)**, **TikTok** o archivos locales a **Stickers y GIFs animados optimizados para WhatsApp** con un solo clic y sin gastar un centavo de servidor.

---

## ✨ Características Principales

1. **Extractor Automático Multi-Plataforma**:
   - **X (Twitter)**: Extrae el stream directo MP4 a través de la API pública de FxTwitter.
   - **TikTok**: Descarga el video en máxima calidad y sin marca de agua vía TikWM.
   - **Videos Locales**: Drag & Drop o selector de archivos (.mp4, .webm, .mov) para convertir cualquier video de tu galería o computadora.
2. **Editor & Recortador Preciso**:
   - Reproductor integrado con sliders de inicio y fin (segundos exactos).
   - Detección inteligente de duración para WhatsApp (recomienda ≤ 5 segundos para stickers ultralivianos).
   - Selector de formato: **Sticker 1:1** (cuadrado recortado), **GIF Completo** (aspect ratio original), o **Foto Fija** (captura PNG).
   - Selector de FPS: 10 FPS (modo liviano < 500 KB) o 15 FPS (máxima fluidez).
3. **Conversión 100% Client-Side (Cero costo de servidor)**:
   - El procesamiento de fotogramas y la cuantización de color se realizan en el navegador del usuario usando HTML5 Canvas y `gifenc`.
   - No consume CPU ni memoria en Vercel, evitando límites de tiempo de ejecución (timeouts) y costos de infraestructura.
4. **Proxy Integrado de Video**:
   - Ruta `/api/proxy-video` que resuelve las restricciones de CORS para permitir la lectura segura de fotogramas sin bloquear el navegador.
5. **Compartir en WhatsApp con 1 Click**:
   - **En Celular (Android / iOS)**: Usa la `Web Share API` nativa (`navigator.share`) para abrir directamente WhatsApp y enviar el archivo de inmediato al contacto o grupo seleccionado.
   - **En Computadora (PC / Mac)**: Botón **Copiar Imagen** al portapapeles para pegar con `Ctrl + V` en cualquier chat de WhatsApp Web.
   - **Descarga directa**: Descarga el archivo `.gif` o `.png` generado en tu dispositivo.

---

## 🛠️ Cómo Probarlo en Tu Computadora

1. Abrí una terminal en la carpeta del proyecto:
   ```bash
   cd "D:\whatsapp creator"
   ```
2. Iniciá el servidor de desarrollo (usamos el puerto 3001 si el 3000 está ocupado):
   ```bash
   npm run dev -- -p 3001
   ```
3. Abrí tu navegador en:
   **[http://localhost:3001](http://localhost:3001)**

---

## 🌐 Cómo Desplegarlo en Vercel GRATIS (Sin Dominio Propio)

1. **Creá un repositorio en GitHub**:
   - Entrá a [github.com/new](https://github.com/new) y creá un repositorio nuevo (ejemplo: `whatsapp-creator`).
   - En tu terminal ejecutá:
     ```bash
     git remote add origin https://github.com/TU-USUARIO/whatsapp-creator.git
     git branch -M main
     git push -u origin main
     ```
2. **Conectá Vercel**:
   - Entrá a [vercel.com](https://vercel.com) e iniciá sesión con tu cuenta de GitHub.
   - Hacé clic en **"Add New Project"** y seleccioná el repositorio `whatsapp-creator`.
   - Hacé clic en **"Deploy"**.
3. **¡Listo!** Vercel te dará una URL pública gratuita como `https://whatsapp-creator-xyz.vercel.app` con HTTPS incluido, lista para usar desde tu celular o compartir con amigos.
