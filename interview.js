const INTERVIEW_STATUS = {
  AI_SPEAKING: "AI_SPEAKING",
  USER_LISTENING: "USER_LISTENING",
  USER_ANSWERING: "USER_ANSWERING",
  PROCESSING: "PROCESSING",
  FINISHED: "FINISHED"
};

const INTERVIEW_CONFIG = {
  QUESTION_TIME: 240,
  SPEECH_DELAY: 300,
  THINKING_DELAY: 1800
};

const interviewState = {
  questions: [],
  currentIndex: 0,
  timerInterval: null,
  timeLeft: INTERVIEW_CONFIG.QUESTION_TIME,
  recording: false,
  finalTranscript: "",
  status: INTERVIEW_STATUS.AI_SPEAKING
};

const elements = {
  chatBox: null,
  answerInput: null,
  timer: null,
  micBtn: null,
  sendBtn: null,
  progressIndicator: null
};

let recognition;
let voices = [];


document.addEventListener("DOMContentLoaded", initInterview);


/* =========================
   INITIALIZATION
========================= */

async function initInterview() {

  initOrb();

  console.log("Interview initialization started");
  
  elements.chatBox = document.getElementById("chatBox");
  elements.answerInput = document.getElementById("answerInput");
  elements.timer = document.getElementById("timer");
  elements.micBtn = document.getElementById("micBtn");
  elements.sendBtn = document.getElementById("sendBtn");
  elements.progressIndicator = document.getElementById("progressIndicator");
  


  elements.micBtn.addEventListener("click", toggleRecording);
  elements.sendBtn.addEventListener("click", submitAnswer);



  const response = await fetch("/get-questions");
  const data = await response.json();

  interviewState.questions = data.questions;

  if (!interviewState.questions || interviewState.questions.length === 0) {
    alert("No questions found.");
    window.location.href = "/home";
    return;
  }

  renderBotMessage("Hello! I will be conducting your interview today.");
  renderBotMessage("Please answer the following questions to the best of your ability.");

  setTimeout(() => {
    showQuestion();
  }, 1500);

  if ("webkitSpeechRecognition" in window) {

    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = function(event) {

      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {

        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          interviewState.finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }

      }

      elements.answerInput.value =
        interviewState.finalTranscript + interimTranscript;
      

      elements.answerInput.addEventListener("input", () => {
        interviewState.finalTranscript = elements.answerInput.value;
      });
      
    };

  }

}

/* =========================
   QUESTION FLOW
========================= */

function showQuestion(){

  updateProgress();

  interviewState.finalTranscript = "";
  elements.answerInput.value = "";

  const q = interviewState.questions[interviewState.currentIndex];

  document.getElementById("questionHeader").innerText = q.question;

  renderBotMessage(q.question);

  speakQuestion(q.question);

}

function loadNextQuestion() {

  interviewState.currentIndex++;

  if (interviewState.currentIndex < interviewState.questions.length) {

    renderThinking();

    setTimeout(() => {

      const thinkingMsg = document.querySelector(".thinking");
      if (thinkingMsg) thinkingMsg.remove();

      showQuestion();

    }, INTERVIEW_CONFIG.THINKING_DELAY);

  } 
  else {

      elements.sendBtn.disabled = true;
      elements.micBtn.disabled = true;

      interviewState.status = INTERVIEW_STATUS.FINISHED;

      endInterview();

  }
}

/* =========================
   TIMER SYSTEM
========================= */

function formatTime(seconds){

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    String(minutes).padStart(2,"0") +
    ":" +
    String(secs).padStart(2,"0")
  );

}

