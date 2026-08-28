# Atlas News Radar

Atlas News Radar añade contexto informativo diario sin convertir titulares en órdenes.

## Fuente

El workflow consulta el endpoint público GDELT DOC 2.0 y guarda únicamente metadatos:

- titular;
- URL original;
- dominio;
- fecha/hora;
- categoría;
- activos/temas detectados;
- score heurístico de relevancia.

No se copia el cuerpo de los artículos.

## Actualización

- días laborables: 06:15, 10:15, 14:15, 18:15 y 22:15 UTC;
- fines de semana: 09:15, 15:15 y 21:15 UTC;
- también puede ejecutarse manualmente.

La ventana de noticias es de 24 horas.

## Relevancia

El score considera actualidad, coincidencias con activos del universo Atlas, temas macro, catalizadores y una bonificación limitada para fuentes financieras conocidas.

El score mide relevancia informativa, no dirección esperada del precio.

## Personalización

La cartera privada no sale del navegador. `news.js` compara localmente los `proxySymbol` de las posiciones guardadas con las etiquetas públicas de cada noticia y prioriza esas noticias en **Para ti**.

GitHub nunca recibe la cartera del usuario.
