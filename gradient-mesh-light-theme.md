# Gradient Mesh - Light Mode + Theming (Dark ↔ Light)

> Objetivo: mantener el **mismo estilo “Gradient Mesh”** pero con un **modo claro** (blanco) y un **sistema de temas** para alternar Dark/Light sin rehacer componentes.

---

## Qué cambia en Light Mode

En modo claro, el mesh funciona mejor si:

- **Bajas la opacidad** (los blobs “ensucian” más en blanco).
- **Bajas la saturación** (usa tonos 200/100 de Tailwind, no 500).
- **Subes el blur** (se ve más “soft” y premium).
- Añades overlays muy sutiles: **grid/dots/noise** con opacidad baja.

---

## Arquitectura Recomendada (Tokens con CSS Variables)

La forma más fácil de permitir Dark ↔ Light es definir **tokens** (variables) y cambiar solo el theme en el `<html>`:

- `data-theme="dark"`
- `data-theme="light"`

### 1) Tokens base + Mesh por tema

```css
/* Base (por defecto: light) */
:root {
  /* Colores UI */
  --bg: #ffffff;
  --fg: #0b1220;
  --muted: rgba(11, 18, 32, 0.65);

  --card: rgba(255, 255, 255, 0.72);
  --card-strong: rgba(255, 255, 255, 0.88);
  --border: rgba(15, 23, 42, 0.12);

  --shadow: 0 20px 50px -20px rgba(2, 6, 23, 0.35);

  /* Mesh (light) */
  --mesh:
    radial-gradient(at 20% 10%, rgba(221, 214, 254, 0.70) 0px, transparent 55%),
    radial-gradient(at 85% 5%,  rgba(251, 207, 232, 0.55) 0px, transparent 55%),
    radial-gradient(at 55% 95%, rgba(186, 230, 253, 0.55) 0px, transparent 60%),
    radial-gradient(at 5% 75%,  rgba(199, 210, 254, 0.50) 0px, transparent 55%),
    radial-gradient(at 95% 75%, rgba(153, 246, 228, 0.35) 0px, transparent 55%);
}

/* Tema oscuro */
html[data-theme="dark"] {
  --bg: #050816;
  --fg: rgba(240, 244, 255, 0.92);
  --muted: rgba(240, 244, 255, 0.60);

  --card: rgba(10, 14, 24, 0.70);
  --card-strong: rgba(10, 14, 24, 0.86);
  --border: rgba(255, 255, 255, 0.10);

  --shadow: 0 24px 60px -22px rgba(0, 0, 0, 0.70);

  --mesh:
    radial-gradient(at 20% 10%, rgba(168, 85, 247, 0.22) 0px, transparent 55%),
    radial-gradient(at 85% 5%,  rgba(236, 72, 153, 0.18) 0px, transparent 55%),
    radial-gradient(at 55% 95%, rgba(6, 182, 212, 0.16) 0px, transparent 60%),
    radial-gradient(at 5% 75%,  rgba(59, 130, 246, 0.14) 0px, transparent 55%),
    radial-gradient(at 95% 75%, rgba(20, 184, 166, 0.12) 0px, transparent 55%);
}
```

### 2) Aplicación global (body / app wrapper)

```css
html, body {
  height: 100%;
}

body {
  background:
    var(--mesh),
    var(--bg);
  color: var(--fg);
}
```

---

## Recetas Listas para Usar (Modo Claro)

### A) Hero claro estilo “premium SaaS”

