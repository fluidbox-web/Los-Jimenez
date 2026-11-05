// Fotografías de demostración de Unsplash (licencia Unsplash).
// Reemplazar por fotografía propia antes de publicar el sitio.
import type { ImageMetadata } from 'astro';
import cochinita from '../assets/galeria/cochinita.jpg';
import tacos from '../assets/galeria/tacos.jpg';
import preparacion from '../assets/galeria/preparacion.jpg';
import ingredientes from '../assets/galeria/ingredientes.jpg';
import especias from '../assets/galeria/especias.jpg';
import salsa from '../assets/galeria/salsa.jpg';

export interface GalleryImage {
  src: ImageMetadata;
  title: string;
  description: string;
  alt: string;
  category: string;
}

export const galleryImages: GalleryImage[] = [
  {
    src: cochinita,
    title: 'Cochinita pibil',
    description: 'Nuestra receta de la casa, cocinada a fuego lento hasta deshacerse.',
    alt: 'Tacos de cochinita pibil con cebolla morada, cilantro y limón',
    category: 'Platillos',
  },
  {
    src: preparacion,
    title: 'Manos en la cocina',
    description: 'Todo se prepara el mismo día, en tandas pequeñas y con calma.',
    alt: 'Manos picando verduras frescas sobre una mesa de madera',
    category: 'Cocina',
  },
  {
    src: ingredientes,
    title: 'Ingredientes frescos',
    description: 'Lo que entra a la cocina cada mañana: aguacate, chile, tomate y hierbas.',
    alt: 'Tabla de madera con aguacate, tomates, chiles y hierbas frescas',
    category: 'Ingredientes',
  },
  {
    src: tacos,
    title: 'Tacos de la casa',
    description: 'Tortillas de maíz, carne bien sazonada y mucho cilantro fresco.',
    alt: 'Tacos de carne con cilantro y cebolla en tortillas de maíz',
    category: 'Platillos',
  },
  {
    src: especias,
    title: 'Especias y aromas',
    description: 'El sabor empieza en una buena mezcla de especias y chiles secos.',
    alt: 'Cucharones con especias, chiles secos y hierbas sobre una mesa clara',
    category: 'Ingredientes',
  },
  {
    src: salsa,
    title: 'Salsa de la casa',
    description: 'Salsas hechas en casa para acompañar cada platillo.',
    alt: 'Tacos bañados con salsa cremosa sobre un plato rústico',
    category: 'Platillos',
  },
];
