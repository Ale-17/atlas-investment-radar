# Atlas V5 — Personal Finance, Portfolio & Investment Radar

Atlas es un dashboard estático y gratuito para GitHub Pages que combina:

1. **Planificación mensual privada**
   - ingresos netos;
   - vivienda;
   - gastos fijos;
   - gastos esenciales variables;
   - cuotas/deuda;
   - colchón líquido actual;
   - perfil de asignación;
   - meses de colchón objetivo.

2. **Motor de reparto**
   - calcula dinero libre;
   - propone inversión, ocio y reserva;
   - si el colchón es bajo prioriza liquidez;
   - si el mercado está `risk-off`, reduce ligeramente la exposición nueva;
   - nunca ejecuta movimientos.

3. **Radar cuantitativo de mercado**
   - GitHub Actions descarga mercado;
   - Python calcula indicadores;
   - cada activo recibe score 0–100;
   - la parte destinada a inversión se reparte entre las mejores señales respetando límites.

## Privacidad

Los datos personales del presupuesto **no se escriben en el repositorio**. Se guardan en `localStorage` con la clave:

```text
atlas_finance_v2
```

El repositorio solo contiene mercado, configuración del modelo y código.

## Flujo

```text
             ┌─────────────────────────────┐
             │       GitHub Actions        │
             │ mercado + indicadores       │
             └──────────────┬──────────────┘
                            │
                            v
                 docs/data/latest.json
                            │
                            v
┌────────────────────────────────────────────────────────┐
│                    GitHub Pages                        │
│                                                        │
│  Nómina ──> gastos ──> dinero libre ──> plan mensual   │
│                                      │                 │
│                                      v                 │
│                              presupuesto inversión     │
│                                      │                 │
│                                      v                 │
│                              asignador de activos      │
│                                                        │
│  Datos privados: únicamente localStorage del navegador │
└────────────────────────────────────────────────────────┘
```

## Reglas del presupuesto v2

El sistema evita la regla rígida 50/30/20. Parte de tus gastos reales y del estado de tu colchón.

- **Colchón < 1 mes:** prioridad alta a liquidez y menor inversión nueva.
- **Colchón entre 1 mes y el objetivo:** inversión moderada/agresiva + reconstrucción simultánea del colchón.
- **Colchón cubierto:** el slider de perfil puede asignar aproximadamente 45–85% del dinero flexible a inversión.
- **Mercado risk-off:** resta 10 puntos porcentuales al peso de inversión antes de normalizar el reparto.
- **Ocio:** se mantiene como partida explícita para evitar que el plan dependa de “no gastar nada”.
- **Reserva:** colchón + liquidez táctica para oportunidades/imprevistos.

Las reglas son deliberadamente transparentes y editables en `docs/app.js`.

## Arranque local

```bash
python -m pip install -r requirements.txt
python src/run.py
python -m http.server 8000 -d docs
```

Abre `http://localhost:8000`.

## GitHub Pages

Publica la carpeta `/docs` desde la rama `main`.

## Siguiente evolución recomendada

- histórico mensual local (incluido); exportación/importación será la siguiente mejora;
- cartera real introducida manualmente;
- rentabilidad y P&L;
- objetivos (viajes, entrada vivienda, etc.);
- productos UCITS concretos de MyInvestor / Trade Republic;
- fundamentales de acciones;
- backtesting;
- alertas de oportunidad;
- exportar/importar copia cifrada de la configuración local.


## V3 — Cartera real y objetivos

La V3 añade dos piezas que cambian el comportamiento del recomendador:

### Cartera real local

Puedes registrar manualmente posiciones de MyInvestor, Trade Republic u otros brokers:

- nombre;
- tipo;
- broker;
- valor actual;
- coste total;
- proxy de señal.

El proxy conecta un producto real con la señal del radar. Ejemplo: un fondo MSCI World puede usar `URTH` como proxy técnico. El asignador calcula la exposición existente y limita nuevas compras cuando el peso post-aportación superaría los límites del modelo.

