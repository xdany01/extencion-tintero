# Tintero

Extensión de navegador para **rellenar formularios repetitivos** con textos guardados.
Cuando enfocas un campo, aparece una pequeña pluma junto a él; al pulsarla se abre una hoja
con las sugerencias ordenadas por afinidad con ese campo.

Hecha con [WXT](https://wxt.dev) + React + TypeScript, con estética de papel y modo oscuro.

---

## Qué hace

- **Botón flotante** junto al campo enfocado (`input` de texto, `textarea` y `contenteditable`).
- **Sugerencias ordenadas por afinidad**: compara el contexto del campo (label, `placeholder`,
  `name`, `id`, `aria-label`, `aria-labelledby`, `autocomplete`, `data-*`, `legend`, cabecera de
  tabla y texto cercano) con las **etiquetas** de cada texto guardado.
- **Tres campos por texto**: título, texto a insertar y lista de etiquetas (badges).
- **Panel con filtro**, navegación con teclado (`↑` `↓`, `Enter`, `Esc`) y porcentaje de afinidad.
- **Etiquetas coincidentes resaltadas** para entender por qué se sugiere cada texto.
- **Inserción compatible con frameworks**: usa el setter nativo y dispara `input` + `change`.
- **Gestor completo**: crear, editar, borrar, buscar, importar y exportar JSON.
- **Popup** con interruptor on/off, búsqueda y copia rápida al portapapeles.
- **Tema papel** claro / oscuro / automático (sigue al sistema).
- **Atajo** `Alt+Shift+T` para activar o desactivar el autocompletado.

## Cómo se calcula la afinidad

Cada pista se combina de forma acumulativa (`1 − Π(1 − peso)`), así que varias coincidencias
débiles suman sin llegar nunca a desbordar:

| Evidencia | Peso |
| --- | --- |
| Etiqueta exacta dentro del contexto | 0,62 |
| Etiqueta como subcadena (≥ 5 letras) | 0,55 |
| Palabras de la etiqueta presentes | 0,20 + 0,22 × proporción |
| Etiqueta parecida (Dice sobre bigramas ≥ 0,75) | hasta 0,28 |
| Título exacto | 0,30 |
| Palabras del título | hasta 0,18 |
| Palabras del texto | hasta 0,18 |
| Uso previo / recencia | hasta 0,15 |

El porcentaje que se muestra es esa afinidad redondeada. La primera fila es siempre la mejor
coincidencia; las etiquetas resaltadas indican qué disparó la coincidencia.

## Desarrollo

Requisitos: Node 20+.

```bash
npm install
npm run dev
```

`wxt` compila, abre Chrome con la extensión cargada y recarga al guardar cambios.

Otros comandos:

```bash
npm run build          # .output/chrome-mv3
npm run build:firefox  # .output/firefox-mv2
npm run zip            # paquete para las tiendas
npm run compile        # comprobación de tipos
```

> En Windows, si PowerShell bloquea `npm`, usa `npm.cmd install`, `npm.cmd run dev`, etc.

### Cargar la extensión manualmente

1. `npm run build`
2. Abre `chrome://extensions`
3. Activa **Modo de desarrollador**
4. **Cargar descomprimida** → selecciona `.output/chrome-mv3`

En Firefox: `about:debugging` → *Este Firefox* → *Cargar complemento temporal* →
`.output/firefox-mv2/manifest.json`.

## Estructura

```
entrypoints/
  background.ts        Siembra ejemplos, atajo de teclado y badge ON/OFF
  content/             Widget flotante (Shadow DOM + React)
    index.tsx          Montaje aislado con hojas de estilo construidas (CSP-safe)
    controller.ts      Foco, posicionamiento, teclado y estado
    Widget.tsx         Pluma + panel de sugerencias
    style.css          Estilos del widget
  popup/               Interruptor, búsqueda y copia rápida
  options/             Gestor de textos (CRUD, import/export, tema)
lib/
  context.ts           Extracción del contexto del campo
  matching.ts          Ranking por afinidad
  normalize.ts         Normalización y Dice
  storage.ts           browser.storage.local + watchers
  insert.ts            Inserción nativa en inputs y contenteditable
  types.ts             Modelo de datos
components/icons.tsx   Iconos SVG
assets/paper.css       Tokens y componentes del diseño papel
public/icon/           Iconos generados (16–128 px)
scripts/generate-icons.ps1
```

## Permisos

| Permiso | Para qué |
| --- | --- |
| `storage` | Guardar textos y ajustes |
| `clipboardWrite` | Copiar desde el popup |
| `<all_urls>` (content script) | Detectar campos en cualquier web |

El content script se ejecuta en todos los frames para cubrir formularios dentro de iframes.
No envía datos a ningún servidor: todo se guarda en `browser.storage.local`.

## Formato de import/export

Exporta un array JSON:

```json
[
  {
    "id": "…",
    "title": "Correo electrónico",
    "text": "maria.lopez@ejemplo.com",
    "badges": ["email", "correo", "e-mail"],
    "uses": 3,
    "lastUsedAt": 1730000000000,
    "createdAt": 1730000000000,
    "updatedAt": 1730000000000
  }
]
```

La importación acepta también `{ "snippets": [...] }`, valida los campos y fusiona por `id`.

## Detalles de implementación

- El widget vive en un **Shadow DOM** con estilos propios, así que no hereda ni filtra CSS de la
  página. Los estilos se aplican con `CSSStyleSheet` adoptadas para esquivar CSP estrictas.
- El panel se coloca por encima o por debajo según el espacio disponible y se recoloca al hacer
  scroll o redimensionar.
- Al insertar, se usa el setter nativo del prototipo (`HTMLInputElement.prototype.value`) y se
  emiten `input` y `change`, por lo que React, Vue y compañía detectan el cambio.
- `contenteditable` se rellena con `execCommand('insertText')` para no romper editores enriquecidos.

## Limitaciones conocidas

- No se admiten `password`, `select`, `checkbox` ni campos de archivo.
- En campos dentro de iframes, el widget se dibuja dentro del propio iframe (por eso `allFrames`).
- Los textos se guardan en almacenamiento local: no se sincronizan entre dispositivos.
