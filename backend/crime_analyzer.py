import os
import pandas as pd
import json
from google import genai
from google.genai import types

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable not set. Please get your key from Google AI Studio.")

FILE_PATH = "ph_crime_data.csv"

# 3. Create a placeholder CSV file with synthetic data for testing
# NOTE: Replace this with your actual, real-world data for a real analysis!
data = {
    'Date': pd.to_datetime(['2022-01-01', '2022-04-01', '2023-01-01', '2023-04-01', '2024-01-01', '2024-04-01'] * 2),
    'Region': ['NCR'] * 6 + ['Region IV-A'] * 6,
    'Crime_Type': ['Theft', 'Theft', 'Theft', 'Homicide', 'Homicide', 'Homicide'] * 2, # Changed a bit for better trend
    'Incidents': [500, 450, 600, 50, 60, 70] + [200, 250, 350, 20, 25, 30]
}
df = pd.DataFrame(data)
df.to_csv(FILE_PATH, index=False)
print(f"Created placeholder data: {FILE_PATH}")


def analyze_crime_trends_json(file_path: str):
    """
    Analyzes crime data using Gemini with Code Execution and returns a JSON response.
    """
    print("\n--- Initializing Gemini Client and File Upload ---")
    client = genai.Client(api_key=API_KEY)
    
    # Upload the file to the Gemini Files API
    uploaded_file = client.files.upload(file=file_path)
    print(f"Uploaded file: {uploaded_file.name} (URI: {uploaded_file.uri})")

    # --- Define the desired JSON structure for the model ---
    json_schema = {
        "type": "object",
        "properties": {
            "analysis_title": {"type": "string", "description": "A concise title for the crime trend analysis."},
            "summary": {"type": "string", "description": "A brief overall summary of the crime trends identified in the Philippines."},
            "regional_trends": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "region_name": {"type": "string", "description": "The name of the Philippine region (e.g., NCR, Region IV-A)."},
                        "most_prevalent_crime": {"type": "string", "description": "The crime type with the highest incidence in this region."},
                        "trend_description": {"type": "string", "description": "A detailed narrative of the crime trend over the analyzed period."},
                        "year_over_year_change": {"type": "number", "description": "The calculated annual percentage change for the most prevalent crime."}
                    },
                    "required": ["region_name", "most_prevalent_crime", "trend_description", "year_over_year_change"]
                }
            },
            "key_insights": {
                "type": "array",
                "items": {"type": "string", "description": "Three actionable key insights for law enforcement."}
            },
            "visualization_request": {"type": "string", "description": "A base64-encoded string of the generated crime trend chart (matplotlib/seaborn)."}
        },
        "required": ["analysis_title", "summary", "regional_trends", "key_insights", "visualization_request"]
    }

    # --- System Instruction & Prompt ---
    system_instruction = (
        "You are an expert ML Crime Analyst specializing in Philippine regional data. "
        "Your task is to analyze the provided crime data, identify the most significant "
        "trends, and create a visual representation of the findings. "
        "You MUST generate and execute Python code using pandas for analysis and matplotlib/seaborn to generate a base64-encoded image string of a line chart showing total incidents per region over time. "
        "The **FINAL OUTPUT MUST be a single JSON object** that strictly adheres to the provided JSON schema."
    )

    user_prompt = (
        f"Analyze the file '{os.path.basename(file_path)}'. "
        "1. Identify the most prevalent crime type in each region and describe its trend over time. "
        "2. Calculate the average annual percentage change for that crime type in each region. "
        "3. Generate a multi-line chart (one line per region) and return it as a base64 string in the JSON field 'visualization_request'. "
        "4. Provide 3 key insights. "
    )

    # --- Generate Content with Code Execution Tool and JSON Output ---
    print("\n--- Sending Prompt to Gemini Model for Code Execution and JSON Output ---")
    response = client.models.generate_content(
        model='gemini-1.5-flash',
        contents=[
            uploaded_file,
            user_prompt
        ],
        config=types.GenerateContentConfig(
            # 1. Enable the code execution tool
            tools=[types.Tool(code_execution={})],
            # 2. Force the model to output a JSON string
            response_mime_type="application/json",
            response_schema=json_schema,
            system_instruction=system_instruction
        )
    )

    # --- Display and Verify Results ---
    print("\n--- Gemini JSON Analysis Output ---")
    try:
        # The entire response.text should be a valid JSON string
        json_response = json.loads(response.text)
        print(json.dumps(json_response, indent=4))
        print("\n✅ JSON output successfully parsed and displayed.")
    except json.JSONDecodeError as e:
        print(f"❌ Error decoding JSON response: {e}")
        print("\nRaw Model Output (might contain code blocks or errors):\n", response.text)
        
    # Clean up the uploaded file
    client.files.delete(name=uploaded_file.name)
    print(f"\n--- Cleaned up uploaded file: {uploaded_file.name} ---")


if __name__ == "__main__":
    analyze_crime_trends_json(FILE_PATH)