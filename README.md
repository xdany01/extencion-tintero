# Tintero

Extensión de navegador para **rellenar formularios repetitivos** con textos guardados.
Cuando enfocas un campo, aparece una pequeña pluma junto a él; al pulsarla se abre una hoja
con las sugerencias ordenadas por afinidad con ese campo.

Hecha con [WXT](https://wxt.dev) + React + TypeScript, con estética de papel y modo oscuro.

---

## Qué hace

- **Botón flotante** junto al campo enfocado (`input` de texto, `textarea` y `contenteditable`).
- **Sugerencias ordenadas por afinidad**: compara el contexto del campo (label, `placeholder`,
  `name`, `id`, `aria-label`, `aria-labelledby`, `autocomplete`, `data-*`, legend, cabecera de
  tabla y texto cercano) con las **etiquetas** de cada texto guardado.
- **Tres campos por texto**: título, texto a insertar y lista de etiquetas (badges).
- **Panel con filtro**, navegación con teclado (↑ ↓, Enter, Esc) y porcentaje de afinidad.
- **Etiquetas coincidentes resaltadas** para entender por qué se sugiere cada texto.
- **Inserción compatible con frameworks**: usa el setter nativo y dispara `input` + `change`.
- **Gestor completo**: crear, editar, borrar, buscar, importar y exportar JSON.
- **Popup** con interruptor on/off, búsqueda y copia rápida al portapapeles.
- **Tema papel** claro / oscuro / automático (sigue al sistema).
- **Atajo** `Alt+Shift+T` para activar o desactivar el autocompletado.

---

## Instalación

### Requisitos

- Node 20+

### Instalar y construir

```bash
npm install           # instala dependencias y prepara wxt
npm run build         # .output/chrome-mv3 (Chrome / Edge / …)
```

Para Firefox: `npm run build:firefox` → `.output/firefox-mv2/manifest.json`.

Comprobación de tipos: `npm run compile` (`tsc --noEmit`). Paquete para las tiendas:
`npm run zip`.

> En Windows, si PowerShell bloquea `npm`, usa `npm.cmd install`, `npm.cmd run build`, etc.

### Cómo cargar la extensión manualmente

Chrome / Edge:

1. `npm run build`
2. Abre `chrome://extensions`
3. Activa **Modo de desarrollador**
4. **Cargar descomprimida** → selecciona `.output/chrome-mv3`

Firefox:

`about:debugging` → *Este Firefox* → *Cargar complemento temporal* →
`.output/firefox-mv2/manifest.json`.

Al instalarse por primera vez, el fondo semilla unos textos de ejemplo en el almacenamiento.

### Desarrollo

```bash
npm run dev           # wxt: compila, abre Chrome con la extensión cargada y recarga al guardar
npm run build:firefox # .output/firefox-mv2
npm run zip           # paquete para las tiendas
npm run compile       # comprobación de tipos
```

---

## Uso

Una vez cargada la extensión (ver *Instalación*), en cualquier formulario:

1. **Enfoca un campo editable** (`input` de texto, `textarea` o `contenteditable`): la pluma
   flotante aparece junto al campo enfocado.
2. **Pulsa la pluma** (o abre el panel con `Alt+↓`, o `Ctrl+Space`): el panel muestra tus
   textos reutilizables ordenados por afinidad, con su porcentaje de coincidencia.
   - Escribe para filtrar. Navega con `↑`/`↓` y confirma con `Enter` (o con la acción principal
     del panel); `Esc` (o `Tab`) cierra.
   - Las etiquetas resaltadas en cada sugerencia son las que han coincidido con el contexto
     del campo.
3. **Icono de la extensión**: muestra el badge **ON/OFF** del autocompletado. Puedes alternar
   el estado desde el popup (interruptor) o con el atajo **`Alt+Shift+T`**; el badge del icono
   refleja el cambio.
4. **Popup del icono** (clic): interruptor "Autocompletado activo/desactivado", búsqueda rápida
   de textos, copia rápida del texto al portapapeles, y botones **Nuevo** (abre el gestor con el
   formulario en blanco) y **Gestionar textos**.
5. **Gestor (página de opciones)**: gestiona tus textos — crear (título, texto a insertar y
   etiquetas de coincidencia), editar, eliminar, buscar y exportar/importar la biblioteca como
   JSON; además **Cargar ejemplos** si todavía no tienes textos.
6. **Tema**: claro, oscuro o automático (sigue al sistema) desde el gestor o el popup.

El texto insertado se aplica con el setter nativo del prototipo del campo (`HTMLInputElement.prototype.value`)
y se disparan los eventos `input` + `change`, por lo que React, Vue y compañía detectan el cambio.

---

## Cómo se calcula la afinidad (probabilidad de coincidencia)

Cuando enfocas un campo, Tintero calcula una "afinidad" para cada texto guardado: cuánto
parece ese texto a lo que pide ese campo. El panel ordena los textos por afinidad descendente
(la primera fila es la mejor coincidencia; en caso de empate, por título) y muestra el porcentaje
que se calcula a continuación.

### La fórmula

Cada evidencia tiene un **peso** `w` ("capacidad" de indicar coincidencia). Las evidencias
se combinan de forma probabilística (fórmula de abajo):

```
afinidad = 1 − (1 − w₁) · (1 − w₂) · … · (1 − wₙ)
```

En palabras: el producto de `(1 − wᵢ)` es la probabilidad de que **ninguna** evidencia dispare;
restándolo de 1 obtenemos la probabilidad de que **al menos una** dispare. Equivale a la
fórmula clásica del evento unión de eventos independientes:

```
P(A ∪ B ∪ …) = 1 − P(¬A) · P(¬B) · …
```

En la implementación (`lib/matching.ts`) cada paso se calcula así, con un tope máximo
para que una sola evidencia no pueda contribuir más del 95 %:

```js
evidence = 1 - (1 - evidence) * (1 - Math.min(weight, 0.95));
```

Aunque una evidencia deja de disparar, las anteriores siguen actuando; varios aciertos
débiles suman, sin llegar a desbordar nunca (cada `(1 − wᵢ)` es positivo porque `wᵢ ≤ 0,95`,
así que la afinidad siempre está en `[0, 1)`). El porcentaje que se muestra es esa afinidad
redondeada: `Math.round(evidence * 100)`.

### Peso de cada evidencia

| Evidencia | Peso `w` |
| --- | --- |
| Etiqueta exacta dentro del contexto | 0,62 |
| Etiqueta como subcadena (≥ 5 letras) | 0,55 |
| Palabras de la etiqueta presentes (`aciertos/palabras`, p. ej. 3/5) | 0,20 + 0,22 × proporción |
| Etiqueta parecida: Dice sobre bigramas ≥ 0,75 (`0,28 × similitud`) | hasta 0,28 |
| Título exacto | 0,30 |
| Palabras del título | `0,14 × (aciertos / palabras del título) + 0,04 × aciertos` |
| Palabras del texto (`0,03 × superposición`, máx. 0,18) | hasta 0,18 |
| Uso previo / recencia (`0,02 × usos`, máx. 0,10; + 0,05 si se usó en < 7 días) | hasta 0,15 |

Aunque se llaman "palabras presentes", coinciden tokens normalizados (minúsculas, sin
acentos ni signos); el contexto del campo se normaliza igualmente.

### Ejemplos de cálculo

**Ejemplo 1 — evidencia fuerte duplicada** (badge exacta 0,62 + badge como subcadena ≥ 5
letras 0,55):

- Paso 1: `1 − (1 − 0) × (1 − 0,62) = 1 − 0,38 = 0,62` → **62 %**
- Paso 2: `1 − (1 − 0,62) × (1 − 0,55) = 1 − 0,38 × 0,45 = 1 − 0,171 = 0,829` → **83 %**
  (≈82,9 %)

**Ejemplo 2 — tres evidencias débiles de 0,2 cada una** (p. ej. palabras presentes en la
badge):

```
1 − 0,8³ = 1 − 0,512 = 0,488     →  ≈49 %
```

O con tres evidencias de 0,288 (p. ej. `0,20 + 0,22 × 0,4 = 0,288` por 3 palabras presentes
de 5 en la badge):

```
1 − 0,712³ = 1 − 0,3609 = 0,639  →  ≈64 %
```

Así se ve la dinámica: algunos aciertos débiles suben poco a poco, y algunos más suben mucho;
en ambos casos el total crece sin alcanzar nunca el 100 % en pasos pequeños.

**Ejemplo 3 — evidencia mixta** (badge parecida con Dice 1,0 → 0,28; título exacto → 0,30;
`uses = 5` → `0,02 × 5 = 0,10`):

- Paso 1: `1 − 0,72 = 0,28`
- Paso 2: `1 − 0,72 × 0,70 = 0,496`
- Paso 3: `1 − 0,504 × 0,90 = 0,5464` → **55 %** (≈54,64 %)

La fila superior del panel es siempre el texto con mayor afinidad; las badges resaltadas son las
que han disparado cada evidencia (`matchedBadges`).

---

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
