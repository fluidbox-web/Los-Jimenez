/**
 * Configuración del negocio.
 *
 * Este es el único lugar donde deben cambiarse precios, platillo, disponibilidad,
 * colonias, horarios, datos bancarios y WhatsApp.
 *
 * Los textos marcados como "ejemplo" son deliberadamente dummy para la demostración.
 */
export const business = {
  demoMode: true,

  brand: {
    name: 'Los Jiménez',
    tagline: 'Cocina del día',
    monogram: 'LJ',
    city: 'Playa del Carmen',
    state: 'Quintana Roo',
  },

  whatsapp: {
    // TODO: reemplazar por el número real. Debe incluir lada de país y solo dígitos.
    // El número actual es un marcador de posición para la demostración.
    number: '529840000000',
    display: '984 000 0000',
    helpMessage: 'Hola, tengo una duda sobre el platillo de hoy.',
  },

  dish: {
    id: 'cochinita-pibil',
    name: 'Tacos de cochinita pibil',
    nameAccent: 'cochinita',
    description:
      'Cochinita marinada en axiote y cocinada a fuego lento hasta deshacerse. Se sirve con tortillas de maíz, cebolla morada curtida y salsa habanero de la casa.',
    includes: [
      '4 tacos en tortilla de maíz',
      'Arroz rojo de la casa',
      'Frijoles negros',
      'Salsa habanero',
      'Agua fresca del día',
    ],
    image: '/images/dish-today.jpg',
    imageAlt: 'Tacos de cochinita pibil con cilantro, cebolla morada y limón',
    tags: ['Receta de la casa', 'Hecho hoy'],
  },

  pricing: {
    unitPrice: 120,
    shippingFee: 50,
    currency: 'MXN' as const,
  },

  availability: {
    // Dato de ejemplo. En producción vendrá del CRM/backend.
    remaining: 12,
    isDemo: true,
  },

  coverage: {
    statement: 'El tiempo de entrega puede variar según tu colonia.',
    // TODO: reemplazar por las colonias realmente habilitadas y sus tiempos.
    zones: [
      { id: 'centro', name: 'Centro', estimate: '35–40 min', enabled: true },
      { id: 'gonzalo-guerrero', name: 'Gonzalo Guerrero', estimate: '35–45 min', enabled: true },
      { id: 'ejidal', name: 'Ejidal', estimate: '40–45 min', enabled: true },
      { id: 'colosio', name: 'Colosio', estimate: '40–50 min', enabled: true },
      { id: 'playacar', name: 'Playacar', estimate: '45–50 min', enabled: true },
    ],
    notCoveredMessage:
      'Todavía no tenemos servicio en tu colonia. Escríbenos por WhatsApp y te avisamos en cuanto esté disponible.',
    demoNote: 'Las colonias y los tiempos mostrados son datos de ejemplo para esta demostración.',
  },

  deliveryWindows: {
    // Si se desactiva, el campo de horario no aparece en el formulario.
    enabled: true,
    required: true,
    defaultWindowId: 'asap',
    helpText: 'Los tiempos pueden variar entre 35 y 50 minutos.',
    options: [
      { id: 'asap', label: 'Lo más pronto posible', enabled: true },
      { id: '13-14', label: '1:00 pm – 2:00 pm', enabled: true },
      { id: '14-15', label: '2:00 pm – 3:00 pm', enabled: true },
      { id: '15-16', label: '3:00 pm – 4:00 pm', enabled: true },
    ],
  },

  payments: {
    transfer: {
      // TODO: completar con los datos bancarios reales antes de publicar.
      bankName: '',
      accountHolder: '',
      clabe: '',
      referencePrefix: 'LJ',
      note: 'Los datos para transferir aparecerán al registrar tu pedido. El pago queda pendiente hasta que lo verifiquemos.',
    },
    cash: {
      note: 'Paga en efectivo cuando recibas tu pedido.',
    },
  },

  privacy: {
    url: '/privacidad',
    notice:
      'Usamos tus datos únicamente para preparar y entregar tu pedido. No creamos cuentas ni compartimos tu información con terceros ajenos a la entrega.',
    promotionsLabel: 'Quiero recibir promociones y novedades (opcional)',
  },

  // TODO: reemplazar por las cuentas reales de Los Jiménez.
  // Mientras tanto, los iconos llevan a la página principal de cada red.
  socials: [
    { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/' },
    { id: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/' },
    { id: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/' },
  ],

  weeklyMenu: {
    // Día que se muestra como "Hoy" en la página del menú semanal.
    todayId: 'jueves',
    intro:
      'Cada día preparamos un platillo casero distinto. Esta es una semana de ejemplo para que conozcas el estilo de nuestra cocina.',
    note: 'Menú de demostración. Los platillos y el orden pueden cambiar cada semana.',
    days: [
      {
        id: 'lunes',
        label: 'Lunes',
        dish: 'Pollo en mole rojo',
        description:
          'Pollo cocido a fuego lento en mole de la casa, con arroz rojo, frijoles y tortillas recién hechas.',
        tag: 'De la casa',
      },
      {
        id: 'martes',
        label: 'Martes',
        dish: 'Chiles rellenos de queso',
        description:
          'Chiles poblanos rellenos de queso fresco, bañados en salsa de jitomate, con arroz y tortillas.',
        tag: 'Vegetariano',
      },
      {
        id: 'miercoles',
        label: 'Miércoles',
        dish: 'Milanesa de pollo',
        description:
          'Milanesa empanizada al momento, con puré de papa, ensalada fresca y tortillas.',
        tag: 'Favorito',
      },
      {
        id: 'jueves',
        label: 'Jueves',
        dish: 'Tacos de cochinita pibil',
        description:
          'Cochinita marinada en axiote y cocida a fuego lento, con cebolla morada curtida y salsa habanero.',
        tag: 'Receta de la casa',
      },
      {
        id: 'viernes',
        label: 'Viernes',
        dish: 'Pescado a la plancha',
        description:
          'Filete de pescado con verduras al vapor, arroz, tortillas y salsa de la casa.',
        tag: 'Del mar',
      },
      {
        id: 'sabado',
        label: 'Sábado',
        dish: 'Tamales de pollo',
        description:
          'Tamales de pollo en salsa verde envueltos en hoja de plátano, con atole del día.',
        tag: 'Fin de semana',
      },
      {
        id: 'domingo',
        label: 'Domingo',
        dish: 'Comida corrida de la casa',
        description:
          'Sopa del día, plato fuerte, arroz, frijoles, tortillas y agua fresca.',
        tag: 'Completo',
      },
    ],
  },

  hours: {
    summary: 'Pedidos de hoy · 1:00 a 5:00 pm',
  },

  demoNotice:
    'Sitio de demostración: los pedidos y la disponibilidad son de ejemplo, no se envían a la cocina.',

  seo: {
    // Cambiar a true únicamente cuando el sitio real esté conectado y revisado.
    indexable: false,
  },
} as const;
