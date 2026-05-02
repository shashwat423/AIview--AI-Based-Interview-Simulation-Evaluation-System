import os
import json
from dotenv import load_dotenv
from google import genai

# Load environment variables
load_dotenv()

# Gemini client (reads GEMINI_API_KEY automatically)
client = genai.Client()


def build_prompt(resume_text: str) -> str:
    return f"""
        You are an AI technical interviewer.

        Analyze the resume below and identify the following categories if they exist:

        - Education
        - Projects
        - Skills
        - Internships or Work Experience
        - Certifications
        - Extracurricular Activities

        Generate a structured interview consisting of **8-10 questions total**.

        Questions must follow a **realistic interview progression**:

        1. Start with background questions (education or general experience).
        2. Move to deeper discussion of projects and work experience.
        3. Ask technical questions related to skills.
        4. End with behavioral reflection questions.

        Behavioral questions must be based on teamwork, problem-solving, challenges, or learning experiences that can reasonably be inferred from the resume.

        Return questions in the **same order as the interview flow**.

        Total question distribution guideline:

        - Education: 1-2
        - Projects / Experience: 3-4
        - Skills: 2-3
        - Behavioral: 2
        - Certifications or extracurriculars only if relevant.

        All generated questions must be returned in a SINGLE list.

        Return ONE valid JSON object with the exact format below.

        Do not include code fences.
        Do not include explanations.
        Do not include extra text.
        If the format cannot be followed, return an empty JSON object.

        Required JSON format:

        {{
        "questions": [
            {{
                "question": "Question text",
                "category": "education | projects | skills | experience | certifications | extracurricular | behavioral",
                "difficulty": "easy | medium | hard"
            }}
        ]
        }}

        Rules:

        - Generate between **8 and 10 questions total**
        - Questions must be grounded in the resume content
        - Do not generate questions for categories that do not exist
        - Do not mention category names inside the question text
        - Each question must be one clear sentence
        - Avoid generic questions unless necessary for behavioral reflection
        - Difficulty must progress logically from easy → medium → hard
        - Technical depth should focus on projects, skills, and experience
        - Behavioral questions should appear near the end of the interview
        - Avoid personal or sensitive questions
        - Return only the JSON object

        Resume:
        ------------------
        {resume_text}
        ------------------
        """



def call_gemini(prompt: str) -> str:
    """
    Calls Gemini API and returns raw response text.
    """
    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt
    )

    return response.text.strip()


import re
import json

def parse_response(response_text: str) -> dict:
    """
    Sanitizes and parses Gemini response into valid JSON.
    """

    if not response_text or not response_text.strip():
        raise ValueError("Empty response from Gemini")

    # 1. Remove markdown code fences if present
    cleaned = re.sub(r"```json|```", "", response_text, flags=re.IGNORECASE).strip()

    # 2. Extract the first valid JSON object (defensive)
    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")

    if first_brace == -1 or last_brace == -1:
        raise ValueError(f"No JSON object found:\n{cleaned}")

    cleaned = cleaned[first_brace:last_brace + 1]

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Gemini response is not valid JSON after cleaning:\n{cleaned}"
        ) from e



def generate_questions(resume_text: str) -> dict:
    """
    Main public function.
    """
    prompt = build_prompt(resume_text)
    raw_output = call_gemini(prompt)
    questions = parse_response(raw_output)
    return questions


# -------------------------
# Local testing
# -------------------------
if __name__ == "__main__":
    with open("sample_resume.txt", "r", encoding="utf-8") as f:
        resume_text = f.read()

    questions = generate_questions(resume_text)
    # print(json.dumps(questions, indent=2))
