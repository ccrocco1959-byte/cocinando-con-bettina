exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método no permitido" }),
    };
  }

  try {
    const { ingredientes, dieta, tipoComida, calorias, sabor } = JSON.parse(event.body);

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
El sabor preferido es: ${sabor}.
Las calorías aproximadas por porción deben rondar: ${calorias} kcal.

Para cada receta dame:
- Nombre de la receta
- Lista de ingredientes con cantidades
- Paso a paso de preparación
- Calorías aproximadas totales

Respondé SOLO en formato JSON, sin texto extra, con un array de 3 objetos, cada uno con las claves: nombre, ingredientes (array), pasos (array), calorias.
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const body = JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    });

    let data;
    let response;
    let intentos = 0;
    const maxIntentos = 3;

    while (intentos < maxIntentos) {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
      });

      data = await response.json();

      const mensajeError = data.error?.message || "";
      const esSaturacion =
        mensajeError.includes("high demand") ||
        mensajeError.includes("overloaded") ||
        response.status === 503;

      if (response.ok) {
        break;
      }

      if (esSaturacion && intentos < maxIntentos - 1) {
        intentos++;
        await new Promise((resolve) => setTimeout(resolve, 2500));
        continue;
      }

      return {
        statusCode: response.status,
        body: JSON.stringify({
          error:
            mensajeError ||
            "Error en la API de Gemini. Probá de nuevo en unos minutos.",
        }),
      };
    }

    const contenido = data.candidates[0].content.parts[0].text;

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
