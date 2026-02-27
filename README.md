# Arcade — Portal de minijuegos

Proyecto de portal de minijuegos en la web con Vite, React, TypeScript, React Router y lazy loading por juego. Los juegos pueden ser 2D (Phaser) o 3D (Three.js).

## Cómo correr

```bash
pnpm install
pnpm dev
```

Abre [http://localhost:5173](http://localhost:5173). El hub muestra las cards de juegos; haz clic en **Play** para entrar a cada uno.

```bash
pnpm build    # build de producción
pnpm preview  # previsualizar build
pnpm lint     # ESLint
pnpm format   # Prettier
```

## Cómo agregar un juego nuevo

1. **Copiar la plantilla**
   - Duplica la carpeta `src/games/_template/` y renómbrala al **slug** del juego (ej: `bullethell`, `snake`).
   - El slug es la parte de la URL: `/game/bullethell`.

2. **Editar archivos del juego**
   - `constants.ts`: define `GAME_ID` (mismo que slug) y `TITLE`.
   - `game.ts`: implementa la lógica (Phaser o Three.js). La función debe:
     - Recibir el `container` (div) y un objeto de callbacks (p. ej. `onScore`).
     - Devolver una función **cleanup** que detenga loops, disponga recursos y quite listeners.
   - `index.tsx`: ya conecta `GameShell` con el juego; ajusta si necesitas más estado o callbacks.

3. **Registrar el juego en el hub**
   - En `src/app/routes/gameRegistry.ts`:
     - Añade el juego al array `GAMES` (id, slug, title, description, kind: `'2d'` o `'3d'`).
     - Añade el loader en `gameLoaders`:  
       `'slug': () => import('../../games/slug')`.

4. **Convenciones**
   - **gameId** y **slug** deben coincidir (ej: `tetris`, `target-range-3d`).
   - El best score local se guarda en `localStorage` con la key `arcade:best:<gameId>`.
   - Cada juego se carga en un **chunk separado** (lazy); Phaser/Three solo se descargan al entrar a ese juego.

## Convenciones gameId / slug

- **slug**: usado en la URL (`/game/:slug`). Minúsculas, guiones (ej: `target-range-3d`).
- **gameId**: mismo valor que slug; se usa para persistencia (best score) y API futura.
- En `GAMES` y `gameLoaders` las keys son los slugs.

## Cómo funciona el lazy load y el shell

- **Lazy load**: En `GameRoute` se usa `React.lazy(loader)` donde `loader` es  
  `() => import('../../games/tetris')`. Así, el código de cada juego (y sus deps como Phaser o Three) va en un chunk aparte y solo se descarga al navegar a ese juego.
- **Game Shell**: Cada juego se renderiza dentro de `GameShell`, que proporciona:
  - HUD con score actual y best score (localStorage).
  - Botones: Restart, Fullscreen, Back to Hub.
  - El best score se actualiza automáticamente cuando el score actual lo supera.

## Estructura relevante

```
src/
  app/           # Rutas, layout, hub
  games/
    _shared/     # GameShell, hooks (useLocalBestScore, useFullscreen), types, storage
    _template/   # Plantilla para copiar y crear un juego nuevo
    tetris/      # Juego stub 2D
    target-range-3d/  # Juego stub 3D (Three.js)
  lib/
    api.ts       # Stubs para futuro backend de scores
    analytics.ts # Stub analytics
```

## Backend (futuro)

En `src/lib/api.ts` hay stubs de `submitScore()` y `getLeaderboard()`. Cuando tengas backend, implementa ahí las llamadas reales.
