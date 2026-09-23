exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método no permitido" }),
    };
  }

  try {
    const { ingredientes, dieta, tipoComida, calorias } = JSON.parse(event.body);

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Falta la clave de API en Netlify" }),
      };
    }

    const prompt = `
Actuá como un chef experto. Generá 3 opciones de recetas distintas usando estos ingredientes disponibles: ${ingredientes}.
La dieta debe ser: ${dieta}.
El tipo de comida es: ${tipoComida}.
Las calorías aproximadas por porción deben rondar: ${calorias} kcal.

Para cada receta dame:
- Nombre de la receta
- Lista de ingredientes con cantidades
- Paso a paso de preparación
- Calorías aproximadas totales

Respondé SOLO en formato JSON, sin texto extra, con un array de 3 objetos, cada uno con las claves: nombre, ingredientes (array), pasos (array), calorias.
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error?.message || "Error en la API de Gemini" }),
      };
    }

    const contenido = data.candidates[0].content.parts[0].text;

    // Limpiar posibles bloques de código markdown que Gemini a veces agrega
    const limpio = contenido.replace(/```json/g, "").replace(/```/g, "").trim();

    return {
      statusCode: 200,
      body: limpio,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error interno: " + error.message }),
    };
  }
};
