# Portfolio-aware allocation

La aportación nueva ya no depende solo del score.

Para cada activo:

1. Se calcula la exposición existente usando `proxySymbol`.
2. Se estima el peso de ese activo después de sumar la nueva aportación.
3. Se aplica un límite de cartera post-compra.
4. Si no queda espacio, el activo recibe 0 € aunque su score sea alto.
5. Los activos con poca exposición reciben un pequeño bonus de diversificación.
6. Los caps de la aportación (BTC / acción individual) siguen aplicándose.

Esto evita recomendaciones del tipo “compra más del activo con mejor score” cuando ya domina la cartera.
