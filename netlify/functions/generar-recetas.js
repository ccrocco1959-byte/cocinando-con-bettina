exports.handler = async function (event, context) {
  // Solo permitir POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método no permitido" }),
    };
  }

  try {
    const { ingredientes, dieta, tipoComida, calorias } = JSON.parse(event.body);

    const apiKey = process.env.OPENAI_API_KEY;

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

Respondé en formato JSON con un array de 3 objetos, cada uno con las claves: nombre, ingredientes (array), pasos (array), calorias.
No agregues texto extra fuera del JSON.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error?.message || "Error en la API de OpenAI" }),
      };
    }

    const contenido = data.choices[0].message.content;

    return {
      statusCode: 200,
      body: contenido,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error interno: " + error.message }),
    };
  }
};