```html
<section class="relative min-h-screen overflow-hidden">
  <!-- Fondo -->
  <div class="absolute inset-0"
       style="background: var(--mesh), var(--bg);"></div>

  <!-- Overlay dots (muy sutil) -->
  <div class="absolute inset-0 opacity-[0.06]
              bg-[radial-gradient(rgba(0,0,0,0.9)_1px,transparent_1px)]
              bg-[size:18px_18px]"></div>

  <!-- Contenido -->
  <div class="relative z-10 max-w-6xl mx-auto px-8 py-28">
    <h1 class="text-5xl md:text-6xl font-bold tracking-tight">
      Tu producto, más claro y moderno
    </h1>
    <p class="mt-6 text-lg text-[var(--muted)] max-w-2xl">
      Mismo diseño, pero con modo claro elegante y legible.
    </p>

    <div class="mt-10 flex gap-4">
      <button class="px-6 py-3 rounded-full"
              style="background: rgba(15,23,42,0.92); color: white;">
        Comenzar
      </button>
      <button class="px-6 py-3 rounded-full"
              style="background: rgba(15,23,42,0.06); border: 1px solid var(--border);">
        Ver demo
      </button>
    </div>
  </div>
</section>
```

### B) Cards claras con “glass” suave

```html
<div class="p-8 rounded-3xl"
     style="background: var(--card); border: 1px solid var(--border); box-shadow: var(--shadow); backdrop-filter: blur(14px);">
  <h3 class="text-2xl font-semibold">Card Title</h3>
  <p class="mt-3" style="color: var(--muted);">
    Fondo claro con un toque glass para mantener profundidad.
  </p>
</div>
```

---

## Tailwind: Alternar temas (sin pelear con CSS)

### Opción 1: Controlado por `data-theme`

- Mantienes tokens en CSS
- En Tailwind solo usas variables

Ejemplos útiles:

```html
<div class="min-h-screen"
     style="background: var(--mesh), var(--bg); color: var(--fg);">
```

o con clases Tailwind + variables:

```html
<div class="min-h-screen text-[var(--fg)] bg-[var(--bg)]">
```

*(para el mesh, lo más simple es usar `style="background: var(--mesh), var(--bg)"`)*

### Opción 2: `dark:` de Tailwind con clase `dark`

En `tailwind.config.ts`:

```ts
export default {
  darkMode: ["class"],
}
```

y alternas poniendo `class="dark"` en `<html>`.

---

## Toggle (JS simple y fiable)

- Persiste en `localStorage`
- Respeta preferencia del sistema si no hay elección

```html
<script>
  (function () {
    const KEY = "theme";
    const saved = localStorage.getItem(KEY);

    const systemDark = window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const theme = saved || (systemDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);

    window.setTheme = function (next) {
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(KEY, next);
    };
  })();
</script>

<button onclick="setTheme('light')">Light</button>
<button onclick="setTheme('dark')">Dark</button>
```

---

## Paletas recomendadas (Light)

| Rol | Tailwind | Hex sugerido |
|-----|----------|--------------|
| Violet | `violet-200` | `#DDD6FE` |
| Pink | `pink-200` | `#FBCFE8` |
| Sky | `sky-200` | `#BAE6FD` |
| Indigo | `indigo-200` | `#C7D2FE` |
| Teal | `teal-200` | `#99F6E4` |
| Base | `white / gray-50` | `#FFFFFF / #F9FAFB` |

---

## Overlays (para que el blanco no se vea “plano”)

### Grid (muy tenue)

```html
<div class="absolute inset-0 bg-[linear-gradient(rgba(2,6,23,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(2,6,23,0.06)_1px,transparent_1px)]
            bg-[size:72px_72px] opacity-[0.12]"></div>
```

### Vignette clara (profundidad)

```html
<div class="absolute inset-0"
     style="background: radial-gradient(ellipse at center, rgba(255,255,255,0) 40%, rgba(2,6,23,0.10) 100%);"></div>
```

---

## Tips rápidos para que se vea pro en Light Mode

1. En blanco, **menos es más**: 3–4 blobs suelen verse mejor que 5.
2. Usa **bordes** (1px) y **sombras suaves** para separar cards del fondo.
3. Evita textos grises demasiado claros: apunta a `rgba(11,18,32,0.65)` como “muted”.
4. Si ves “manchas”, baja opacidades del mesh y sube blur.

---

*Documento complemento para implementar modo claro + sistema de temas (Dark ↔ Light).*
