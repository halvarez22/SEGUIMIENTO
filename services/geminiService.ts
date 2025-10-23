import { GoogleGenAI, Type } from "@google/genai";
import type { ExtractedData, HistoryEntry, ImageDataSource } from '../types';
import { DataAnalysisService } from './dataAnalysisService';

// Verificar API key de múltiples fuentes
let apiKey = import.meta.env.VITE_API_KEY ||
             localStorage.getItem('kmz_gemini_api_key') ||
             sessionStorage.getItem('kmz_gemini_api_key');

// Inicializar AI solo si hay API key
let ai: GoogleGenAI | null = null;
if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (error) {
    console.warn('Error initializing Gemini AI:', error);
    ai = null;
  }
}

// Estado de disponibilidad del chatbot
export const isChatbotAvailable = (): boolean => {
  return ai !== null;
};

// Función para configurar API key dinámicamente
export const setApiKey = (newApiKey: string): boolean => {
  try {
    ai = new GoogleGenAI({ apiKey: newApiKey });

    // Guardar en localStorage para persistencia
    localStorage.setItem('kmz_gemini_api_key', newApiKey);
    sessionStorage.setItem('kmz_gemini_api_key', newApiKey);

    console.log('✅ Gemini API key configurada correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error configurando Gemini API key:', error);
    return false;
  }
};

// Función para remover API key
export const removeApiKey = (): void => {
  ai = null;
  localStorage.removeItem('kmz_gemini_api_key');
  sessionStorage.removeItem('kmz_gemini_api_key');
  console.log('🗑️ Gemini API key removida');
};

/**
 * Procesa consultas analíticas inteligentes
 */
