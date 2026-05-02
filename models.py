from extensions import db
from datetime import datetime


class Interview(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    total_score = db.Column(db.Float)
    summary = db.Column(db.Text)

    answers = db.relationship("Answer", backref="interview", lazy=True)


class Answer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    interview_id = db.Column(db.Integer, db.ForeignKey("interview.id"), nullable=False)

    question = db.Column(db.Text, nullable=False)
    answer = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100))
    difficulty = db.Column(db.String(50))
    score = db.Column(db.Float)
    feedback = db.Column(db.Text)
    time_taken = db.Column(db.Integer)

