exports.handler = async function (event) {
  // Solo aceptar POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  try {
    const { sobras, alacena, dieta, sabor, sinSobras } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Falta configurar la API key en Netlify' }) };
    }

    const listaSobras = sobras && sobras.length ? sobras.join(', ') : 'ninguna';
    const listaAlacena = alacena && alacena.length ? alacena.join(', ') : 'ninguno';

    const prompt = `
Actuá como un chef profesional creativo. Generá EXACTAMENTE 3 recetas en formato JSON, sin texto adicional antes ni después, sin markdown, solo el JSON puro.

Contexto:
${sinSobras ? '- El usuario NO tiene sobras, quiere una receta nueva desde cero.' : `- Sobras de comida disponibles: ${listaSobras}`}
- Ingredientes de alacena/heladera disponibles: ${listaAlacena}
- Tipo de dieta requerida: ${dieta}
- Preferencia de sabor: ${sabor}

Reglas:
1. Las 3 recetas deben tener estilos DIFERENTES: la primera Argentina, la segunda Mediterránea, la tercera un estilo sorpresa distinto cada vez (Japonesa, Thai, Mexicana, Armenia, Judía, Peruana, Marroquí, India, etc - variá el estilo cada vez que generes).
2. ${sinSobras ? 'Usá ingredientes comunes de alacena/heladera argentina típica si no se especificaron.' : 'DEBÉS reutilizar de forma creativa las sobras mencionadas como ingrediente principal reprocesado.'}
3. Respetá estrictamente la dieta indicada (si es celíaca: sin TACC: si es vegana: sin ningún producto animal; si es keto: bajo en carbohidratos; si es diabética: bajo índice glucémico, etc).
4. El sabor "${sabor}" debe reflejarse en la preparación.
5. Cada receta debe incluir calorías aproximadas realistas por porción.
6. Los pasos deben ser claros, numerados, y realmente ejecutables en una cocina hogareña.
7. Las cantidades de ingredientes deben ser realistas para 2 porciones.

Formato JSON exacto (array de 3 objetos):
[
  {
    "estilo": "Argentina",
    "nombre": "Nombre apetitoso del plato",
    "descripcion": "Descripción corta y apetitosa en 1 frase",
    "calorias": 450,
    "dieta": "${dieta}",
    "tiempoPrep": "25 min",
    "ingredientes": ["200g de ...", "1 taza de ...", "..."],
    "pasos": ["Paso 1 detallado...", "Paso 2 detallado...", "..."],
    "emoji": "🥘"
  },
  { "estilo": "Mediterránea", ... },
  { "estilo": "(estilo sorpresa)", ... }
]
`.trim();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Error de Gemini:', data);
      return { statusCode: 500, body: JSON.stringify({ error: 'Error consultando la IA', detalle: data }) };
    }

    const textoIA = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textoIA) {
      return { statusCode: 500, body: JSON.stringify({ error: 'La IA no devolvió contenido' }) };
    }

    let recetas;
    try {
      recetas = JSON.parse(textoIA);
    } catch (e) {
      const match = textoIA.match(/\[[\s\S]*\]/);
      if (match) {
        recetas = JSON.parse(match[0]);
      } else {
        throw new Error('No se pudo parsear la respuesta de la IA');
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recetas })
    };

  } catch (error) {
    console.error('Error general:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno', detalle: error.message })
    };
  }
};