export const processAnalyticalQuery = async (query: string, history: HistoryEntry[]): Promise<string> => {
  if (!ai) {
    return "Lo siento, el servicio de IA no está disponible. Configura una API key de Gemini para usar consultas inteligentes.";
  }

  try {
    // Detectar tipo de consulta
    const queryLower = query.toLowerCase();

    // Consulta: puntos más visitados
    if (queryLower.includes('más visitad') || queryLower.includes('frecuencia') || queryLower.includes('visitados')) {
      const mostVisited = await DataAnalysisService.getMostVisitedPoints(10);

      if (mostVisited.length === 0) {
        return "No tengo suficientes datos para determinar los puntos más visitados.";
      }

      let response = "🏆 **Puntos Más Visitados:**\n\n";
      mostVisited.slice(0, 5).forEach((point, index) => {
        response += `${index + 1}. **${point.location}**\n`;
        response += `   📍 ${point.visitCount} visitas\n`;
        response += `   🗺️ Coordenadas: ${point.coordinates.lat.toFixed(4)}, ${point.coordinates.lng.toFixed(4)}\n`;
        response += `   🕐 Última visita: ${new Date(point.lastVisit).toLocaleDateString('es-ES')}\n\n`;
      });

      return response;
    }

    // Consulta: rutas más utilizadas
    if (queryLower.includes('ruta más') || queryLower.includes('ruta utilizada') || queryLower.includes('ruta frecuente')) {
      const mostUsedRoutes = await DataAnalysisService.getMostUsedRoutes(5);

      if (mostUsedRoutes.length === 0) {
        return "No tengo suficientes datos sobre rutas para determinar las más utilizadas.";
      }

      let response = "🛣️ **Rutas Más Utilizadas:**\n\n";
      mostUsedRoutes.forEach((route, index) => {
        response += `${index + 1}. **${route.route}**\n`;
        response += `   🔄 ${route.usageCount} usos\n`;
        response += `   📍 ${route.totalPoints} puntos\n`;
        response += `   📅 Día más usado: ${route.mostUsedDay}\n\n`;
      });

      return response;
    }

    // Consulta: dónde estuvo en una fecha específica y rango horario
    const timeLocationMatch = queryLower.match(/dónde estu(?:ve|vo)?\s+(?:el\s+)?(\d{1,2})\s+de\s+(\w+)\s+(?:de\s+)?(?:\d{4})?\s+(?:entre\s+las?\s+)?(\d{1,2}):(\d{2})\s+(?:y|al?)\s+(\d{1,2}):(\d{2})/i);

    if (timeLocationMatch) {
      const day = timeLocationMatch[1].padStart(2, '0');
      const monthName = timeLocationMatch[2].toLowerCase();
      const startHour = timeLocationMatch[3];
      const startMin = timeLocationMatch[4];
      const endHour = timeLocationMatch[5];
      const endMin = timeLocationMatch[6];

      // Convertir nombre del mes a número
      const monthMap: { [key: string]: string } = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
        'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
        'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
      };

      const month = monthMap[monthName];
      if (!month) {
        return `No pude identificar el mes "${monthName}". Por favor usa el nombre completo del mes en español.`;
      }

      const year = new Date().getFullYear().toString();
      const date = `${year}-${month}-${day}`;
      const startTime = `${startHour}:${startMin}`;
      const endTime = `${endHour}:${endMin}`;

      console.log(`Consultando: ${date} entre ${startTime} y ${endTime}`);

      const locations = await DataAnalysisService.getLocationsByTimeRange(date, startTime, endTime);

      if (locations.locations.length === 0) {
        return `No encontré registros de ubicaciones el ${day} de ${monthName} entre las ${startHour}:${startMin} y las ${endHour}:${endMin}.`;
      }

      let response = `📅 **Ubicaciones el ${day} de ${monthName} entre ${startHour}:${startMin} y ${endHour}:${endMin}:**\n\n`;

      locations.locations.forEach((location, index) => {
        response += `${index + 1}. **${location.name}**\n`;
        response += `   🕐 ${location.time}\n`;
        response += `   📍 ${location.coordinates.lat.toFixed(4)}, ${location.coordinates.lng.toFixed(4)}\n\n`;
      });

      return response;
    }

    // Consulta: estadísticas generales
    if (queryLower.includes('estadística') || queryLower.includes('resumen') || queryLower.includes('cuánto') || queryLower.includes('total')) {
      const stats = await DataAnalysisService.getGeneralStats();

      let response = "📊 **Estadísticas Generales:**\n\n";
      response += `📍 **Total de puntos:** ${stats.totalPoints}\n`;
      response += `📅 **Días registrados:** ${stats.totalDays}\n`;
      response += `🏠 **Ubicaciones diferentes:** ${stats.totalLocations}\n`;

      if (stats.dateRange.start && stats.dateRange.end) {
        response += `📆 **Rango de fechas:** ${new Date(stats.dateRange.start).toLocaleDateString('es-ES')} - ${new Date(stats.dateRange.end).toLocaleDateString('es-ES')}\n`;
      }

      return response;
    }

    // Si no es ninguna consulta especial, usar Gemini normal con contexto
    return await getChatbotResponse(query, history);

  } catch (error) {
    console.error('Error procesando consulta analítica:', error);
    return "Lo siento, tuve un problema procesando tu consulta. Por favor intenta de nuevo.";
  }
};

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
  if (!ai) {
    throw new Error('Gemini AI no está disponible. Configura tu API key primero.');
  }

  const prompt = `
    Analyze the provided image, which shows a location history screen. 
    Your task is to extract the following information:
    1.  **Fecha (Date):** The full date shown. Format this as YYYY-MM-DD.
    2.  **Hora (Time):** The exact time associated with the location pin.
    3.  **Lugar (Location):** The complete address or place name.
    4.  **Coordinates:** The precise geographic coordinates (latitude and longitude) for the location address. The latitude for locations in Mexico should be a positive number (North), and the longitude should be a negative number (West). For example, Mexico City is around 19.4326° N, -99.1332° W. Prioritize accuracy and return null if you cannot determine the coordinates with high confidence.
    
    **CRITICAL CONTEXT:** All locations in this image are within or very near the city of **León, Guanajuato, México**. Use this information to disambiguate the address and find the most accurate coordinates.

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
  if (!ai) {
    throw new Error('El chatbot no está disponible porque falta la API key de Gemini. Configura tu API key para habilitar esta funcionalidad.');
  }
  // Prune the history data to only include relevant fields to save tokens
  const simplifiedHistory = history.map(entry => ({
    date: entry.data.date,
    time: entry.data.time,
    location: entry.data.location,
    latitude: entry.data.latitude,
    longitude: entry.data.longitude,
    // Nuevos campos de KMZ
    name: entry.data.name,
    description: entry.data.description,
    geometry: entry.data.geometry ? {
      type: entry.data.geometry.type,
      coordinatesCount: entry.data.geometry.coordinates.length
    } : null,
    source: entry.source
  }));

  const prompt = `
    You are an intelligent geospatial data assistant. Your task is to analyze the provided geospatial data from KMZ files and answer the user's questions.

    **DATA CONTEXT:**
    The data comes from KMZ (Google Earth) files containing geographic features like points, lines, and polygons with associated metadata.

    **RULES:**
    1.  Your answers **MUST** be based exclusively on the JSON data provided.
    2.  Do not make up any information or use external knowledge.
    3.  If the answer cannot be found in the provided data, state that clearly.
    4.  Keep your answers concise and directly related to the user's question.
    5.  Respond in Spanish.
    6.  When describing geometries, explain what they represent (points = locations, lines = routes/paths, polygons = areas/zones).

    **Geospatial Data (JSON):**
    ${JSON.stringify(simplifiedHistory, null, 2)}

    **User's Question:**
    "${question}"

    Provide your answer in Spanish.
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
