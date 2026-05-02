console.log("JS loaded");

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("nextBtn");
  console.log("Next button found:", btn);

  if (btn) {
    btn.addEventListener("click", () => {
      console.log("NEXT BUTTON CLICKED");
    });
  }
});




// -------------------------------
// GLOBAL STATE
// -------------------------------
let currentStep = "upload"; // upload → parse → questions


// -------------------------------
// LOGIN (OPTIONAL)
// -------------------------------
// function login() {
//   const username = prompt("Enter your username:", "User");
//   if (username && username.trim() !== "") {
//     document.getElementById("auth-section").innerHTML =
//       `Hi ${username} 🧑‍💼`;
//   }
// }


// -------------------------------
// OPEN MODAL
// -------------------------------
document.querySelector(".oval-button")?.addEventListener("click", () => {
  resetModal();
  document.getElementById("uploadModal").classList.remove("hidden");
  attachNextHandler(); // 🔥 THIS IS THE FIX
});



// -------------------------------
// CLOSE MODAL
// -------------------------------
function closeModal() {
  document.getElementById("uploadModal").classList.add("hidden");
}


// -------------------------------
// RESET MODAL STATE
// -------------------------------
function resetModal() {
  currentStep = "upload";

  hide("progressSection");
  hide("parsingSection");
  hide("questionSection");

  show("uploadBox");

  const nextBtn = document.getElementById("nextBtn");
  nextBtn.innerText = "Next →";
  nextBtn.classList.add("disabled");
}


// -------------------------------
// FILE INPUT
// -------------------------------
function triggerFile() {
  document.getElementById("fileInput").click();
}

document.getElementById("fileInput")?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById("fileName").innerText = file.name;
  show("progressSection");

  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("uploadText");
  const percentText = document.getElementById("progressPercent");
  const nextBtn = document.getElementById("nextBtn");

  progressFill.style.width = "0%";
  percentText.innerText = "0%";
  progressText.innerText = "Uploading...";
  nextBtn.classList.add("disabled");

  const formData = new FormData();
  formData.append("resume", file);

  try {
    await fetch("/upload", { method: "POST", body: formData });

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      progressFill.style.width = progress + "%";
      percentText.innerText = progress + "%";

      if (progress >= 100) {
        clearInterval(interval);
        progressText.innerText = "Uploaded successfully!";
        nextBtn.classList.remove("disabled");
      }
    }, 100);

  } catch {
    progressText.innerText = "Upload failed!";
  }
});


// -------------------------------
// NEXT BUTTON CONTROLLER
// -------------------------------
function attachNextHandler() {
  const nextBtn = document.getElementById("nextBtn");
  if (!nextBtn) return;

  nextBtn.onclick = () => {
    console.log("NEXT CLICKED, STEP:", currentStep);

    if (nextBtn.classList.contains("disabled")) return;

    if (currentStep === "upload") {
      hide("uploadBox");
      hide("progressSection");
      show("parsingSection");

      nextBtn.classList.add("disabled");
      currentStep = "parse";
      simulateParsing();
    }

    else if (currentStep === "parse") {
      hide("parsingSection");
      show("questionSection");

      nextBtn.classList.add("disabled");
      currentStep = "questions";

      generateQuestions();
    }


    else if (currentStep === "questions") {
      window.location.href = "/interview";
    }     
  };
}



// -------------------------------
// SIMULATIONS
// -------------------------------
function simulateParsing() {
  runProgress("parseFill", "parsePercent", "parseText",
    "Parsing...", "Resume parsed successfully!");
}

function simulateQuestionGeneration() {
  runProgress("questionFill", "questionPercent", "questionText",
    "Generating questions...", "Questions generated successfully!", true);
}


// -------------------------------
// GENERIC PROGRESS HANDLER
// -------------------------------
function runProgress(fillId, percentId, textId, runningText, doneText, final=false) {
  let progress = 0;
  const fill = document.getElementById(fillId);
  const percent = document.getElementById(percentId);
  const text = document.getElementById(textId);
  const nextBtn = document.getElementById("nextBtn");

  const interval = setInterval(() => {
    progress += 5;
    fill.style.width = progress + "%";
    percent.innerText = progress + "%";
    text.innerText = `${runningText} ${progress}%`;

    if (progress >= 100) {
      clearInterval(interval);
      text.innerText = doneText;
      nextBtn.classList.remove("disabled");
      if (final) nextBtn.innerText = "Start →";
    }
  }, 120);
}





async function generateQuestions() {

  const fill = document.getElementById("questionFill");
  const percent = document.getElementById("questionPercent");
  const text = document.getElementById("questionText");
  const nextBtn = document.getElementById("nextBtn");

  let progress = 0;
  let interval;

  try {
    interval = setInterval(() => {
      if (progress < 90) {  // 🔥 never exceed 90 before backend confirms
        progress += 5;
        fill.style.width = progress + "%";
        percent.innerText = progress + "%";
      }
    }, 120);

    const response = await fetch("/generate-questions", {
      method: "POST"
    });

    const data = await response.json();

    clearInterval(interval);

    if (!response.ok) {
      throw new Error(data.error || "Generation failed");
    }

    fill.style.width = "100%";
    percent.innerText = "100%";
    text.innerText = "Questions generated successfully!";
    nextBtn.classList.remove("disabled");
    nextBtn.innerText = "Start →";

  } catch (err) {
    clearInterval(interval);
    fill.style.width = "0%";
    percent.innerText = "0%";
    text.innerText = "Failed to generate questions.";
    console.error(err);
  }
}



// -------------------------------
// HELPERS
// -------------------------------
function show(id) {
  document.getElementById(id)?.classList.remove("hidden");
}

function hide(id) {
  document.getElementById(id)?.classList.add("hidden");
}


// -------------------------------
// DASHBOARD CHART
// -------------------------------
document.addEventListener("DOMContentLoaded", function () {

  const ctx = document.getElementById("trendLine");

  if (!ctx) return;   // prevents error on other pages

  new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Interview 1", "Interview 2", "Interview 3", "Interview 4"],
      datasets: [{
        label: "Score",
        data: [45, 60, 75, 55],   // dummy data for now
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.1)",
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0,
          max: 100
        }
      }
    }
  });

});

function openLogin(){
  document.getElementById("loginModal").classList.add("show");
}

function closeLogin(){
  document.getElementById("loginModal").classList.remove("show");
}

async function loginUser(){

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const res = await fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    });

    const data = await res.json();

    if(data.success){
        location.reload();
    }else{
        alert("Invalid credentials");
    }
}

const tabs = document.querySelectorAll(".tab");
const contents = document.querySelectorAll(".tab-content");
const slider = document.querySelector(".tab-slider");

tabs.forEach((tab,index)=>{

    tab.addEventListener("click",()=>{

        tabs.forEach(t=>t.classList.remove("active"));
        contents.forEach(c=>c.classList.remove("active"));

        tab.classList.add("active");

        const id = tab.getAttribute("data-tab");
        document.getElementById(id).classList.add("active");

        slider.style.width = tab.offsetWidth + "px";
        slider.style.left = tab.offsetLeft + "px";

    });

});


window.onload = () => {
    const activeTab = document.querySelector(".tab.active");
    slider.style.width = activeTab.offsetWidth + "px";
    slider.style.left = activeTab.offsetLeft + "px";
};