# Tonocromía — migración a React/Next.js — diseño

Fecha: 2026-09-15

## Contexto

Tonocromía es una app de investigación: cada participante escribe un apodo, escucha 17
fragmentos musicales cortos y, para cada uno, asocia libremente hasta 5 colores (rueda
cromática), una emoción y una textura. Un investigador revisa las respuestas y gestiona
qué fragmentos se presentan.

La versión actual es un único archivo HTML (`tonocromia.html`, entregado por la
diseñadora) con JS vanilla, sin build, con los 17 audios incrustados como base64 dentro
del propio archivo, que envía resultados a un Google Apps Script y usa `localStorage`
para configuración de fragmentos. No hay backend propio ni base de datos.

Insumos de este diseño:
- `tonocromia.html` (código fuente completo revisado línea por línea).
- `Reporte de Estado y Pendientes, App.pdf` — brief del equipo de investigación con lo
  que ya está validado y lo que falta resolver.
- Decisiones tomadas en conversación con el usuario (dueño del proyecto).

## Objetivo

Reconstruir la app en React (Next.js) para desplegar en Vercel, con backend propio
(Vercel Blob + Postgres) para poder indexar, renombrar y borrar los audios de estímulo,
resolver los pendientes del reporte, y sumar una segunda piel visual futurista
seleccionable con un botón — conservando todo lo que el reporte marca como ya resuelto.

## Qué se conserva sin cambios de fondo

- Nombre **Tonocromía**, slogan **"Escúchalo en colores"**, copy de onboarding/gracias.
- Flujo: logo → apodo → intro → carrusel de audios (color/emoción/textura por
  fragmento) → envío → agradecimiento.
- Reglas de negocio ya validadas: el reproductor nunca se detiene mientras se completan
  tareas; no se puede enviar hasta completar las 3 tareas de cada fragmento; máximo 5
  colores por paleta; el garabato audioreactivo vive dentro de cada círculo.
- El panel del investigador sigue protegido con contraseña (ahora validada en servidor).

## Arquitectura

**Next.js 14 (App Router), TypeScript, desplegado en Vercel.**

- `app/` — rutas de participante (`/`) y panel del investigador (`/panel`).
- `app/api/` — route handlers: subida/borrado de audio, envío de respuestas, listado de
  resultados + export CSV, autenticación del panel.
- **Vercel Blob** — almacenamiento de los archivos de audio (reemplaza el base64
  incrustado).
- **Postgres (Neon, vía integración de Vercel)** — metadata de fragmentos y respuestas.
  Acceso con `postgres.js` o Drizzle ORM (a decidir en el plan de implementación; sin
  ORM pesado tipo Prisma para mantener el cold-start liviano en serverless).
- Sin Google Apps Script: todo el envío y consulta de resultados pasa por la API propia.

Alternativas descartadas: SPA con Vite + funciones sueltas en `/api` (misma capacidad,
más fontanería manual sin beneficio real); subida de audio directo del navegador a Blob
sin paso por servidor (no permite comprimir ni to validar duración antes de guardar).

### Modelo de datos (Postgres)

```
fragments
  id            text primary key
  label         text
  audio_url     text            -- URL en Vercel Blob
  duration_ms   integer
  order_index   integer
  active        boolean default true

submissions
  id            uuid primary key
  alias         text
  submitted_at  timestamptz

responses
  submission_id uuid references submissions(id)
  fragment_id   text references fragments(id)
  colors        jsonb           -- [{hue, saturation, lightness, hex}, ...]
  emotion       text
  texture       text
  primary key (submission_id, fragment_id)
```

## Piel doble (editorial / futurista) con botón

Un interruptor visible en el onboarding (mockup ya validado con el usuario:
`Rumbo Cromático`) alterna entre:
- **Editorial** — fondo crema, tipografías Inria Serif + Lexend Zetta, aura de color
  sutil alrededor del círculo activo. Continuación directa del look actual.
- **Futurista** — fondo casi negro, degradados violeta–cian–magenta, anillo giratorio,
  wordmark con gradiente.

