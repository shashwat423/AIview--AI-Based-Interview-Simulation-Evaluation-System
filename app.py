from flask import Flask, render_template, request, session, jsonify, redirect
from extensions import db
import os
from core.parser import parse_resume
from core.llm_handler import generate_questions
from core.evaluator import evaluate_interview
import models
from flask_session import Session
from datetime import timedelta


ADMIN_USERNAME = "shashwat"
ADMIN_PASSWORD = "aiview123"

secret_key = "supersecretkey"

app = Flask(__name__, instance_relative_config=True)
app.secret_key = "dev-secret-key"

app.jinja_env.globals.update(timedelta=timedelta)

app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_PERMANENT"] = False

Session(app)

# Ensure instance folder exists
os.makedirs(app.instance_path, exist_ok=True)

app.config["SQLALCHEMY_DATABASE_URI"] = \
    "sqlite:///" + os.path.join(app.instance_path, "ai_view.db")

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)



UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

################# START ######################

################# HOME ######################



@app.route("/")
@app.route("/home")
def home():
    return render_template("home.html")


################# DASHBOARD ######################


@app.route("/dashboard")
def dashboard():
    from models import Interview
    from sqlalchemy import desc
    from sqlalchemy import func


    if not session.get("logged_in"):
        return redirect("/home")

    interviews = Interview.query.all()

    total_interviews = len(interviews)

    if total_interviews > 0:
        average_score = round(
            sum(i.total_score*10 for i in interviews) / total_interviews, 2
        )

        successful = len([i for i in interviews if i.total_score*10 >= 60])

        success_rate = round((successful / total_interviews) * 100, 1)

        last_interview = max(interviews, key=lambda x: x.date).date.strftime("%b %d, %Y")
    else:
        average_score = 0
        success_rate = 0
        last_interview = "N/A"

    # Last 10 interviews for chart
    last_10 = Interview.query.order_by(
        desc(Interview.date)
    ).limit(10).all()

    last_10 = last_10[::-1]

    labels = [i.date.strftime("%b %d") for i in last_10]
    scores = [i.total_score*10 for i in last_10]

    return render_template(
        "dashboard.html",
        total_interviews=total_interviews,
        average_score=average_score,
        success_rate=success_rate,
        last_interview=last_interview,
        labels=labels,
        scores=scores
    )

################# LOGIN ######################
@app.route("/login", methods=["POST"])
def login():

    data = request.get_json(silent=True)

    if not data:
        return jsonify({"success": False, "error": "No JSON received"})

    username = data.get("username")
    password = data.get("password")

    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        session["logged_in"] = True
        return jsonify({"success": True})

    return jsonify({"success": False})


################# RESULTS ######################


@app.route("/results")
def results():

    if not session.get("logged_in"):
        return redirect("/home")
    
    interviews = models.Interview.query.order_by(
        models.Interview.date.desc()
    ).all()

    return render_template("results.html", interviews=interviews)

@app.route("/results/<int:id>")
def result_detail(id):
    interview = models.Interview.query.get_or_404(id)
    return render_template("result_detail.html", interview=interview)


################# LEARNING HUB ######################

@app.route("/learning-hub")
def learning_hub():

    if not session.get("logged_in"):
        return redirect("/home")

    return render_template("learning_hub.html")


################# APPEARANCE ######################

@app.route("/theme")
def appearance():

    if not session.get("logged_in"):
        return redirect("/home")

    return render_template("appearance.html")


################# SYSTEM GUIDE ######################

@app.route("/system-guide")
def system_guide():

    if not session.get("logged_in"):
        return redirect("/home")

    return render_template("system_guide.html")

################# LOGOUT ######################

@app.route("/logout")
def logout():

    session.pop("logged_in", None)

    return redirect("/home")

################# REST OF THE FUNCTIONS ######################

@app.route("/upload", methods=["POST"])
def upload_resume():
    file = request.files.get("resume")

    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    try:
        extracted_text = parse_resume(file_path)
        session["resume_text"] = extracted_text  # ✅ STORE TEXT
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({
        "message": "Resume uploaded and parsed successfully",
        "text_length": len(extracted_text)
    })


@app.route("/generate-questions", methods=["POST"])
def generate_questions_route():
    try:
        resume_text = session.get("resume_text")

        if not resume_text:
            return jsonify({"error": "Resume not found in session"}), 400

        questions = generate_questions(resume_text)

        session["questions"] = questions["questions"]
        session["answers"] = []  # 🔥 initialize clean answer list


        return jsonify({"status": "success"})

    except Exception as e:
        print("LLM ERROR:", str(e))  # 🔥 important
        return jsonify({"error": "LLM generation failed"}), 500



@app.route("/get-questions")
def get_questions():
    return jsonify({"questions": session.get("questions", [])})


@app.route("/interview")
def interview():
    return render_template("interview.html")

@app.route("/evaluate-interview", methods=["POST"])
def evaluate_route():

    answers = session.get("answers", [])

    if not answers:
        return jsonify({"error": "No answers found"}), 400

    result = evaluate_interview(answers)

    # 🔥 Create Interview record
    new_interview = models.Interview(
        total_score=result["total_score"],
        summary="Interview completed successfully."
    )

    db.session.add(new_interview)
    db.session.commit()

    # 🔥 Save each evaluated answer
    for ans in result["evaluated_answers"]:
        answer_row = models.Answer(
            interview_id=new_interview.id,
            question=ans["question"],
            answer=ans["answer"],
            category=ans["category"],
            difficulty=ans["difficulty"],
            score=ans["score"],
            feedback=ans["feedback"]
        )
        db.session.add(answer_row)

    db.session.commit()

    # 🔥 Clear session after saving
    session.pop("answers", None)
    session.pop("questions", None)

    return jsonify({"status": "saved"})


@app.route("/submit-answer", methods=["POST"])
def submit_answer():

    data = request.get_json()

    question = data.get("question")
    answer = data.get("answer") or "(No response)"
    category = data.get("category")
    difficulty = data.get("difficulty")
    time_taken = data.get("time_taken")

    if "answers" not in session:
        session["answers"] = []

    session["answers"].append({
        "question": question,
        "answer": answer,
        "category": category,
        "difficulty": difficulty,
        "time_taken": time_taken
    })

    session.modified = True 
    
    # print("Current answers:", session.get("answers"))
    print("Answer received:", data)

    return jsonify({"status": "saved"})



@app.errorhandler(415)
def unsupported_media(e):
    return redirect("/home")

import models

if __name__ == "__main__":
    app.run(debug=True)

