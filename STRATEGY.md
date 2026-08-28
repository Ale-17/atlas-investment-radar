# Estrategia aggressive-v1

Objetivo: detectar oportunidades de entrada sin convertir el sistema en un bot de trading de alta frecuencia.

## Principios

1. **Tendencia primero.** Una caída no es automáticamente una oportunidad.
2. **Comprar debilidad dentro de estructuras sanas.**
3. **No perseguir movimientos parabólicos.**
4. **Diversificación mínima obligatoria.**
5. **Cripto y acciones individuales tienen caps.**
6. **Régimen general de mercado reduce/agrega convicción.**
7. **El score es un filtro, no una orden.**

## Perfil por defecto del simulador

- BTC: máximo 35% de una nueva aportación.
- Acción individual: máximo 15%.
- Índices/proxies: máximo según `config/assets.json`.
- Sólo activos con score >= 50 participan en el simulador.

Estos límites son parámetros del modelo y pueden modificarse.
