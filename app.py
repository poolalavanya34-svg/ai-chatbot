from flask import Flask, render_template, request, jsonify
import urllib.request
import json
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)

UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

chat_history = []
history_summaries = []

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    try:
        user_message = request.form.get("message", "").strip()
        system_prompt = request.form.get("system_prompt", "").strip()
        file = request.files.get("file")
        
        file_url = None
        if file and file.filename:
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            file_url = f"/static/uploads/{filename}"
            user_message = f"[Attached File: {filename}] {user_message}".strip()

        if not user_message and not file_url:
            return jsonify({"error": "Message or file cannot be empty"}), 400

        messages_payload = []
        if system_prompt:
            messages_payload.append({"role": "system", "content": system_prompt})
            
        chat_history.append({"role": "user", "content": user_message})
        messages_payload.extend(chat_history[-6:])
        
        if user_message not in history_summaries:
            history_summaries.append(user_message[:30] + ("..." if len(user_message) > 30 else ""))

        data = {
            "model": "qwen2.5:0.5b",
            "messages": messages_payload,
            "stream": False
        }

        req = urllib.request.Request(
            "http://localhost:11434/api/chat",
            data=json.dumps(data).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )

        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            bot_message = res_data.get("message", {}).get("content", "No response from model.")

        chat_history.append({"role": "assistant", "content": bot_message})

        return jsonify({"response": bot_message, "history": history_summaries, "file_url": file_url})

    except Exception as e:
        return jsonify({"error": "AI model is unavailable. Make sure Ollama is running."}), 500

@app.route("/clear", methods=["POST"])
def clear():
    chat_history.clear()
    history_summaries.clear()
    return jsonify({"status": "success"})

if __name__ == "__main__":
    app.run(debug=True)