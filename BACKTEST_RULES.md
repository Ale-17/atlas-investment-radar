# Backtest Rules

Objetivo: comprobar si la señal técnica merece seguir existiendo.

## Metodología V1

- histórico: ~7 años;
- calentamiento: 252 sesiones;
- rebalance: cada 5 sesiones;
- threshold: score >= 60;
- ejecución: posición cambia desde la sesión siguiente;
- benchmark: buy & hold del mismo activo;
- market regime: S&P 500 + Nasdaq 100 respecto a SMA200.

## Métricas

- retorno acumulado;
- CAGR;
- máximo drawdown;
- tiempo invertido;
- número de cambios de exposición.

## Límites

Este test no incluye:
- fiscalidad;
- comisiones;
- spread;
- slippage;
- rentabilidad de la liquidez;
- diferencias entre proxy y producto UCITS real.

Por diseño no debe utilizarse como argumento único para invertir.
