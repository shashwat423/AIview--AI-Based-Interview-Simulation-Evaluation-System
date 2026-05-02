import pdfplumber
import docx
import os

def parse_resume(file_path):
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        return extract_pdf_text(file_path)
    elif ext in [".doc", ".docx"]:
        return extract_docx_text(file_path)
    else:
        raise ValueError("Unsupported file format")


def extract_pdf_text(path):
    text = ""
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return clean_text(text)


def extract_docx_text(path):
    doc = docx.Document(path)
    text = "\n".join([p.text for p in doc.paragraphs])
    return clean_text(text)


def clean_text(text):
    text = text.replace("\t", " ")
    text = "\n".join([line.strip() for line in text.splitlines() if line.strip()])
    return text


# file = "./uploads/resume.pdf"
# print(parse_resume(file))