function startTimer() {

  interviewState.timeLeft = INTERVIEW_CONFIG.QUESTION_TIME;

  elements.timer.innerText = formatTime(interviewState.timeLeft);

  clearInterval(interviewState.timerInterval);

  interviewState.timerInterval = setInterval(() => {

    interviewState.timeLeft--;

    if (interviewState.timeLeft <= 25) {
      elements.timer.style.color = "#dc2626";
    } 
    else if(interviewState.timeLeft <= 10){
      elements.timer.classList.add("timer-warning");
    }
    else {
      elements.timer.style.color = "#1e293b";
    }

    if (interviewState.timeLeft <= 0) {

      interviewState.timeLeft = 0;
      elements.timer.innerText = formatTime(0);

      clearInterval(interviewState.timerInterval);

      stopRecording();
      submitAnswer();

      return;
    }

    elements.timer.innerText = formatTime(interviewState.timeLeft);

  }, 1000);

}

/* =========================
   ANSWER SUBMISSION
========================= */

async function submitAnswer() {

  if(interviewState.status === INTERVIEW_STATUS.FINISHED){
    return;
  }

  interviewState.status = INTERVIEW_STATUS.PROCESSING;

  stopRecording();

  clearInterval(interviewState.timerInterval);

  const answer = elements.answerInput.value.trim();

  renderUserMessage(answer);

  const currentQuestion =
    interviewState.questions[interviewState.currentIndex];

  const timeTaken =
    INTERVIEW_CONFIG.QUESTION_TIME - interviewState.timeLeft;

  await fetch("/submit-answer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      question: currentQuestion.question,
      category: currentQuestion.category,
      difficulty: currentQuestion.difficulty,
      answer: answer,
      time_taken: timeTaken
    })
  });

  loadNextQuestion();

}

async function endInterview(){

  interviewState.status = INTERVIEW_STATUS.FINISHED;

  await fetch("/evaluate-interview",{method:"POST"});

  showCompletionModal();

}

/* =========================
   MICROPHONE SYSTEM
========================= */

function toggleRecording() {

  if (!interviewState.recording) {
    startRecording();
  } else {
    stopRecording();
  }

}

function startRecording() {

  interviewState.recording = true;
  interviewState.status = INTERVIEW_STATUS.USER_ANSWERING;

  elements.micBtn.textContent = "🔴";
  elements.micBtn.classList.add("mic-recording");

  if (recognition) {
    recognition.start();
  }

}

function stopRecording() {

  interviewState.recording = false;

  elements.micBtn.textContent = "🎤";
  elements.micBtn.classList.remove("mic-recording");

  if (recognition) {
    recognition.stop();
  }

}

/* =========================
   SPEECH SYSTEM
========================= */

speechSynthesis.onvoiceschanged = () => {
  voices = speechSynthesis.getVoices();
  if(voices.length === 0){
    voices = speechSynthesis.getVoices();
}
};

function getBestVoice(){

  const preferred = [
    "Google",
    "Microsoft",
    "Natural",
    "Samantha",
    "Daniel"
  ];

  for(let name of preferred){
    const v = voices.find(voice => voice.name.includes(name));
    if(v) return v;
  }

  return voices[0];
}

function improveSpeech(text){


  return text
    .replace(/\?/g,"? ... ")
    .replace(/\./g,". ... ")
    .replace(/,/g,", ");
}

function speakQuestion(text){

  elements.sendBtn.disabled = true;

  speechSynthesis.cancel();

  stopRecording();

  interviewState.status = INTERVIEW_STATUS.AI_SPEAKING;

  const improvedText = improveSpeech(text);

  const speech = new SpeechSynthesisUtterance(improvedText);

  // speech.voice = getBestVoice();
  speech.voice =
    voices.find(v => v.name.includes("Guy")) ||
    voices.find(v => v.name.includes("David")) ||
    voices.find(v => v.name.includes("Google UK English Male")) ||
    voices.find(v => v.name.includes("Daniel")) ||
    getBestVoice();

  speech.rate = 0.97;     // slower = more natural
  speech.pitch = 1.05;    // warmer tone
  speech.volume = 1;

  speech.onend = () => {

    elements.sendBtn.disabled = false;

    interviewState.status = INTERVIEW_STATUS.USER_LISTENING;

    startTimer();
    setTimeout(() => {
        startRecording();
    }, 500);

  };

  setTimeout(() => {
    speechSynthesis.speak(speech);
  }, INTERVIEW_CONFIG.SPEECH_DELAY);

}

