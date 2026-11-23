import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Tintero — Autocompletar formularios',
    short_name: 'Tintero',
    description:
      'Guarda textos reutilizables y rellena formularios repetitivos con un clic. Sugerencias ordenadas según el campo.',
    permissions: ['storage', 'clipboardWrite'],
    action: {
      default_title: 'Tintero',
    },
    commands: {
      'toggle-autofill': {
        suggested_key: { default: 'Alt+Shift+T' },
        description: 'Activar o desactivar el autocompletado',
      },
    },
  },
});
