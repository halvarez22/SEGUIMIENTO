import { GoogleGenAI, Type } from "@google/genai";
import type { ExtractedData, HistoryEntry, ImageDataSource } from '../types';

if (!process.env.API_KEY) {
  throw new Error(
    "Gemini API Key is missing. Please ensure the API_KEY environment variable is set in your deployment environment. The application cannot function without it."
  );
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const schema = {
  type: Type.OBJECT,
  properties: {
    date: {
      type: Type.STRING,
      description: "The full date extracted from the image, formatted as YYYY-MM-DD. e.g., '2025-09-25'. If not found, return an empty string.",
    },
    time: {
      type: Type.STRING,
      description: "The exact time extracted from the image, e.g., '08:09'. If not found, return an empty string.",
    },
    location: {
      type: Type.STRING,
      description: "The full address or location name from the image, e.g., 'Blvd. Juan Alonso de Torres Pte. 1124, Predio Cerro Gordo, 37150 León de los Aldama, Gto., México'. If not found, return an empty string.",
    },
    latitude: {
        type: Type.NUMBER,
        description: "The geographic latitude coordinate. For Mexico, this is a positive number. Return null if not found or uncertain.",
    },
    longitude: {
        type: Type.NUMBER,
        description: "The geographic longitude coordinate. For Mexico, this is a negative number. Return null if not found or uncertain.",
    },
  },
  required: ["date", "time", "location", "latitude", "longitude"],
};

export const analyzeImageForLocation = async (
  imageData: ImageDataSource
): Promise<ExtractedData> => {
  const prompt = `
    Analyze the provided image, which shows a location history screen. 
    Your task is to extract the following information:
    1.  **Fecha (Date):** The EXACT date shown in the image for THIS specific location entry. Look carefully at the date displayed for the location pin/marker. Format this as YYYY-MM-DD (e.g., '2025-10-02' for October 2, 2025). DO NOT use today's date or any default date. Extract ONLY the date that is actually visible in the image for this specific location entry.
    2.  **Hora (Time):** The exact time associated with the location pin shown in the image. Format as HH:MM (e.g., '14:30').
    3.  **Lugar (Location):** The complete address or place name shown in the image.
    4.  **Coordinates:** The precise geographic coordinates (latitude and longitude) for the location address. The latitude for locations in Mexico should be a positive number (North), and the longitude should be a negative number (West). For example, Mexico City is around 19.4326° N, -99.1332° W. Prioritize accuracy and return null if you cannot determine the coordinates with high confidence.
    
    **CRITICAL CONTEXT:** 
    - All locations in this image are within or very near the city of **León, Guanajuato, México**. Use this information to disambiguate the address and find the most accurate coordinates.
    - IMPORTANT: Each image may show a different date. Extract the SPECIFIC date shown for THIS location entry in the image, not a generic or default date.
    - If the date is not clearly visible or readable in the image, return an empty string for the date field.

    Return the information in a structured JSON object. The user's original request was in Spanish: 'analiza la imagen y dime si puedes extraer los siguientes datos: Fecha, Hora y lugar'.
    Strictly adhere to the provided JSON schema. If a piece of information cannot be found, return an empty string for text fields and null for numeric fields. Do not add any explanatory text outside the JSON object.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: imageData.mimeType,
              data: imageData.data,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const jsonText = response.text.trim();
    const parsedData = JSON.parse(jsonText);

    // Log para debugging: ver qué fecha está extrayendo
    console.log('📅 Fecha extraída de la imagen:', parsedData.date);
    console.log('⏰ Hora extraída:', parsedData.time);
    console.log('📍 Ubicación extraída:', parsedData.location);

    if (
      typeof parsedData.date === 'string' &&
      typeof parsedData.time === 'string' &&
      typeof parsedData.location === 'string' &&
      (typeof parsedData.latitude === 'number' || parsedData.latitude === null) &&
      (typeof parsedData.longitude === 'number' || parsedData.longitude === null)
    ) {
      return parsedData;
    } else {
      throw new Error('Invalid data structure received from API.');
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to analyze image. The API returned an error.");
  }
};

export const getChatbotResponse = async (
  question: string,
  history: HistoryEntry[]
): Promise<string> => {
  // Importar función de geocodificación inversa dinámicamente
  const { getReadableAddress } = await import('../utils/reverseGeocoding');
  
  // Procesar historial: obtener direcciones legibles solo cuando sea necesario
  // Optimización: solo hacer reverse geocoding si location está vacío o es genérico
  const processedHistory = await Promise.all(
    history.map(async (entry) => {
      // Verificar si location es válido y legible
      const locationValue = entry.data.location?.trim() || '';
      
      // Detectar valores inválidos comunes (incluyendo formatos de hora)
      const invalidPatterns = [
        /^\d+\s*-\s*\d{1,2}:\d{2}/, // Formato de hora como "1 - 00:05" o "1 - 1:14"
        /^\d+\s*-\s*\d{1,2}:\d{2}\s+a\s+\d{1,2}:\d{2}/, // Formato de rango de hora como "1 - 1:14 a 11:24"
        /^-?\d+\.\d+,\s*-?\d+\.\d+$/, // Solo coordenadas
        /^Sin hora$/i,
        /^N\/A$/i,
        /^\d+\s*-\s*\d{1,2}:\d{2}\s*$/, // Formato "número - hora" al final
      ];
      
      const isInvalid = invalidPatterns.some(pattern => pattern.test(locationValue));
      
      const hasValidLocation = locationValue !== '' &&
        locationValue !== 'Ubicación sin nombre' &&
        locationValue !== 'Unknown Location' &&
        locationValue !== 'Ubicación no disponible' &&
        !isInvalid;

      let readableLocation: string;
      
      if (hasValidLocation) {
        // Ya tenemos una ubicación legible, usarla directamente
        readableLocation = locationValue;
      } else {
        // No hay ubicación legible, intentar reverse geocoding
        if (entry.data.latitude !== null && entry.data.longitude !== null) {
          readableLocation = await getReadableAddress({
            location: locationValue,
            latitude: entry.data.latitude,
            longitude: entry.data.longitude,
          });
        } else {
          // No hay coordenadas ni ubicación válida
          readableLocation = 'Ubicación no disponible';
        }
      }

      // Log para debugging (solo primeras 5 entradas del 25 de octubre si es la pregunta)
      const isOct25 = entry.data.date === '2025-10-25';
      const shouldLog = history.indexOf(entry) < 5 || isOct25;
      
      if (shouldLog) {
        console.log(`🔍 Entry ${history.indexOf(entry) + 1} (${entry.data.date}):`, {
          date: entry.data.date,
          time: entry.data.time,
          originalLocation: entry.data.location,
          hasValidLocation,
          readableLocation,
          hasCoords: entry.data.latitude !== null && entry.data.longitude !== null,
          coords: entry.data.latitude !== null ? `${entry.data.latitude}, ${entry.data.longitude}` : 'N/A'
        });
      }
      
      // Si el location original tiene formato de hora, forzar reverse geocoding
      if (!hasValidLocation && entry.data.latitude !== null && entry.data.longitude !== null) {
        console.log(`🔄 Haciendo reverse geocoding para entry ${history.indexOf(entry) + 1} (${entry.data.date}) porque location tiene formato inválido: "${locationValue}"`);
      }

      // Verificar si readableLocation sigue siendo inválido (incluyendo formatos de hora)
      const finalInvalidPatterns = [
        /^\d+\s*-\s*\d{1,2}:\d{2}/, // Formato "1 - 1:14" o "1 - 00:05"
        /^\d+\s*-\s*\d{1,2}:\d{2}\s+a\s+\d{1,2}:\d{2}/, // Formato "1 - 1:14 a 11:24"
      ];
      
      const isStillInvalid = !readableLocation ||
                            readableLocation.trim() === '' ||
                            readableLocation === 'Ubicación no disponible' ||
                            readableLocation === 'Ubicación sin nombre' ||
                            readableLocation === 'Unknown Location' ||
                            finalInvalidPatterns.some(pattern => pattern.test(readableLocation));
      
      if (isStillInvalid && entry.data.latitude !== null && entry.data.longitude !== null) {
        console.warn(`⚠️ Forzando reverse geocoding para entry ${history.indexOf(entry) + 1} (${entry.data.date}) porque location es inválido: "${readableLocation}"`);
        const geocodedAddress = await getReadableAddress({
          location: '',
          latitude: entry.data.latitude,
          longitude: entry.data.longitude,
        });
        if (geocodedAddress && geocodedAddress !== 'Ubicación no disponible') {
          readableLocation = geocodedAddress;
          console.log(`✅ Reverse geocoding exitoso: ${readableLocation}`);
        } else {
          readableLocation = `Ubicación en ${entry.data.latitude.toFixed(6)}, ${entry.data.longitude.toFixed(6)}`;
        }
      }

      return {
        date: entry.data.date,
        time: entry.data.time || 'Sin hora',
        ubicacion: readableLocation, // Usar nombre en español y siempre dirección legible
        // No incluir coordenadas en la respuesta para ahorrar tokens y evitar confusión
      };
    })
  );

  // Filtrar y limpiar datos antes de enviar
  const cleanedHistory = processedHistory
    .filter(entry => entry.date && entry.date.trim() !== '') // Solo entradas con fecha
    .map(entry => ({
      fecha: entry.date,
      hora: entry.time,
      ubicacion: entry.ubicacion
    }))
    .filter(entry => {
      // Filtrar entradas con ubicación válida (no vacía, no genérica, no formato de hora)
      const ubicacion = entry.ubicacion?.trim() || '';
      
      // Patrones que indican que NO es una ubicación válida
      const invalidPatterns = [
        /^\d+\s*-\s*\d{1,2}:\d{2}/, // Formato "1 - 1:14" o "1 - 00:05"
        /^\d+\s*-\s*\d{1,2}:\d{2}\s+a\s+\d{1,2}:\d{2}/, // Formato "1 - 1:14 a 11:24"
        /^-?\d+\.\d+,\s*-?\d+\.\d+$/, // Solo coordenadas
      ];
      
      const isInvalid = invalidPatterns.some(pattern => pattern.test(ubicacion));
      
      const isValid = ubicacion !== '' &&
        ubicacion !== 'Ubicación no disponible' &&
        ubicacion !== 'Ubicación sin nombre' &&
        ubicacion !== 'Unknown Location' &&
        !isInvalid;
      
      if (!isValid && entry.fecha === '2025-10-25') {
        console.warn(`❌ Filtrando entrada del 25 de octubre con ubicación inválida: "${ubicacion}"`);
      }
      
      return isValid;
    });

  // Log final de datos que se enviarán al LLM
  console.log('📤 Datos finales enviados al LLM:', JSON.stringify(cleanedHistory.slice(0, 10), null, 2));

  // Log para debugging (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Datos enviados al chatbot:', JSON.stringify(cleanedHistory.slice(0, 5), null, 2));
  }

  const prompt = `
    Eres un asistente de viajes inteligente y amigable. Tu tarea es analizar el historial de ubicaciones proporcionado y responder las preguntas del usuario de forma natural y conversacional.

    **ESTRUCTURA DE DATOS:**
    Cada entrada en el historial tiene:
    - "fecha": La fecha en formato YYYY-MM-DD (ej: "2025-10-25")
    - "hora": La hora en formato HH:MM (ej: "14:30") o "Sin hora"
    - "ubicacion": El nombre o dirección del lugar (ej: "Strauss 375-301, León, Guanajuato")

    **REGLAS CRÍTICAS:**
    1.  Tus respuestas **DEBEN** basarse EXCLUSIVAMENTE en los datos JSON proporcionados.
    2.  NUNCA inventes información o uses conocimiento externo.
    3.  Si la respuesta no se puede encontrar en los datos, di: "No tengo suficiente información en el historial para responder eso."
    4.  **MUY IMPORTANTE - LEE CON ATENCIÓN**: 
       - El campo "hora" contiene SOLO la hora (ej: "14:30" o "00:05"). 
       - El campo "hora" NUNCA contiene una ubicación o lugar.
       - El campo "ubicacion" contiene el nombre o dirección del lugar (ej: "Strauss 375-301" o "Blvd. López Mateos 1234").
       - Cuando el usuario pregunte "¿dónde estuve?" o "¿qué lugares visité?", SIEMPRE y EXCLUSIVAMENTE usa el campo "ubicacion".
       - NUNCA, bajo ninguna circunstancia, uses el campo "hora" como si fuera una ubicación.
       - Si ves "1 - 00:05 a 23:49" en el campo "hora", eso es SOLO un rango de horas, NO es un lugar.
    5.  Responde en español de forma natural, conversacional y amigable.
    6.  Cuando menciones lugares, usa EXACTAMENTE el texto del campo "ubicacion". Si el campo "ubicacion" está vacío o dice "Ubicación no disponible", di que no tienes esa información.
    7.  Si el usuario pregunta por una fecha específica (ej: "25 de octubre"), busca entradas donde "fecha" sea "2025-10-25".
    8.  Si preguntan por "sitio favorito" o "lugar más visitado", cuenta cuántas veces aparece cada "ubicacion" diferente (ignorando el campo "hora").

    **EJEMPLO DE RESPUESTA CORRECTA:**
    Usuario: "¿Dónde estuve el 25 de octubre?"
    Respuesta: "El 25 de octubre de 2025 estuviste en los siguientes lugares:
    - Strauss 375-301, León, Guanajuato (a las 14:30)
    - Blvd. López Mateos 1234 (a las 16:45)
    Total: 2 lugares diferentes."

    **Historial de Viajes (datos JSON):**
    ${JSON.stringify(cleanedHistory, null, 2)}

    **Pregunta del Usuario:**
    "${question}"

    Responde en español de forma natural y amigable. Usa SOLO el campo "ubicacion" para mencionar lugares, NUNCA el campo "hora".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API for chatbot:", error);
    throw new Error("Failed to get a response from the assistant. Please try again.");
  }
};