Ambas pieles comparten exactamente la misma lógica de estado y componentes; solo cambian
tokens de color/tipografía/animación (CSS variables + una clase o `data-skin` en la
raíz). La preferencia se guarda en `localStorage` por dispositivo. Se implementa
respetando `prefers-reduced-motion`.

## Pendientes del reporte → solución

| # | Pendiente | Solución |
|---|-----------|----------|
| 2.1 | Lentitud al avanzar entre audios | El carrusel actual re-renderiza todo el DOM en cada avance. En React, el estado de progreso se separa del árbol de fragmentos para que avanzar solo actualice transform/clases de los círculos afectados, sin recrear nodos ni desmontar el `<audio>` que está sonando. |
| 2.2 | Panel de texturas cortado en móvil | Grid con alturas basadas en `dvh` y `overflow-y` propio del panel, verificado en viewport móvil real (no solo devtools). |
| 2.3 | Panel del investigador | Login con contraseña validado en servidor (route handler + cookie de sesión corta). Pestaña "Resultados": tarjetas por apodo con sus respuestas (colores, emoción, textura por fragmento) + botón exportar CSV, leyendo de Postgres. Pestaña "Fragmentos": reordenar (subir/bajar), activar/desactivar, **renombrar**, **borrar**, y **subir audio nuevo** (drag & drop) — ver siguiente sección. |
| 2.4 | Garabato audioreactivo se traba | El `AnalyserNode`/`MediaElementSourceNode` se crea una vez por `<audio>` y se re-vincula de forma defensiva al cambiar de fragmento activo, en vez de asumir que sigue vivo; se restaura al doodle estático si el audio está en pausa. |
| 2.5 | Opciones de emoción incompletas | Lista completa de 17 emociones (Plenitud, Serenidad, Resignación, Añoranza, Melancolía, Desesperación, Entusiasmo, Empoderamiento, Pánico, Desorientación, Alivio, Impotencia, Irritación, Vulnerabilidad, Magnetismo, Seducción, Apatía). Interacción nueva: selector tipo rueda con un cajón fijo central (scroll-snap) — la opción que queda en el cajón se marca sola. |
| 2.6 | Opciones de textura incompletas | 9 opciones (Suave/Terciopelado, Cristalino/Afilado, Áspero/Granulado, Denso/Pesado, Vibrante/Eléctrico, Líquido/Fluido, Eólico/Gaseoso, Metálico/Escarchado, y "Otro: ___" con campo de texto libre), en grid de cajones que se ve completo en móvil. |

## Gestión de audio (nuevo)

- El investigador sube archivos desde el Panel de Fragmentos (drag & drop).
- El servidor transcodea a un formato comprimido (Opus/AAC de bitrate bajo-medio,
  suficiente para voz/música corta) antes de guardar en Vercel Blob — si el archivo
  pesa mucho, se baja el bitrate automáticamente en vez de rechazarlo.
- Se guarda `duration_ms` real del archivo procesado.
- **Límite: 10 minutos de duración total sumando todos los fragmentos activos.** El
  panel muestra el total en vivo y bloquea activar un fragmento (o subir uno nuevo) si
  se supera el límite; hay que desactivar/borrar otro primero.
- Renombrar y borrar operan directamente sobre el registro en Postgres y el blob
  asociado (borrar el registro borra también el archivo en Blob).

## Resultados y análisis

Alcance confirmado con el usuario: **lista agrupada por participante + exportar CSV**,
igual que la funcionalidad actual — sin panel de gráficos/analítica agregada por ahora.

## Fuera de alcance de este diseño

- Analítica agregada con gráficos (descartado explícitamente por el usuario).
- Multi-estudio / multi-tenant (se asume un solo estudio "Tonocromía").
- Internacionalización (la app es solo en español, como la original).

## Plan de verificación

- Probar el flujo completo de participante en un celular real (no solo emulador),
  confirmando que el panel de texturas y el selector de emoción se ven completos.
- Verificar que el audio no se corta al navegar entre tareas ni entre fragmentos.
- Probar el panel del investigador: login, subir/renombrar/borrar/reordenar fragmentos,
  bloqueo al pasar los 10 minutos totales, exportar CSV con datos reales.
- Revisar ambas pieles visuales (editorial/futurista) en mobile y desktop, con
  `prefers-reduced-motion` activado.
