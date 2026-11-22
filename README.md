# MODAPTS Studio

Análisis de movimientos MODAPTS con Meta Quest (manos + cabeza, passthrough), reporte PDF/Excel y machine learning de las terminaciones.

- `index.html`: la app completa (un solo archivo).
- `netlify/functions/ml/`: almacén central del machine learning (`/api/ml`), con Netlify Blobs. Guarda solo los datos de cada movimiento y la respuesta, nunca video.
- `netlify.toml`: publica la carpeta raíz y las funciones.

## Puesta en marcha en Netlify (una sola vez)

1. Netlify → sitio **modaptsstudio** → *Site configuration* → *Build & deploy* → *Continuous deployment* → **Link repository** → GitHub → `modapts-studio`, rama `main`. La configuración la toma de `netlify.toml`.
2. *Site configuration* → **Environment variables** → agregar:
   - `MODAPTS_APP_KEY`: la clave que se pone una vez en cada aparato para subir etiquetas y entrenar.
   - `MODAPTS_ADMIN_KEY`: solo para el administrador (quitar etiquetas de una sesión, regresar a una versión).
3. *Deploys* → **Trigger deploy**.
4. Prueba: abrir `https://modaptsstudio.netlify.app/api/ml?what=ping` debe responder `{"ok":true}`.

## Uso

Inicio → **Machine learning** → paso 4 → poner la clave de la app (una vez por aparato). Al tocar **Entrenar y re-analizar** se suben las etiquetas, se entrena con las de todos los aparatos y se publica una versión nueva del modelo; cada aparato la baja al abrir la app.
