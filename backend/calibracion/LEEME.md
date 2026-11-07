# Fotos para calibrar el umbral de coincidencias

`npm --prefix backend run db:calibrar` lee esta carpeta. Las fotos **no se suben a git** (pueden ser de tus mascotas o de vecinos); solo este archivo.

## Estructura: una carpeta por animal

```
calibracion/
  perro-rocky/          foto1.jpg  foto2.jpg  foto3.jpg
  perro-negro-toby/     a.jpg  b.jpg
  perro-negro-luna/     1.jpg  2.jpg
  gato-michi/           1.jpg  2.jpg
  gato-negro-sombra/    x.jpg  y.jpg
```

- El nombre **debe empezar** con `perro-` o `gato-`.
- **2 a 4 fotos distintas del mismo animal** por carpeta (otro día, otro ángulo, otra luz). Sin eso no se puede medir si reconoce al mismo animal.
- Mientras más animales, mejor: ideal 8+ en total.
- **Incluye los casos difíciles:** varias mascotas negras (son las que más se confunden entre sí), perros de la misma raza y fotos de noche o movidas.
- Formatos: `.jpg`, `.png`, `.webp`.

## Cómo leer el resultado

- **Detecta mismo animal**: queremos este % alto.
- **Falsa alarma**: % de veces que avisaría "posible coincidencia" con OTRO animal de la misma especie. Queremos este % bajo.
- El script sugiere el umbral más bajo con ≤ 5 % de falsas alarmas. Se aplica con `UMBRAL_COINCIDENCIA` en `backend/.env`.
