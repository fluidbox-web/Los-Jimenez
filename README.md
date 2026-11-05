# Los Jiménez · Pedido del día

Experiencia de pedido tipo wizard para vender **un platillo al día con disponibilidad limitada** en Playa del Carmen. Está construida sobre Astro, Tailwind CSS y JavaScript del cliente, sin framework adicional.

La estética conserva la paleta cálida, la tipografía editorial y la fotografía del proyecto original, pero el flujo ya no es un menú: es un pedido guiado de cinco pasos.

## Arrancar

```bash
npm install
npm run dev
```

Abre http://localhost:4321

Otros comandos:

```bash
npm run build     # genera el sitio estático en dist/
npm run preview   # previsualiza la versión de producción
npm run check     # valida TypeScript y archivos Astro
npm test          # pruebas de precios, validaciones e idempotencia
```

## Modo demostración

**Este proyecto está en modo demostración.** La configuración actual usa:

- Disponibilidad de ejemplo: 12 platillos.
- Colonias y tiempos de entrega de ejemplo.
- Datos bancarios vacíos (no se inventa ninguna cuenta).
- WhatsApp de ejemplo: `984 000 0000` / `529840000000`.
- Aviso de privacidad de ejemplo.
- Un adaptador de pedidos que vive solo en la memoria del navegador.
- Direcciones guardadas opcionales: solo se persisten en el navegador si el cliente marca la casilla y completa un pedido.

El resultado del wizard dice claramente **“Pedido de demostración”** y no presenta la orden como recibida por la cocina. La fotografía, el menú y la identidad visual sí son parte del proyecto.

### Probar estados especiales

Con `demoMode: true` se pueden visitar estos escenarios (no afectan el flujo normal):

- `/?demo=soldout` — platillo agotado desde el inicio.
- `/?demo=changed` — simula que la disponibilidad baja antes de confirmar.
- `/?demo=error` — simula un error al registrar el pedido para probar el reintento.

## Configuración

Todo lo que debe cambiar el negocio está en **`src/config/business.ts`**:

- Marca, ciudad y WhatsApp.
- Redes sociales del menú lateral.
- Platillo, descripción, inclusiones, foto y precio.
- Menú semanal de ejemplo y día destacado.
- Costo de envío.
- Disponibilidad diaria de ejemplo.
- Colonias habilitadas y tiempos estimados.
- Ventanas de entrega y horario.
- Datos bancarios y referencia de transferencia.
- Aviso de privacidad y consentimiento de promociones.
- Bandera `demoMode` y textos de demostración.

### Antes de operar con pedidos reales

1. Reemplazar el WhatsApp por el número real.
2. Completar los datos bancarios reales o dejar claro el proceso de cobro.
3. Cambiar las colonias y tiempos por la cobertura real.
4. Sustituir el texto del aviso de privacidad por uno revisado legalmente.
5. Reemplazar el contenido y la foto del platillo.
6. Cambiar las URLs de Instagram, Facebook y TikTok en `business.socials`.
7. Reemplazar el menú semanal de ejemplo en `business.weeklyMenu`.
8. Sustituir las fotos de demostración de la galería por fotografía propia.
9. Revisar o reemplazar los tres artículos de demostración del blog.
10. Conectar el backend (ver abajo) y retirar el adaptador demo.
11. Configurar el dominio y una URL absoluta para la imagen Open Graph.
12. Cambiar `seo.indexable` a `true` solo cuando el sitio real esté conectado. Mientras tanto se envía `noindex, nofollow`.

## Arquitectura

```
src/
├── config/business.ts             # configuración del negocio, menú semanal y redes
├── content.config.ts              # colección de blog
├── content/blog/                  # artículos de demostración en Markdown
├── types/order.ts                 # contratos de pedido, disponibilidad y servicios
├── data/gallery.ts                # imágenes y textos de la galería
├── lib/
│   ├── pricing.ts                 # subtotal, envío único, total y formato MXN
│   ├── validation.ts              # teléfono, entrega, efectivo y cantidad
│   ├── whatsapp.ts                # mensaje breve sin dirección completa
│   ├── services/demo.ts           # adaptador demo con idempotencia y stock
│   └── wizard/controller.ts       # estado del wizard, foco y validaciones
├── components/
│   ├── Header.astro               # logo centrado, menú y WhatsApp
│   ├── SiteMenu.astro             # menú lateral accesible
│   ├── PageHeader.astro           # hero editorial de páginas internas
│   ├── DemoNotice.astro           # aviso reutilizable de demostración
│   ├── Footer.astro
│   ├── icons/                     # iconos de marca (WhatsApp, redes)
│   └── wizard/                    # pasos, progreso, resumen y barra de acción
├── pages/
│   ├── index.astro                # wizard
│   ├── menu-semana.astro          # menú semanal de ejemplo
│   ├── galeria.astro              # galería de fotos
│   ├── blog/index.astro           # listado del blog
│   ├── blog/[slug].astro          # detalle de artículo
│   └── privacidad.astro           # aviso de privacidad de ejemplo
├── assets/galeria/                # fotos de demostración de la galería
└── styles/global.css              # tema, estilos del wizard y del menú lateral
public/images/dish-today.jpg       # foto local del platillo
tests/                             # node:test para lógica y adaptador demo
```

