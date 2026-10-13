[<img src="public/logo.png" alt="Logo de WhatsApp Creator" width="96" height="96">](https://whatsapp-creator.vercel.app/)

# [WhatsApp Creator — Video to Sticker & GIF (1 Click)](https://whatsapp-creator.vercel.app/)

[Abrir la app](https://whatsapp-creator.vercel.app/) · [Versión en pruebas: corrección de GIF animado](https://whatsapp-creator-git-fix-gif-animado-movi3.vercel.app/)

El enlace del título apunta al dominio fijo de producción. Con la integración de GitHub en Vercel, cada despliegue exitoso de la rama de producción actualiza la app en esa misma URL. El enlace de pruebas muestra el último despliegue de la rama `fix/gif-animado`.

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
   - Selector de FPS: 10 FPS (menor peso) o 15 FPS (mayor fluidez).
   - Aviso cuando el sticker WebP supera 500 KB, con opción de acortar el clip y usar 10 FPS antes de volver a generar.
3. **Conversión 100% Client-Side (Cero costo de servidor)**:
   - El procesamiento de fotogramas y la cuantización de color se realizan en el navegador del usuario usando HTML5 Canvas y `gifenc`.
   - No consume CPU ni memoria en Vercel, evitando límites de tiempo de ejecución (timeouts) y costos de infraestructura.
4. **Proxy Integrado de Video**:
   - Ruta `/api/proxy-video` que resuelve las restricciones de CORS para permitir la lectura segura de fotogramas sin bloquear el navegador.
5. **Compartir en WhatsApp con 1 Click**:
   - **En Celular (Android / iOS)**: Usa la `Web Share API` nativa (`navigator.share`) para abrir directamente WhatsApp y enviar el archivo de inmediato al contacto o grupo seleccionado.
   - **En Computadora (PC / Mac)**: Descargá el archivo para conservar la animación. El botón **Copiar Imagen** está disponible para capturas PNG.
   - **Descarga directa**: Descarga el archivo `.webp`, `.gif` o `.png` generado en tu dispositivo.
   - **iPhone**: Al generar un sticker animado se conserva también el GIF original, con botones para descargarlo o abrir la hoja de compartir. La web no instala paquetes directamente. La interfaz enlaza la guía oficial de Sticker.ly para probar la importación de GIFs en un paquete animado; todavía debe comprobarse que esa función esté disponible sin pagar en el iPhone del usuario.

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
