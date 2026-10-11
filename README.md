# 🎯 QuizMaster PRO — Java Full-Stack Examination Suite

> An enterprise-grade, interactive examination management system powered by an embedded multi-threaded **Java HTTP backend** and a modern, responsive web application.

---

## 🌟 Key Features

1. **Java Embedded Multi-Threaded HTTP Server**:
   - Built using standard `com.sun.net.httpserver.HttpServer` with zero external dependencies.
   - High-throughput multi-threaded worker pool (`Executors.newFixedThreadPool(12)`) handling concurrent requests.
   - REST API endpoints for candidate registration, live exam submission, leaderboards, and question administration.

2. **🔑 Teacher Access Passcode**:
   - Instructors can set an exam access code (Default: `JAVA2026`).
   - Students must enter the passcode to unlock and start tests.

3. **🔀 Anti-Cheat Jumbled Questions & Options**:
   - Questions and their 4 multiple-choice options are dynamically scrambled using the **Fisher-Yates randomization algorithm** for every candidate.

4. **🛡️ Live AI Proctor (Tab & Focus Lock Guard)**:
   - Detects when a student switches browser tabs or minimizes the window.
   - Real-time warnings (Three strikes rule: 3 violations trigger auto-submission and flag the candidate for academic dishonesty).

5. **🏆 Live Hall of Fame Leaderboard**:
   - Podium display for 🥇 1st, 🥈 2nd, and 🥉 3rd place champions.
   - Live rankings sorted by highest score and fastest completion time.
   - Candidates' scores are dynamically refreshed when retaking exams without losing history.

6. **⚔️ 1v1 Speed Clash Arena**:
   - Challenge peer candidates or the **🤖 JavaBot Grandmaster** (AI challenger) in rapid-fire 5-round speed duels with live score bars and animated victory screens.

7. **📊 Instructor Intelligence Dashboard**:
   - KPI metrics (Pass rate, cohort average, topper).
   - Canvas-rendered score distribution bar chart.
   - Complete exam history log (`results.txt`).
   - Dynamic Question Bank manager (`questions.txt`).

---

## 🚀 How to Run Locally

### Option 1: One-Click Launcher (Windows)
Double-click `run.bat` in File Explorer, or open your terminal:
```cmd
.\run.bat
```

### Option 2: PowerShell
```powershell
.\run.ps1
```

The script will automatically compile the Java code, start the web server, and open your browser at **`http://localhost:8080/`**.

---

## 🌐 How Your Teammates Can View It on GitHub

### 1. View Live Online (via GitHub Pages — Zero Setup)
1. Push this repository to GitHub.
2. Go to your GitHub repository **Settings** > **Pages**.
3. Under **Build and deployment** > **Branch**, select `main` and `/ (root)`, then click **Save**.
4. GitHub will give you a live URL:
   ```
   https://<your-username>.github.io/<your-repo-name>/
   ```
   Anyone with this link can interact with the website directly from their browser on laptop, tablet, or phone!

### 2. Run with Java Backend (via Git Clone)
Your teammate can clone and run it locally:
```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
.\run.bat
```

---

## 📁 Project Structure

```
java MP/
├── WebQuizServer.java       # Full-stack Java HTTP server & REST backend
├── QuizSystem.java          # Classic console application (preserved)
├── run.bat                  # One-click Windows CMD launcher
├── run.ps1                  # PowerShell launcher
├── questions.txt            # Persistent question bank (15 advanced questions)
├── candidates.txt           # Registered candidate records
├── results.txt              # Complete exam audit history
├── report.txt               # Instructor summary report
├── index.html               # GitHub Pages redirect entry point
├── web/
│   ├── index.html           # Modern frontend layout (Portal, Exam, Leaderboard, Arena)
│   ├── style.css            # Responsive design system & animations
│   └── app.js               # Reactive frontend logic, proctor, & 1v1 clash engine
└── README.md                # Project documentation
```