### Objetivos

Cada objetivo tiene:

- importe objetivo;
- importe ya ahorrado;
- fecha;
- prioridad.

Atlas calcula la necesidad mensual teórica. La aportación real recomendada queda limitada según el estado del colchón y el perfil:

- menos de 1 mes de colchón: los objetivos reciben como máximo una fracción pequeña del dinero libre;
- colchón en construcción: los objetivos avanzan, pero compiten con reserva e inversión;
- colchón cubierto: los objetivos pueden recibir una parte mayor del dinero libre;
- prioridad alta eleva moderadamente el máximo permitido.

### Privacidad

Cartera, objetivos, presupuesto e histórico siguen en `localStorage`. No se escriben en `docs/data/latest.json` ni en GitHub.

### Backup

La sección Cartera permite **exportar e importar** un JSON con presupuesto, histórico, cartera, objetivos y límites del modelo. Sirve para pasar la configuración entre móvil y PC sin almacenarla en GitHub.


## V4 — App instalable + Strategy Lab

### PWA

La carpeta `docs/` ahora incluye:

- `manifest.webmanifest`;
- `sw.js`;
- iconos 192/512;
- caché del shell;
- datos de mercado/backtest con estrategia network-first.

En navegadores compatibles, Atlas se puede instalar en la pantalla de inicio y abrir en modo standalone.

### Strategy Lab

`src/backtest.py` ejecuta una validación histórica de aproximadamente 7 años:

- lookback mínimo de 252 sesiones;
- score calculado únicamente con datos disponibles hasta cada fecha;
- decisión aproximadamente semanal;
- score ≥ 60 = exposición;
- score < 60 = liquidez;
- señal aplicada desde la siguiente sesión para evitar look-ahead;
- comparación contra Buy & Hold;
- retorno acumulado, CAGR, drawdown máximo, tiempo en mercado y cambios de posición.

El workflow `.github/workflows/backtest.yml` se ejecuta mensualmente y también admite lanzamiento manual.

No se incluyen impuestos, spreads, comisiones ni rentabilidad del efectivo; por tanto, el backtest es una validación de la lógica, no una promesa de rentabilidad.


## Release-ready deployment

This package includes:

- automatic GitHub Pages deployment: `.github/workflows/pages.yml`;
- project validation: `.github/workflows/validate.yml`;
- `.nojekyll`;
- deployment instructions in `DEPLOYMENT.md`.

For the repository Pages source, choose **GitHub Actions**.


## V5 — Decision Center, gastos detallados, deuda y stress test

### Decision Center

Convierte las reglas internas en tres acciones concretas y priorizadas del mes. Puede recomendar:
- proteger colchón;
- invertir;
- reservar para objetivos;
- limitar ocio;
- amortizar deuda cara.

### Gastos fijos detallados

Los conceptos recurrentes pueden registrarse individualmente con categoría, importe y día aproximado de cargo. Cuando existen conceptos detallados, su suma sustituye el campo agregado de gastos fijos.

### Deudas

Cada deuda admite:
- saldo pendiente;
- cuota mensual;
- TAE;
- prioridad subjetiva.

La cuota se incorpora a las obligaciones mensuales. Atlas puede sugerir amortización extra cuando la TAE/prioridad lo justifica, sin ejecutar ningún pago.

Heurística transparente:
- TAE >= 10%: prioridad alta;
- TAE >= 7%: prioridad relevante;
- TAE >= 4%: puede competir parcialmente con inversión;
- colchón bajo limita cualquier amortización extra.

### Stress test

Simula:
- caída de ingresos del 20%;
- gasto extraordinario de 500 €;
- cobertura actual del colchón;
- semáforo financiero.

### Móvil

La V5 añade navegación inferior tipo app para Presupuesto, Cartera, Radar y Strategy Lab.
