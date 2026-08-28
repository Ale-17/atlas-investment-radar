# Budget Engine v2

El motor mensual vive en `docs/app.js` para que sea completamente transparente.

## Entradas

- ingreso neto;
- vivienda;
- gastos fijos;
- esenciales variables;
- deuda/cuotas;
- colchón líquido actual;
- agresividad 45–85;
- objetivo de colchón 1–6 meses.

## Orden lógico

1. Se restan obligaciones y esenciales.
2. Se calcula el dinero flexible.
3. Se calcula cobertura del colchón.
4. Se determina el reparto flexible entre inversión, ocio y reserva.
5. `risk-off` puede reducir el peso de inversión.
6. La parte de inversión pasa al asignador de mercado.

## Guardrails

- Si `ingresos <= gastos base`, inversión y ocio pasan a 0.
- Colchón inferior a 1 mes limita inversión.
- El dashboard nunca ejecuta operaciones.
- Los datos del presupuesto permanecen en localStorage.