### Reglas implementadas

- Un platillo: **$120 MXN**.
- Envío único: **$50 MXN por pedido**.
- Totales: 1 = **$170**, 2 = **$290**, 3 = **$410**.
- Máximo de platillos limitado por la disponibilidad configurada.
- La disponibilidad no baja al navegar ni al cambiar la cantidad; solo se reserva al confirmar una orden demo.
- Teléfono mexicano de 10 dígitos, con aceptación de `+52` y formato local.
- Nombre opcional; WhatsApp, colonia, calle/número y horario (si está activo) obligatorios.
- Cobertura restringida a las colonias configuradas; una colonia no cubierta bloquea la confirmación.
- Transferencia: queda **pendiente de verificación**, nunca pagada automáticamente.
- Efectivo: importe exacto o cantidad personalizada; se valida que cubra el total y se muestra el cambio.
- El botón de WhatsApp abre un mensaje breve con folio, platillo, cantidad, total y método de pago. **No incluye la dirección completa** y no vuelve a crear la orden.
- Si el cliente lo autoriza, la última dirección usada se guarda solo en el navegador (`localStorage`) para ofrecer “Direcciones anteriores”. Se puede eliminar con “Olvidar”. Sin esa autorización no se persiste ningún dato personal.
- Las direcciones se guardan únicamente después de completar un pedido, no al visitar o abandonar el formulario.
- El botón de confirmar se bloquea durante el procesamiento y el adaptador demo usa una llave de idempotencia para impedir duplicados.

### Errores y foco

- Los errores se muestran junto a cada campo y se vinculan con `aria-describedby`.
- Al cambiar de paso, el foco se mueve al título del paso y se anuncia en una región `aria-live`.
- Si falla una validación, se enfoca el primer campo inválido.
- Durante el procesamiento, el botón queda deshabilitado y expone `aria-busy`.
- Los estados de agotado, error y cambio de disponibilidad tienen mensajes explícitos.
- La barra inferior respeta `env(safe-area-inset-bottom)` y se oculta cuando el teclado reduce el viewport.

## Conectar el backend / CRM

Los contratos están en `src/types/order.ts`:

- `AvailabilityService.getAvailability()`: devuelve los platillos restantes.
- `OrderService.createOrder(request)`: recibe cantidad, cliente, pago, totales y `idempotencyKey`.

Hoy `src/lib/services/demo.ts` implementa ambos adaptadores en memoria. Para producción:

1. Crear endpoints o funciones de servidor para consultar disponibilidad y crear pedidos.
2. Validar en servidor **platillo, precio, envío, cobertura, horario, cantidad y método de pago**.
3. Reservar stock con una operación atómica (por ejemplo, `UPDATE ... WHERE remaining >= quantity`) dentro de una transacción.
4. Guardar la orden y devolver un folio real.
5. Usar la llave de idempotencia en servidor para que los reintentos devuelvan la misma orden y no dupliquen pedidos.
6. Mantener la transferencia como pendiente hasta verificación manual.
7. No exponer claves privadas ni datos de CRM en el cliente.

El mensaje de WhatsApp es solo una comunicación posterior; la orden no depende de que el cliente abra WhatsApp.

## Pruebas realizadas

- `npm test`: 21 pruebas de precios, envío único, validaciones, teléfono, cobertura, efectivo, agotado, error y doble confirmación.
- `npm run check`: sin errores ni advertencias.
- `npm run build`: compilación correcta de `/`, `/menu-semana`, `/galeria`, `/blog`, los tres artículos y `/privacidad`.
- Pruebas de navegador en 390 y 1440 px: sin scroll horizontal en las páginas nuevas.
- Menú lateral verificado: apertura, cierre con Escape y clic en el backdrop, bloqueo del scroll y regreso del foco al botón que lo abrió.
- Flujos verificados: efectivo exacto, efectivo con cambio, transferencia, edición de secciones, regreso sin perder datos, error de red, cambio de disponibilidad y direcciones guardadas con consentimiento.

## Notas

- Las fuentes se cargan de Google Fonts y la foto del platillo está alojada localmente.
- El logo del header está en `src/assets/ljz-logo.png` y se sirve optimizado en WebP con `astro:assets`.
- La foto del platillo es una imagen de ejemplo de Unsplash; se recomienda sustituirla por fotografía propia.
- La foto tiene un fallback visible si no carga.
- El menú semanal, las fotos de la galería y los artículos del blog son contenido de demostración.
- Las fotos adicionales de la galería provienen de Unsplash y se usan solo como referencia visual; sustitúyelas por fotos propias antes de publicar.
- Los enlaces de Instagram, Facebook y TikTok están configurados con las páginas principales de cada red. Cámbialos por las cuentas reales en `business.socials`.
- El header usa un logo centrado, un botón de menú a la izquierda y un acceso directo a WhatsApp a la derecha. El menú lateral se implementa con un `<dialog>` nativo y devuelve el foco al botón que lo abrió.
- El aviso de privacidad actual es una plantilla de demostración; debe revisarse antes de publicarse.
- El aviso de privacidad y el consentimiento de promociones son independientes. Las promociones están desmarcadas por defecto.