/* =========================
   UI RENDERING
========================= */

function renderBotMessage(text) {

  const msg = document.createElement("div");
  msg.classList.add("message", "bot");
  msg.innerText = text;

  elements.chatBox.appendChild(msg);
  elements.chatBox.scrollTop = elements.chatBox.scrollHeight;

}

function renderUserMessage(text) {

  const msg = document.createElement("div");
  msg.classList.add("message", "user");
  msg.innerText = text || "(No response)";

  elements.chatBox.appendChild(msg);
  elements.chatBox.scrollTop = elements.chatBox.scrollHeight;

}

function renderThinking() {

  const msg = document.createElement("div");
  msg.classList.add("message", "bot", "thinking");

  msg.innerHTML = `
    <div class="typing-indicator">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;

  elements.chatBox.appendChild(msg);
  elements.chatBox.scrollTop = elements.chatBox.scrollHeight;

}

/* =========================
   HELPERS
========================= */

function updateProgress() {

  const total = interviewState.questions.length;
  const current = interviewState.currentIndex + 1;

  elements.progressIndicator.innerText =
    `Question ${current} / ${total}`;

}

/* =========================
   avatar function
========================= 

function loadAvatar(){

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
        35,
        1,
        0.1,
        1000
    );

    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true });
    renderer.setSize(280,280);

    const container = document.getElementById("avatar3d");

    if(!container) return;

    container.appendChild(renderer.domElement);

    const light = new THREE.HemisphereLight(0xffffff,0x444444,1.2);
    scene.add(light);

    const loader = new THREE.GLTFLoader();

    loader.load(

        "/static/avatar/harry.glb",

        function(gltf){                 // ✅ onLoad

            avatarModel = gltf.scene;

            avatarModel.scale.set(1.4,1.4,1.4);

            scene.add(avatarModel);

        },

        undefined,                      // optional progress callback

        function(error){                // ✅ onError

            console.error("Avatar loading error:", error);

        }

    );

    function animate(){

        requestAnimationFrame(animate);

        if(avatarModel){
            avatarModel.rotation.y += 0.002;
        }

        renderer.render(scene,camera);

    }

    animate();

}*/


/* =========================
   orb function
========================= */

function initOrb(){

const canvas = document.getElementById("aiOrb");
const ctx = canvas.getContext("2d");

canvas.width = 180;
canvas.height = 180;

let t = 0;

function draw(){

ctx.clearRect(0,0,canvas.width,canvas.height);

const cx = canvas.width/2;
const cy = canvas.height/2;

const baseRadius = 65;

for(let i=0;i<60;i++){

let angle = (i/60) * Math.PI * 2;

let wave = Math.sin(angle*3 + t)*8;

let r = baseRadius + wave;

let x = cx + Math.cos(angle)*r;
let y = cy + Math.sin(angle)*r;

ctx.beginPath();
ctx.strokeStyle = `hsla(${210 + i*2}, 100%, 65%, 0.6)`;
ctx.lineWidth = 2;

ctx.moveTo(cx,cy);
ctx.lineTo(x,y);

ctx.stroke();
}

t += 0.09;

requestAnimationFrame(draw);

}

draw();

}


// ///////////////////////////////////////////////////////////////////////////////////modal logic

function showCompletionModal(){

  const modal = document.getElementById("completionModal");

  modal.classList.add("show");

}

document.addEventListener("DOMContentLoaded", function(){

  const btn = document.getElementById("viewResultsBtn");

  if(btn){
      btn.onclick = function(){
          window.location.href="/results";
      }
  }

});