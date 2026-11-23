import type { Snippet } from './types';
import { newId } from './id';

/** Textos de ejemplo que se siembran la primera vez que se instala la extensión. */
export function exampleSnippets(): Snippet[] {
  const now = Date.now();
  const base = { uses: 0, lastUsedAt: null, createdAt: now, updatedAt: now };

  return [
    {
      ...base,
      id: newId(),
      title: 'Nombre completo',
      text: 'María Fernanda López García',
      badges: ['nombre', 'name', 'full name', 'nombre completo', 'nombres', 'apellidos'],
    },
    {
      ...base,
      id: newId(),
      title: 'Correo electrónico',
      text: 'maria.lopez@ejemplo.com',
      badges: ['email', 'correo', 'e-mail', 'mail', 'electrónico', 'correo electrónico'],
    },
    {
      ...base,
      id: newId(),
      title: 'Teléfono móvil',
      text: '+34 612 345 678',
      badges: ['teléfono', 'telefono', 'phone', 'tel', 'móvil', 'celular', 'whatsapp'],
    },
    {
      ...base,
      id: newId(),
      title: 'Dirección',
      text: 'Calle Mayor 14, 3.º B, 28013 Madrid',
      badges: ['dirección', 'direccion', 'address', 'domicilio', 'calle', 'residencia'],
    },
    {
      ...base,
      id: newId(),
      title: 'Empresa',
      text: 'Estudio Papel y Tinta S.L.',
      badges: ['empresa', 'company', 'organización', 'organization', 'negocio', 'razón social'],
    },
    {
      ...base,
      id: newId(),
      title: 'Mensaje de presentación',
      text: 'Hola, me pongo en contacto para solicitar más información sobre vuestros servicios. Quedo atenta a vuestra respuesta. Un saludo.',
      badges: ['mensaje', 'message', 'comentario', 'consulta', 'presentación', 'observaciones'],
    },
  ];
}
