import os
import json
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client()


# Difficulty weight mapping
DIFFICULTY_WEIGHTS = {
    "easy": 1.0,
    "medium": 1.5,
    "hard": 2.0
}


def build_prompt(question, answer, difficulty):
    return f"""
        You are an expert technical interviewer.

        Evaluate the candidate's answer strictly.

        Question:
        {question}

        Answer:
        {answer}

        Difficulty level: {difficulty}

        Return ONLY valid JSON in this format:
        {{
        "score": float (0 to 10),
        "strengths": "1-2 short points describing what the candidate did well",
        "weaknesses": "1-2 short points describing missing elements",
        "reasoning": "brief explanation of how the score was determined",
        "suggestions": "short improvement advice"
        }}

        Evaluation rules:
        - Score must be between 0 and 10
        - Consider technical correctness, clarity, depth, and relevance
        - Hard questions require deeper reasoning
        - Each field should be concise (1-2 sentences)
        - Do NOT include markdown
        - Do NOT include explanations outside JSON
        """
            

def call_gemini(prompt):
    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt
    )

    return response.text.strip()


def parse_response(response_text):
    import re

    cleaned = re.sub(r"```json|```", "", response_text).strip()

    first = cleaned.find("{")
    last = cleaned.rfind("}")

    if first == -1 or last == -1:
        raise ValueError("Invalid JSON returned")

    cleaned = cleaned[first:last+1]

    return json.loads(cleaned)


def evaluate_single_answer(answer_obj):
    prompt = build_prompt(
        answer_obj["question"],
        answer_obj["answer"],
        answer_obj["difficulty"]
    )

    raw = call_gemini(prompt)
    result = parse_response(raw)

    weight = DIFFICULTY_WEIGHTS.get(answer_obj["difficulty"], 1)
    weighted_score = round(result["score"] * weight, 4)

    feedback = (
    f"Strengths: {result.get('strengths','')}\n"
    f"Weaknesses: {result.get('weaknesses','')}\n"
    f"Reasoning: {result.get('reasoning','')}\n"
    f"Suggestions: {result.get('suggestions','')}"
)

    return {
    **answer_obj,
    "score": result["score"],
    "weighted_score": weighted_score,
    "feedback": feedback
}


def evaluate_interview(answers_list):
    evaluated = []
    total_weighted = 0
    total_weights = 0

    for ans in answers_list:
        result = evaluate_single_answer(ans)
        evaluated.append(result)

        weight = DIFFICULTY_WEIGHTS.get(ans["difficulty"], 1)
        total_weighted += result["weighted_score"]
        total_weights += weight

    final_score = round(total_weighted / total_weights, 2) if total_weights else 0

    return {
        "total_score": final_score,
        "evaluated_answers": evaluated
    }



# if __name__ == "__main__":
#     sample_answers = [
#         {
#             "question": "Explain how a hash table works.",
#             "answer": "A hash table stores key-value pairs using a hash function to compute an index into an array of buckets.",
#             "difficulty": "easy",
#             "category": "Data Structures"
#         },
#         {
#             "question": "What is the time complexity of quicksort in the worst case?",
#             "answer": "O(n^2) when the pivot is the smallest or largest element.",
#             "difficulty": "medium",
#             "category": "Algorithms"
#         }
#     ]

#     result = evaluate_interview(sample_answers)
#     print(json.dumps(result, indent=2))