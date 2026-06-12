import re
import os
import requests

def parse_ingredients(raw_ingredients: list) -> list:
    """
    Recibe una lista de productos crudos del carrito y devuelve los ingredientes limpios.
    Elimina pesos, volúmenes, envases y adjetivos promocionales o marcas comunes.
    """
    if not raw_ingredients:
        return []

    cleaned_ingredients = []

    # Regex para pesos y volúmenes
    regex_medidas = r'\b\d+(?:[,.]\d+)?\s*(?:gr|g|kg|ml|l|cl|oz|lb)\b'
    
    # Regex para envases o formatos
    regex_envases = r'\b(?:en bandeja|bandeja|malla|pack\s+de\s+\d+|lata|bote|brik|botella|paquete|tarro|bolsa)\b'
    
    # Regex para adjetivos promocionales, de estado o marcas
    regex_adjetivos = r'\b(?:casero|casera|fileteada|fileteado|fresco|fresca|natural|extra|premium|oferta|gallo|hacendado|carrefour)\b'

    for item in raw_ingredients:
        text = item.lower()
        
        text = re.sub(regex_medidas, '', text)
        text = re.sub(regex_envases, '', text)
        text = re.sub(regex_adjetivos, '', text)
        
        text = re.sub(r'\s+', ' ', text).strip(' ,-')
        
        if text:
            cleaned_ingredients.append(text)
            
    return cleaned_ingredients


def generate_recipe_from_ingredients(cleaned_ingredients: list) -> str:
    """
    Hace una petición HTTP POST a la API del LLM para generar una receta.
    """
    if not cleaned_ingredients:
        return "<h3>Error</h3><p>No hay ingredientes válidos en el carrito para cocinar.</p>"
        
    api_key = os.getenv("GROQ_API_KEY") 
    if not api_key:
        return "<h3>Error de Configuración</h3><p>La variable de entorno GROQ_API_KEY no está configurada en el servidor.</p>"
        
    url = "https://api.groq.com/openai/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    ingredients_str = ", ".join(cleaned_ingredients)
    
    system_prompt = (
        "Actúa como un chef estricto y con algo de humor. Diseña una receta usando EXCLUSIVAMENTE "
        "los ingredientes comestibles del usuario. REGLAS: "
        "1. No añadas ingredientes principales extra. "
        "2. Solo puedes usar estos básicos de despensa: agua, sal, pimienta negra y aceite de oliva. "
        "3. Si hay pocos ingredientes, crea un aperitivo. "
        "4. Si los ingredientes no son comestibles, responde con humor indicando que no puedes cocinar eso. "
        "5. IMPORTANTE: Devuelve la respuesta EXCLUSIVAMENTE usando etiquetas HTML válidas (como <h3>, <p>, <ul>, <li>, <strong>). "
        "6. PROHIBIDO USAR MARKDOWN (NO uses asteriscos **). NO envuelvas la respuesta en bloques de código ```html."
    )
    
    user_prompt = f"Crea una receta con estos ingredientes: {ingredients_str}"
    
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        response.raise_for_status() 
        
        data = response.json()
        recipe_html = data['choices'][0]['message']['content']
        
        return recipe_html
        
    except requests.exceptions.HTTPError as err_http:
        error_detail = response.text
        return f"<h3>Error HTTP</h3><p>Fallo de la API: {err_http}</p><p>Detalle: {error_detail}</p>"
    except requests.exceptions.ConnectionError:
        return "<h3>Error de Conexión</h3><p>No se pudo conectar a la API del Chef.</p>"
    except requests.exceptions.Timeout:
        return "<h3>Error de Tiempo de Espera</h3><p>El Chef ha tardado demasiado en responder.</p>"
    except (KeyError, IndexError, ValueError) as err_parse:
        return f"<h3>Error Procesando Respuesta</h3><p>Formato inesperado del LLM: {err_parse}</p>"
    except Exception as e:
        return f"<h3>Error Inesperado</h3><p>Ha ocurrido un problema: {str(e)}</p>"
