/**
 * QuizMaster PRO - Core Application Logic
 * Full-Stack Java Examination Suite with Live AI Proctoring,
 * Teacher Access Codes, Anti-Cheat Jumbling, Live Leaderboard, and 1v1 Clash Arena.
 */

(function () {
  'use strict';

  // ================= State Management =================
  const state = {
    connected: false,
    theme: localStorage.getItem('qm_theme') || 'dark',
    candidate: null,
    settings: {
      duration: 120,
      passMark: 40,
      accessCode: 'JAVA2026'
    },
    questions: [],             // Master bank of questions
    activeQuestions: [],       // Current candidate's jumbled question set
    currentIndex: 0,
    answers: [],               // array of chosen option indices (-1 for unselected)
    flagged: [],               // array of booleans
    timerInterval: null,
    timeRemaining: 120,
    examStartEpoch: null,
    autoSubmitted: false,
    violations: 0,             // Live proctor tab-switch count
    proctorActive: false,
    proctorVerdict: "Clean Record",
    latestResult: null,
    resultsHistory: [],
    allCandidates: [],

    // 1v1 Battle State
    battle: {
      active: false,
      player: { id: "C101", name: "You", score: 0 },
      rival: { id: "bot", name: "JavaBot Grandmaster", score: 0, isBot: true },
      rounds: [],
      currentRound: 0,
      roundTimer: 15,
      timerInterval: null,
      playerAnswered: false,
      rivalTimeout: null
    }
  };

  // Default seed questions matching QuizSystem.java (15 Advanced Questions)
  const DEFAULT_QUESTIONS = [
    {
      id: 1,
      text: "What will System.out.println(s1 == s2) print if String s1 = \"Java\"; String s2 = new String(\"Java\").intern();?",
      options: ["false", "true", "Compile-time error", "NullPointerException"],
      correct: 1
    },
    {
      id: 2,
      text: "In Java multithreading, what is the primary guarantee of the volatile keyword?",
      options: [
        "Guarantees atomic execution of compound operations like count++",
        "Prevents instruction reordering and ensures thread visibility from main memory",
        "Acquires an intrinsic monitor lock on the object",
        "Prevents the variable from being serialized"
      ],
      correct: 1
    },
    {
      id: 3,
      text: "If both a try block and its finally block contain return statements, which value is returned?",
      options: [
        "The value from the try block",
        "The value from the finally block",
        "Compilation error: unreachable code",
        "Both values concatenated"
      ],
      correct: 1
    },
    {
      id: 4,
      text: "What happens when two distinct keys produce the exact same hashCode() in a Java 8+ HashMap?",
      options: [
        "HashMap throws a HashCollisionException",
        "The second key overwrites the first key immediately",
        "Stored in the same bucket as a linked list, transforming into a red-black tree when chain exceeds 8",
        "A new HashMap with double capacity is automatically allocated"
      ],
      correct: 2
    },
    {
      id: 5,
      text: "Which statement regarding Java Generics Type Erasure is true?",
      options: [
        "Generic type information is fully preserved in bytecode for runtime reflection",
        "Type parameters are replaced with their bounds or Object, and explicit casts are inserted",
        "Primitive types like int can be directly used as generic type arguments",
        "Generic classes generate separate bytecode classes for each type parameter"
      ],
      correct: 1
    },
    {
      id: 6,
      text: "Given Super { int x = 10; } and Sub extends Super { int x = 20; }, what does Super obj = new Sub(); System.out.println(obj.x); print?",
      options: ["20", "10", "Compilation error", "Runtime ClassCastException"],
      correct: 1
    },
    {
      id: 7,
      text: "Which interface must a resource class implement to be managed automatically in a try-with-resources statement?",
      options: ["java.io.Serializable", "java.lang.AutoCloseable", "java.lang.Cloneable", "java.lang.Runnable"],
      correct: 1
    },
    {
      id: 8,
      text: "In Java multithreading, what condition causes a Deadlock?",
      options: [
        "A thread runs an infinite loop consuming 100% CPU",
        "Two or more threads are waiting indefinitely for locks held by each other in a cyclic dependency",
        "A thread attempts to access an uninitialized object reference",
        "The JVM runs out of heap memory during thread allocation"
      ],
      correct: 1
    },
    {
      id: 9,
      text: "What is the result of executing: List<Integer> list = Arrays.asList(1, 2, 3); list.add(4);?",
      options: [
        "[1, 2, 3, 4]",
        "UnsupportedOperationException at runtime",
        "Compilation Error: add() method not found",
        "IndexOutOfBoundsException at runtime"
      ],
      correct: 1
    },
    {
      id: 10,
      text: "Which memory region in the JVM stores local primitive variables and method call stack frames?",
      options: ["Heap Memory", "Metaspace", "Java Thread Stack", "Code Cache"],
      correct: 2
    },
    {
      id: 11,
      text: "What is the core distinction between fail-fast and fail-safe iterators in Java Collections?",
      options: [
        "Fail-fast throws ConcurrentModificationException on modification; fail-safe operates on a cloned snapshot",
        "Fail-fast iterators are synchronized; fail-safe iterators are unsynchronized",
        "Fail-fast iterators only operate on Sets; fail-safe iterators operate on Lists",
        "Fail-fast iterators continue running silently on concurrent changes"
      ],
      correct: 0
    },
    {
      id: 12,
      text: "What is the output of Math.min(Double.MIN_VALUE, 0.0d)?",
      options: ["0.0", "Double.MIN_VALUE", "Double.NaN", "-Infinity"],
      correct: 0
    },
    {
      id: 13,
      text: "Which garbage collection algorithm became the default collector starting in Java 9 for server-class hardware?",
      options: ["Serial GC", "Parallel GC", "Garbage-First (G1) GC", "Z Garbage Collector (ZGC)"],
      correct: 2
    },
    {
      id: 14,
      text: "Can an abstract class in Java have a constructor, and if so, how is it invoked?",
      options: [
        "No, abstract classes cannot declare constructors because they cannot be instantiated",
        "Yes, it is invoked via super() when a concrete subclass instance is instantiated",
        "Yes, but it can only be invoked statically using reflection",
        "No, only concrete classes and interfaces can declare constructors"
      ],
      correct: 1
    },
    {
      id: 15,
      text: "In Java Functional Programming, what is the functional descriptor / signature of a Predicate<T>?",
      options: ["T -> void", "T -> boolean", "() -> T", "(T, T) -> T"],
      correct: 1
    }
  ];

  // Default Candidates
  const DEFAULT_CANDIDATES = [
    { id: "C101", name: "Goutam Kumar Majhi", email: "goutam@example.com" },
    { id: "C102", name: "Priya Sharma", email: "priya@example.com" },
    { id: "C103", name: "Rahul Verma", email: "rahul@example.com" }
  ];

  // ================= DOM Elements Cache =================
  const dom = {
    themeToggle: document.getElementById('theme-toggle'),
    serverStatus: document.getElementById('server-status'),
    navTabs: document.querySelectorAll('.nav-btn'),
    views: {
      portal: document.getElementById('view-portal'),
      quiz: document.getElementById('view-quiz'),
      result: document.getElementById('view-result'),
      admin: document.getElementById('view-admin'),
      leaderboard: document.getElementById('view-leaderboard'),
      battle: document.getElementById('view-battle')
    },
    sessionPill: document.getElementById('session-info-pill'),
    pillName: document.getElementById('pill-candidate-name'),
    pillId: document.getElementById('pill-candidate-id'),
    brandLogo: document.getElementById('brand-logo'),

    // Auth & Access Code
    authTabs: document.querySelectorAll('.card-tab'),
    formLogin: document.getElementById('form-login'),
    formRegister: document.getElementById('form-register'),
    loginIdInput: document.getElementById('login-id'),
    loginAccessCode: document.getElementById('login-access-code'),
    regAccessCode: document.getElementById('reg-access-code'),
    chipsContainer: document.getElementById('chips-container'),
    labelExamDuration: document.getElementById('label-exam-duration'),
    hintCodeDisplay: document.getElementById('hint-code-display'),

    // Live Proctoring
    proctorWidget: document.getElementById('proctor-widget'),
    proctorViolationCount: document.getElementById('proctor-violation-count'),
    modalProctorAlert: document.getElementById('modal-proctor-alert'),
    proctorModalCount: document.getElementById('proctor-modal-count'),
    btnDismissProctor: document.getElementById('btn-dismiss-proctor'),
    resProctorVerdict: document.getElementById('res-proctor-verdict'),

    // Quiz Session
    quizAvatar: document.getElementById('quiz-avatar'),
    quizStudentName: document.getElementById('quiz-student-name'),
    quizStudentId: document.getElementById('quiz-student-id'),
    quizTotalQBadge: document.getElementById('quiz-total-q-badge'),
    timerWidget: document.getElementById('timer-widget'),
    timerDisplay: document.getElementById('timer-display'),
    timerProgress: document.getElementById('timer-progress'),
    timerWarningText: document.getElementById('timer-warning-text'),
    progressCount: document.getElementById('progress-count'),
    progressPercentLabel: document.getElementById('progress-percent-label'),
    progressBarFill: document.getElementById('quiz-progress-bar'),
    btnSubmitEarly: document.getElementById('btn-submit-early'),
    qNumberPill: document.getElementById('q-number-pill'),
    btnFlagQuestion: document.getElementById('btn-flag-question'),
    flagText: document.getElementById('flag-text'),
    currentQuestionText: document.getElementById('current-question-text'),
    optionsContainer: document.getElementById('options-container'),
    btnPrevQ: document.getElementById('btn-prev-q'),
    btnNextQ: document.getElementById('btn-next-q'),
    btnClearSelection: document.getElementById('btn-clear-selection'),
    paletteGrid: document.getElementById('palette-grid'),

    // Modals
    modalConfirm: document.getElementById('modal-confirm-submit'),
    modalCloseConfirm: document.getElementById('modal-close-confirm'),
    btnCancelSubmit: document.getElementById('btn-cancel-submit'),
    btnExecuteSubmit: document.getElementById('btn-execute-submit'),
    confirmAnsweredCount: document.getElementById('confirm-answered-count'),
    confirmTotalCount: document.getElementById('confirm-total-count'),

    modalAddQ: document.getElementById('modal-add-q'),
    modalCloseAddQ: document.getElementById('modal-close-add-q'),
    btnCancelAddQ: document.getElementById('btn-cancel-add-q'),
    formAddQ: document.getElementById('form-add-q'),
    btnOpenAddQ: document.getElementById('btn-open-add-q'),

    // Results & Scorecard
    scoreStatusBadge: document.getElementById('score-status-badge'),
    scoreTimestamp: document.getElementById('score-timestamp'),
    scoreRadialFill: document.getElementById('score-radial-fill'),
    scorePercentVal: document.getElementById('score-percent-val'),
    scoreRatioVal: document.getElementById('score-ratio-val'),
    resCandidateName: document.getElementById('res-candidate-name'),
    resCandidateId: document.getElementById('res-candidate-id'),
    resTimeTaken: document.getElementById('res-time-taken'),
    resTimeMax: document.getElementById('res-time-max'),
    resSubmissionType: document.getElementById('res-submission-type'),
    resGrade: document.getElementById('res-grade'),
    breakdownContainer: document.getElementById('breakdown-container'),
    btnPrintScorecard: document.getElementById('btn-print-scorecard'),
    btnRetakeQuiz: document.getElementById('btn-retake-quiz'),
    btnGotoLeaderboard: document.getElementById('btn-goto-leaderboard'),

    // Leaderboard
    btnRefreshLeaderboard: document.getElementById('btn-refresh-leaderboard'),
    filterLeaderboard: document.getElementById('filter-leaderboard'),
    leaderboardTbody: document.getElementById('leaderboard-tbody'),
    podiumGoldName: document.getElementById('podium-gold-name'),
    podiumGoldScore: document.getElementById('podium-gold-score'),
    podiumGoldTime: document.getElementById('podium-gold-time'),
    podiumSilverName: document.getElementById('podium-silver-name'),
    podiumSilverScore: document.getElementById('podium-silver-score'),
    podiumSilverTime: document.getElementById('podium-silver-time'),
    podiumBronzeName: document.getElementById('podium-bronze-name'),
    podiumBronzeScore: document.getElementById('podium-bronze-score'),
    podiumBronzeTime: document.getElementById('podium-bronze-time'),

    // 1v1 Battle Arena
    battleLobbyCard: document.getElementById('battle-lobby-card'),
    battlePlayerId: document.getElementById('battle-player-id'),
    battleRivalSelect: document.getElementById('battle-rival-select'),
    btnStartBattle: document.getElementById('btn-start-battle'),
    battleArenaCard: document.getElementById('battle-arena-card'),
    gladiatorP1Name: document.getElementById('gladiator-p1-name'),
    gladiatorP1Bar: document.getElementById('gladiator-p1-bar'),
    gladiatorP1Score: document.getElementById('gladiator-p1-score'),
    gladiatorP2Name: document.getElementById('gladiator-p2-name'),
    gladiatorP2Bar: document.getElementById('gladiator-p2-bar'),
    gladiatorP2Score: document.getElementById('gladiator-p2-score'),
    arenaRoundBadge: document.getElementById('arena-round-badge'),
    arenaTimer: document.getElementById('arena-timer'),
    arenaQPrompt: document.getElementById('arena-q-prompt'),
    arenaOptionsGrid: document.getElementById('arena-options-grid'),
    arenaFooterStatus: document.getElementById('arena-footer-status'),
    battleVictoryCard: document.getElementById('battle-victory-card'),
    battleOutcomeIcon: document.getElementById('battle-outcome-icon'),
    battleOutcomeHeadline: document.getElementById('battle-outcome-headline'),
    battleOutcomeSub: document.getElementById('battle-outcome-sub'),
    finalP1Name: document.getElementById('final-p1-name'),
    finalP1Score: document.getElementById('final-p1-score'),
    finalP2Name: document.getElementById('final-p2-name'),
    finalP2Score: document.getElementById('final-p2-score'),
    btnBattleRematch: document.getElementById('btn-battle-rematch'),
    btnBattlePortal: document.getElementById('btn-battle-portal'),

    // Admin & Instructor Hub
    btnRefreshAdmin: document.getElementById('btn-refresh-admin'),
    btnSeedQuestions: document.getElementById('btn-seed-questions'),
    kpiAttempts: document.getElementById('kpi-attempts'),
    kpiAvg: document.getElementById('kpi-avg'),
    kpiPassRate: document.getElementById('kpi-pass-rate'),
    kpiPassRatio: document.getElementById('kpi-pass-ratio'),
    kpiHighest: document.getElementById('kpi-highest'),
    kpiTopper: document.getElementById('kpi-topper'),
    kpiQuestionsCount: document.getElementById('kpi-questions-count'),
    formConfig: document.getElementById('form-config'),
    cfgDuration: document.getElementById('cfg-duration'),
    cfgPassmark: document.getElementById('cfg-passmark'),
    cfgCode: document.getElementById('cfg-code'),
    filterHistory: document.getElementById('filter-history'),
    historyTbody: document.getElementById('history-tbody'),
    adminQuestionsList: document.getElementById('admin-questions-list'),

    // Toasts
    toastContainer: document.getElementById('toast-container')
  };

  // ================= Init & Event Setup =================
  async function init() {
    setupTheme();
    setupCanvasAnimation();
    setupEventListeners();
    setupProctoring();
    await checkBackendConnection();
    await loadInitialData();
    renderCandidateChips();
    switchView('portal');
  }

  // ================= Theme Toggle =================
  function setupTheme() {
    if (state.theme === 'light') {
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
      document.body.classList.add('theme-dark');
    }
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('qm_theme', state.theme);
    setupTheme();
    renderScoreChart();
  }

  // ================= Backend Connection & Fallback =================
  async function checkBackendConnection() {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      if (res.ok) {
        state.connected = true;
        const data = await res.json();
        if (data.duration) state.settings.duration = data.duration;
        if (data.passMark) state.settings.passMark = data.passMark;
        if (data.accessCode) state.settings.accessCode = data.accessCode;
        updateServerBadge(true);
        return;
      }
    } catch (e) {}
    state.connected = false;
    updateServerBadge(false);
  }

  function updateServerBadge(isLive) {
    if (isLive) {
      dom.serverStatus.innerHTML = `
        <span class="indicator-dot online"></span>
        <span class="status-text">Java Backend Live</span>
      `;
      dom.serverStatus.title = "Connected to Java HttpServer on localhost:8080";
    } else {
      dom.serverStatus.innerHTML = `
        <span class="indicator-dot" style="background:#f59e0b; box-shadow:0 0 6px #f59e0b;"></span>
        <span class="status-text">Stand-alone Mode</span>
      `;
      dom.serverStatus.title = "Running locally in browser with instant sync";
    }
  }

  async function loadInitialData() {
    // 1. Settings & Access Code
    dom.labelExamDuration.textContent = `${state.settings.duration}s Live Countdown`;
    dom.cfgDuration.value = state.settings.duration;
    dom.cfgPassmark.value = state.settings.passMark;
    if (dom.cfgCode) dom.cfgCode.value = state.settings.accessCode;
    if (dom.hintCodeDisplay) dom.hintCodeDisplay.textContent = state.settings.accessCode;

    // 2. Candidates
    if (state.connected) {
      try {
        const res = await fetch('/api/candidates');
        if (res.ok) state.allCandidates = await res.json();
      } catch (e) { state.allCandidates = loadLocal('qm_candidates', DEFAULT_CANDIDATES); }
    } else {
      state.allCandidates = loadLocal('qm_candidates', DEFAULT_CANDIDATES);
    }

    // 3. Questions
    if (state.connected) {
      try {
        const res = await fetch('/api/questions');
        if (res.ok) state.questions = await res.json();
      } catch (e) { state.questions = loadLocal('qm_questions', DEFAULT_QUESTIONS); }
    } else {
      state.questions = loadLocal('qm_questions', DEFAULT_QUESTIONS);
    }
    if (!state.questions || state.questions.length === 0) {
      state.questions = DEFAULT_QUESTIONS;
    }

    // 4. Results
    if (state.connected) {
      try {
        const res = await fetch('/api/results');
        if (res.ok) state.resultsHistory = await res.json();
      } catch (e) { state.resultsHistory = loadLocal('qm_results', []); }
    } else {
      state.resultsHistory = loadLocal('qm_results', []);
    }
  }

  function loadLocal(key, defaultVal) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultVal;
    } catch (e) { return defaultVal; }
  }

  function saveLocal(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  // ================= Navigation & View Management =================
  function switchView(viewName) {
    Object.keys(dom.views).forEach(v => {
      if (dom.views[v]) dom.views[v].classList.remove('active');
    });

    if (dom.views[viewName]) {
      dom.views[viewName].classList.add('active');
    }

    dom.navTabs.forEach(tab => {
      const target = tab.getAttribute('data-target');
      if (target === `view-${viewName}`) tab.classList.add('active');
      else tab.classList.remove('active');
    });

    if (viewName === 'quiz') {
      dom.sessionPill.style.display = 'block';
    } else {
      dom.sessionPill.style.display = 'none';
      state.proctorActive = false; // Disable proctor when leaving exam view
    }

    if (viewName === 'admin') renderAdminDashboard();
    if (viewName === 'leaderboard') renderLeaderboard();
  }

  // ================= Candidate Chips =================
  function renderCandidateChips() {
    dom.chipsContainer.innerHTML = '';
    state.allCandidates.slice(0, 6).forEach(c => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = `${c.id} (${c.name.split(' ')[0]})`;
      chip.title = `${c.name} - ${c.email}`;
      chip.addEventListener('click', () => {
        dom.loginIdInput.value = c.id;
        showToast(`Selected Candidate: ${c.name}`, 'info');
      });
      dom.chipsContainer.appendChild(chip);
    });
  }

  // ================= Event Listeners =================
  function setupEventListeners() {
    dom.themeToggle.addEventListener('click', toggleTheme);

    // Nav tabs
    dom.navTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        if (target === 'view-portal') switchView('portal');
        else if (target === 'view-admin') switchView('admin');
        else if (target === 'view-leaderboard') switchView('leaderboard');
        else if (target === 'view-battle') switchView('battle');
      });
    });

    dom.brandLogo.addEventListener('click', () => {
      if (state.timerInterval) {
        if (!confirm("Are you sure you want to abandon the current exam?")) return;
        clearInterval(state.timerInterval);
      }
      switchView('portal');
    });

    // Auth Switcher
    dom.authTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        dom.authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const mode = tab.getAttribute('data-auth');
        if (mode === 'existing') {
          dom.formLogin.classList.add('active');
          dom.formRegister.classList.remove('active');
        } else {
          dom.formLogin.classList.remove('active');
          dom.formRegister.classList.add('active');
        }
      });
    });

    // Login & Register Submission
    dom.formLogin.addEventListener('submit', handleLogin);
    dom.formRegister.addEventListener('submit', handleRegister);

    // Quiz Navigation Controls
    dom.btnPrevQ.addEventListener('click', () => navigateQuestion(state.currentIndex - 1));
    dom.btnNextQ.addEventListener('click', () => navigateQuestion(state.currentIndex + 1));
    dom.btnClearSelection.addEventListener('click', clearCurrentChoice);
    dom.btnFlagQuestion.addEventListener('click', toggleFlagCurrent);

    dom.btnSubmitEarly.addEventListener('click', showSubmitConfirmationModal);
    dom.modalCloseConfirm.addEventListener('click', hideSubmitConfirmationModal);
    dom.btnCancelSubmit.addEventListener('click', hideSubmitConfirmationModal);
    dom.btnExecuteSubmit.addEventListener('click', () => {
      hideSubmitConfirmationModal();
      finalizeExam(false);
    });

    // Proctor Modal Dismiss
    dom.btnDismissProctor.addEventListener('click', () => {
      dom.modalProctorAlert.classList.remove('active');
    });

    // Scorecard Actions
    dom.btnPrintScorecard.addEventListener('click', () => window.print());
    dom.btnRetakeQuiz.addEventListener('click', () => switchView('portal'));
    dom.btnGotoLeaderboard.addEventListener('click', () => switchView('leaderboard'));

    // Leaderboard Actions
    dom.btnRefreshLeaderboard.addEventListener('click', async () => {
      await loadInitialData();
      renderLeaderboard();
      showToast("Leaderboard updated from server.", "success");
    });
    dom.filterLeaderboard.addEventListener('input', (e) => filterLeaderboard(e.target.value));

    // 1v1 Battle Controls
    dom.btnStartBattle.addEventListener('click', startBattleMatch);
    dom.btnBattleRematch.addEventListener('click', startBattleMatch);
    dom.btnBattlePortal.addEventListener('click', () => switchView('portal'));

    // Admin Actions
    dom.btnRefreshAdmin.addEventListener('click', async () => {
      await loadInitialData();
      renderAdminDashboard();
      showToast("Refreshed all metrics from server.", "success");
    });

    dom.btnSeedQuestions.addEventListener('click', async () => {
      if (!confirm("Restore standard questions bank?")) return;
      state.questions = [...DEFAULT_QUESTIONS];
      saveLocal('qm_questions', state.questions);
      if (state.connected) {
        try { await fetch('/api/questions/seed', { method: 'POST' }); } catch (e) {}
      }
      renderAdminQuestionsList();
      showToast("Question bank restored to 15 standard questions.", "info");
    });

    dom.formConfig.addEventListener('submit', handleSaveConfig);
    dom.filterHistory.addEventListener('input', (e) => filterHistoryTable(e.target.value));

    // Modal: Add Question
    dom.btnOpenAddQ.addEventListener('click', () => dom.modalAddQ.classList.add('active'));
    dom.modalCloseAddQ.addEventListener('click', () => dom.modalAddQ.classList.remove('active'));
    dom.btnCancelAddQ.addEventListener('click', () => dom.modalAddQ.classList.remove('active'));
    dom.formAddQ.addEventListener('submit', handleAddQuestion);

    // Keyboard Shortcuts
    window.addEventListener('keydown', handleKeyNavigation);
  }

  // ================= Anti-Cheat Question & Option Jumbling =================
  function jumbleQuestionsAndOptions(sourceQuestions) {
    // 1. Deep clone
    const cloned = sourceQuestions.map(q => ({
      id: q.id,
      text: q.text,
      options: [...q.options],
      correct: q.correct
    }));

    // 2. Fisher-Yates shuffle the question order
    for (let i = cloned.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
    }

    // 3. For each question, shuffle options while maintaining correct answer tracking
    cloned.forEach(q => {
      const correctOptionText = q.options[q.correct];
      for (let i = q.options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
      }
      q.correct = q.options.indexOf(correctOptionText);
    });

    return cloned;
  }

  // ================= Live Proctoring & Focus Lock =================
  function setupProctoring() {
    document.addEventListener('visibilitychange', () => {
      if (!state.proctorActive) return;
      if (document.hidden) {
        handleProctorViolation("Tab switch or browser minimized");
      }
    });

    window.addEventListener('blur', () => {
      if (!state.proctorActive) return;
      handleProctorViolation("Focus lost from examination window");
    });
  }

  function handleProctorViolation(reason) {
    if (!state.proctorActive) return;
    state.violations++;
    dom.proctorViolationCount.textContent = state.violations;
    dom.proctorModalCount.textContent = state.violations;

    if (state.violations >= 3) {
      state.proctorActive = false;
      dom.modalProctorAlert.classList.remove('active');
      state.proctorVerdict = "FLAGGED (ACADEMIC DISHONESTY)";
      showToast("Exam terminated by AI Proctor due to multiple tab-switch violations!", "error");
      finalizeExam(true);
    } else {
      dom.modalProctorAlert.classList.add('active');
      showToast(`⚠️ Proctor Warning #${state.violations}/3: ${reason}`, "error");
    }
  }

  // ================= Auth Handlers with Teacher Access Code =================
  async function handleLogin(e) {
    e.preventDefault();
    const id = dom.loginIdInput.value.trim();
    const enteredCode = dom.loginAccessCode.value.trim().toUpperCase();

    // Verify Teacher Access Code
    const expectedCode = (state.settings.accessCode || 'JAVA2026').toUpperCase();
    if (enteredCode !== expectedCode) {
      showToast(`Invalid Teacher Access Code. Expected "${expectedCode}".`, "error");
      return;
    }

    if (!id) return;

    let candidate = state.allCandidates.find(c => c.id.toLowerCase() === id.toLowerCase());
    if (!candidate && state.connected) {
      try {
        const res = await fetch(`/api/candidates?id=${encodeURIComponent(id)}`);
        if (res.ok) candidate = await res.json();
      } catch (err) {}
    }

    if (!candidate) {
      showToast(`Candidate ID "${id}" not found. Please register first.`, "error");
      return;
    }

    state.candidate = candidate;
    startQuizSession();
  }

  async function handleRegister(e) {
    e.preventDefault();
    const id = document.getElementById('reg-id').value.trim();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const enteredCode = dom.regAccessCode.value.trim().toUpperCase();

    // Verify Teacher Access Code
    const expectedCode = (state.settings.accessCode || 'JAVA2026').toUpperCase();
    if (enteredCode !== expectedCode) {
      showToast(`Invalid Teacher Access Code. Expected "${expectedCode}".`, "error");
      return;
    }

    if (!id || !name || !email) {
      showToast("All fields are required.", "error");
      return;
    }

    if (state.allCandidates.some(c => c.id.toLowerCase() === id.toLowerCase())) {
      showToast(`Candidate ID "${id}" is already registered.`, "error");
      return;
    }

    const newCandidate = { id, name, email };
    state.allCandidates.push(newCandidate);
    saveLocal('qm_candidates', state.allCandidates);

    if (state.connected) {
      try {
        await fetch('/api/candidates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newCandidate)
        });
      } catch (err) {}
    }

    renderCandidateChips();
    showToast(`Candidate ${name} (${id}) registered! Starting exam...`, "success");

    state.candidate = newCandidate;
    startQuizSession();
  }

  // ================= Quiz Session Execution =================
  function startQuizSession() {
    if (!state.candidate) return;

    // 1. Anti-Cheat: Jumble questions and options for this candidate session
    state.activeQuestions = jumbleQuestionsAndOptions(state.questions);

    // 2. Reset session state
    state.currentIndex = 0;
    state.answers = new Array(state.activeQuestions.length).fill(-1);
    state.flagged = new Array(state.activeQuestions.length).fill(false);
    state.autoSubmitted = false;
    state.violations = 0;
    state.proctorVerdict = "Clean Record";
    state.timeRemaining = state.settings.duration;
    state.examStartEpoch = Date.now();

    // 3. UI setup
    dom.pillName.textContent = state.candidate.name;
    dom.pillId.textContent = state.candidate.id;
    dom.quizStudentName.textContent = state.candidate.name;
    dom.quizStudentId.textContent = state.candidate.id;
    dom.quizAvatar.textContent = state.candidate.name.charAt(0).toUpperCase();
    dom.quizTotalQBadge.textContent = state.activeQuestions.length;
    dom.proctorViolationCount.textContent = "0";

    renderPalette();
    renderQuestion(state.currentIndex);

    // 4. Switch view & activate live proctoring
    switchView('quiz');
    state.proctorActive = true;
    startTimer();

    showToast(`Exam unlocked! Jumbled ${state.activeQuestions.length} questions. Proctor monitoring active.`, "info");
  }

  function startTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    updateTimerDisplay();

    state.timerInterval = setInterval(() => {
      state.timeRemaining--;
      updateTimerDisplay();

      if (state.timeRemaining <= 0) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        finalizeExam(true);
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    dom.timerDisplay.textContent = state.timeRemaining;
    const circumference = 163.36;
    const progress = Math.max(0, state.timeRemaining / state.settings.duration);
    const offset = circumference * (1 - progress);
    dom.timerProgress.style.strokeDashoffset = offset;

    if (state.timeRemaining <= 15) {
      dom.timerWidget.classList.remove('timer-warning');
      dom.timerWidget.classList.add('timer-danger');
      dom.timerWarningText.textContent = "Submitting soon!";
    } else if (state.timeRemaining <= 45) {
      dom.timerWidget.classList.add('timer-warning');
      dom.timerWidget.classList.remove('timer-danger');
      dom.timerWarningText.textContent = "Hurry up!";
    } else {
      dom.timerWidget.classList.remove('timer-warning', 'timer-danger');
      dom.timerWarningText.textContent = "In progress";
    }
  }

  // ================= Question Rendering & Navigation =================
  function renderQuestion(index) {
    if (index < 0 || index >= state.activeQuestions.length) return;
    state.currentIndex = index;

    const q = state.activeQuestions[index];

    dom.qNumberPill.textContent = `Question ${index + 1} of ${state.activeQuestions.length}`;
    dom.currentQuestionText.textContent = q.text;

    const isFlagged = state.flagged[index];
    if (isFlagged) {
      dom.btnFlagQuestion.classList.add('flagged');
      dom.flagText.textContent = "Flagged";
    } else {
      dom.btnFlagQuestion.classList.remove('flagged');
      dom.flagText.textContent = "Flag for Review";
    }

    // Render 4 options
    dom.optionsContainer.innerHTML = '';
    const keys = ['1', '2', '3', '4'];
    q.options.forEach((optText, optIdx) => {
      const optDiv = document.createElement('div');
      optDiv.className = 'option-item';
      if (state.answers[index] === optIdx) optDiv.classList.add('selected');

      optDiv.innerHTML = `
        <div class="option-key">${keys[optIdx]}</div>
        <div class="option-label">${optText}</div>
        <div class="option-check"></div>
      `;

      optDiv.addEventListener('click', () => selectOption(index, optIdx));
      dom.optionsContainer.appendChild(optDiv);
    });

    // Update Nav Buttons
    dom.btnPrevQ.disabled = index === 0;
    dom.btnNextQ.innerHTML = index === state.activeQuestions.length - 1
      ? `Finish Exam <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
      : `Next <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`;

    // Progress percentage
    dom.progressCount.textContent = `${index + 1} of ${state.activeQuestions.length}`;
    const percent = Math.round(((index + 1) / state.activeQuestions.length) * 100);
    dom.progressPercentLabel.textContent = `${percent}%`;
    dom.progressBarFill.style.width = `${percent}%`;

    renderPalette();
  }

  function selectOption(qIdx, optIdx) {
    state.answers[qIdx] = optIdx;
    const optionElements = dom.optionsContainer.querySelectorAll('.option-item');
    optionElements.forEach((el, idx) => {
      if (idx === optIdx) el.classList.add('selected');
      else el.classList.remove('selected');
    });
    renderPalette();
  }

  function clearCurrentChoice() {
    state.answers[state.currentIndex] = -1;
    const optionElements = dom.optionsContainer.querySelectorAll('.option-item');
    optionElements.forEach(el => el.classList.remove('selected'));
    renderPalette();
    showToast("Choice cleared.", "info");
  }

  function toggleFlagCurrent() {
    state.flagged[state.currentIndex] = !state.flagged[state.currentIndex];
    renderQuestion(state.currentIndex);
  }

  function navigateQuestion(newIndex) {
    if (newIndex >= state.activeQuestions.length) {
      showSubmitConfirmationModal();
      return;
    }
    if (newIndex < 0) return;
    renderQuestion(newIndex);
  }

  function renderPalette() {
    dom.paletteGrid.innerHTML = '';
    state.activeQuestions.forEach((q, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'palette-btn';
      btn.textContent = idx + 1;

      if (idx === state.currentIndex) btn.classList.add('current');
      if (state.answers[idx] !== -1) btn.classList.add('answered');
      if (state.flagged[idx]) btn.classList.add('flagged');

      btn.addEventListener('click', () => renderQuestion(idx));
      dom.paletteGrid.appendChild(btn);
    });
  }

  function handleKeyNavigation(e) {
    if (!dom.views.quiz.classList.contains('active')) return;
    if (dom.modalConfirm.classList.contains('active') || dom.modalProctorAlert.classList.contains('active')) return;

    if (e.key === '1') selectOption(state.currentIndex, 0);
    else if (e.key === '2') selectOption(state.currentIndex, 1);
    else if (e.key === '3') selectOption(state.currentIndex, 2);
    else if (e.key === '4') selectOption(state.currentIndex, 3);
    else if (e.key === 'ArrowRight' || e.key === 'Enter') navigateQuestion(state.currentIndex + 1);
    else if (e.key === 'ArrowLeft') navigateQuestion(state.currentIndex - 1);
  }

  // ================= Submission & Scoring =================
  function showSubmitConfirmationModal() {
    const answeredCount = state.answers.filter(a => a !== -1).length;
    dom.confirmAnsweredCount.textContent = answeredCount;
    dom.confirmTotalCount.textContent = state.activeQuestions.length;
    dom.modalConfirm.classList.add('active');
  }

  function hideSubmitConfirmationModal() {
    dom.modalConfirm.classList.remove('active');
  }

  async function finalizeExam(isAuto) {
    state.proctorActive = false; // Deactivate proctor
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }

    state.autoSubmitted = isAuto;
    const timeTaken = Math.min(
      state.settings.duration,
      Math.round((Date.now() - state.examStartEpoch) / 1000)
    );

    // Calculate score against jumbled questions
    let score = 0;
    const breakdown = state.activeQuestions.map((q, idx) => {
      const chosen = state.answers[idx];
      const isCorrect = chosen === q.correct;
      if (isCorrect) score++;
      return {
        questionId: q.id,
        prompt: q.text,
        options: q.options,
        chosenIndex: chosen,
        correctIndex: q.correct,
        isCorrect: isCorrect,
        isSkipped: chosen === -1
      };
    });

    const percent = Math.round((score / state.activeQuestions.length) * 100);
    const passed = percent >= state.settings.passMark && state.proctorVerdict !== "FLAGGED (ACADEMIC DISHONESTY)";
    const timestamp = new Date().toLocaleString();

    const resultObj = {
      candidateId: state.candidate.id,
      name: state.candidate.name,
      score: score,
      total: state.activeQuestions.length,
      percent: percent,
      passed: passed,
      timeTaken: timeTaken,
      autoSubmitted: isAuto,
      proctorVerdict: state.proctorVerdict,
      timestamp: timestamp,
      breakdown: breakdown
    };

    state.latestResult = resultObj;
    state.resultsHistory.push(resultObj);
    saveLocal('qm_results', state.resultsHistory);

    // Sync to Java backend
    if (state.connected) {
      try {
        await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateId: state.candidate.id,
            name: state.candidate.name,
            score: score,
            total: state.activeQuestions.length,
            timeTakenSec: timeTaken,
            autoSubmitted: isAuto,
            proctorVerdict: state.proctorVerdict
          })
        });
      } catch (err) {}
    }

    renderScorecard(resultObj);
    switchView('result');
  }

  // ================= Scorecard Presentation =================
  function renderScorecard(res) {
    if (res.passed) {
      dom.scoreStatusBadge.className = 'badge-status-pill pass';
      dom.scoreStatusBadge.textContent = 'PASSED (CERTIFIED)';
      triggerConfetti();
    } else {
      dom.scoreStatusBadge.className = 'badge-status-pill fail';
      dom.scoreStatusBadge.textContent = res.proctorVerdict.includes("FLAGGED")
        ? 'FLAGGED (ACADEMIC DISHONESTY)'
        : 'NEEDS IMPROVEMENT';
    }

    dom.scoreTimestamp.textContent = `Completed on: ${res.timestamp}`;
    const circumference = 389.55;
    const offset = circumference * (1 - (res.percent / 100));
    dom.scoreRadialFill.style.strokeDashoffset = offset;
    dom.scoreRadialFill.style.stroke = res.passed ? 'var(--emerald)' : 'var(--rose)';
    dom.scorePercentVal.textContent = `${res.percent}%`;
    dom.scoreRatioVal.textContent = `${res.score} / ${res.total} Marks`;

    dom.resCandidateName.textContent = res.name;
    dom.resCandidateId.textContent = res.candidateId;
    dom.resTimeTaken.textContent = `${res.timeTaken}s`;
    dom.resTimeMax.textContent = `${state.settings.duration}s`;
    dom.resSubmissionType.textContent = res.autoSubmitted ? "Auto-Submitted (Timer)" : "Normal Submission";
    dom.resProctorVerdict.textContent = res.proctorVerdict || "Clean Record";
    if (res.proctorVerdict && res.proctorVerdict.includes("FLAGGED")) {
      dom.resProctorVerdict.style.color = "var(--rose)";
    } else {
      dom.resProctorVerdict.style.color = "var(--emerald)";
    }

    let grade = "F";
    if (res.percent >= 90) grade = "A+ (Outstanding)";
    else if (res.percent >= 80) grade = "A (Excellent)";
    else if (res.percent >= 60) grade = "B (Good)";
    else if (res.percent >= 40) grade = "C (Pass)";
    dom.resGrade.textContent = grade;

    // Breakdown list
    dom.breakdownContainer.innerHTML = '';
    res.breakdown.forEach((item, idx) => {
      const card = document.createElement('div');
      const cardType = item.isSkipped ? 'skipped' : (item.isCorrect ? 'correct' : 'incorrect');
      card.className = `breakdown-card ${cardType}`;

      const yourAnsText = item.chosenIndex !== -1 ? item.options[item.chosenIndex] : "<em>(Skipped)</em>";
      const correctAnsText = item.options[item.correctIndex];

      card.innerHTML = `
        <div class="breakdown-q-title">Q${idx + 1}. ${item.prompt}</div>
        <div class="breakdown-ans-grid">
          <div class="ans-row">
            <span class="ans-tag your-ans">Your Choice:</span>
            <span>${yourAnsText}</span>
          </div>
          <div class="ans-row">
            <span class="ans-tag correct-ans">Solution:</span>
            <span><strong>${correctAnsText}</strong></span>
          </div>
        </div>
      `;
      dom.breakdownContainer.appendChild(card);
    });
  }

  // ================= Live Leaderboard Logic =================
  function renderLeaderboard() {
    // Refresh ranking by keeping each candidate's best/latest performance
    const map = new Map();
    state.resultsHistory.forEach(r => {
      const existing = map.get(r.candidateId);
      if (!existing || r.score > existing.score || (r.score === existing.score && (r.timeTaken || 0) < (existing.timeTaken || 0))) {
        map.set(r.candidateId, r);
      }
    });

    let list = Array.from(map.values());
    list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.timeTaken || 0) - (b.timeTaken || 0);
    });

    // Populate Top 3 Podium
    if (list.length > 0) {
      dom.podiumGoldName.textContent = list[0].name;
      dom.podiumGoldScore.textContent = `${list[0].score} / ${list[0].total}`;
      dom.podiumGoldTime.textContent = `${list[0].timeTaken || 0}s • ${list[0].percent}%`;
    }
    if (list.length > 1) {
      dom.podiumSilverName.textContent = list[1].name;
      dom.podiumSilverScore.textContent = `${list[1].score} / ${list[1].total}`;
      dom.podiumSilverTime.textContent = `${list[1].timeTaken || 0}s • ${list[1].percent}%`;
    }
    if (list.length > 2) {
      dom.podiumBronzeName.textContent = list[2].name;
      dom.podiumBronzeScore.textContent = `${list[2].score} / ${list[2].total}`;
      dom.podiumBronzeTime.textContent = `${list[2].timeTaken || 0}s • ${list[2].percent}%`;
    }

    renderLeaderboardTable(list);
  }

  function renderLeaderboardTable(list) {
    dom.leaderboardTbody.innerHTML = '';
    if (list.length === 0) {
      dom.leaderboardTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2.5rem; color: var(--text-dim);">No examination records yet. Take an exam to enter the Hall of Fame!</td></tr>`;
      return;
    }

    list.forEach((r, idx) => {
      const tr = document.createElement('tr');
      let rankBadge = `#${idx + 1}`;
      if (idx === 0) rankBadge = "🥇 1st";
      else if (idx === 1) rankBadge = "🥈 2nd";
      else if (idx === 2) rankBadge = "🥉 3rd";

      let grade = "A+";
      if (r.percent < 40) grade = "F";
      else if (r.percent < 60) grade = "C";
      else if (r.percent < 80) grade = "B";

      const proctorFlag = (r.proctorVerdict && r.proctorVerdict.includes("FLAGGED"))
        ? `<span class="badge-outcome fail">Flagged</span>`
        : `<span class="badge-outcome pass">Clean</span>`;

      tr.innerHTML = `
        <td><strong style="color:var(--primary); font-family:var(--font-mono);">${rankBadge}</strong></td>
        <td><code class="code-font">${r.candidateId}</code></td>
        <td><strong>${r.name}</strong></td>
        <td>${r.score}/${r.total}</td>
        <td><strong>${r.percent}%</strong></td>
        <td>${r.timeTaken || 0}s</td>
        <td>${grade}</td>
        <td>${proctorFlag}</td>
      `;
      dom.leaderboardTbody.appendChild(tr);
    });
  }

  function filterLeaderboard(keyword) {
    const q = keyword.toLowerCase().trim();
    if (!q) {
      renderLeaderboard();
      return;
    }
    const filtered = state.resultsHistory.filter(r =>
      r.name.toLowerCase().includes(q) || r.candidateId.toLowerCase().includes(q)
    );
    renderLeaderboardTable(filtered);
  }

  // ================= 1v1 Speed Clash Arena =================
  function startBattleMatch() {
    const playerId = dom.battlePlayerId.value.trim() || "C101";
    const rivalVal = dom.battleRivalSelect.value;

    let rivalName = "JavaBot Grandmaster";
    if (rivalVal === 'bot_speed') rivalName = "CyberCoder AI";
    else if (rivalVal === 'C102') rivalName = "Priya Sharma";
    else if (rivalVal === 'C103') rivalName = "Rahul Verma";

    // Select 5 random battle questions
    const shuffled = [...state.questions].sort(() => 0.5 - Math.random()).slice(0, 5);

    state.battle = {
      active: true,
      player: { id: playerId, name: "You (" + playerId + ")", score: 0 },
      rival: { id: rivalVal, name: rivalName, score: 0, isBot: rivalVal.startsWith('bot') },
      rounds: shuffled,
      currentRound: 0,
      roundTimer: 15,
      timerInterval: null,
      playerAnswered: false,
      rivalTimeout: null
    };

    dom.battleLobbyCard.style.display = 'none';
    dom.battleVictoryCard.style.display = 'none';
    dom.battleArenaCard.style.display = 'block';

    dom.gladiatorP1Name.textContent = state.battle.player.name;
    dom.gladiatorP2Name.textContent = state.battle.rival.name;
    dom.gladiatorP1Score.textContent = "0";
    dom.gladiatorP2Score.textContent = "0";
    dom.gladiatorP1Bar.style.width = "0%";
    dom.gladiatorP2Bar.style.width = "0%";

    loadBattleRound(0);
  }

  function loadBattleRound(roundIdx) {
    if (roundIdx >= state.battle.rounds.length) {
      endBattleMatch();
      return;
    }

    state.battle.currentRound = roundIdx;
    state.battle.playerAnswered = false;
    state.battle.roundTimer = 15;

    const q = state.battle.rounds[roundIdx];
    dom.arenaRoundBadge.textContent = `Round ${roundIdx + 1} of 5`;
    dom.arenaTimer.textContent = `${state.battle.roundTimer}s`;
    dom.arenaQPrompt.textContent = q.text;
    dom.arenaFooterStatus.textContent = "Answer fast! Speed breaks ties.";

    // Render options
    dom.arenaOptionsGrid.innerHTML = '';
    q.options.forEach((opt, optIdx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'arena-opt-btn';
      btn.textContent = `${optIdx + 1}. ${opt}`;

      btn.addEventListener('click', () => handlePlayerBattleChoice(optIdx, q.correct, btn));
      dom.arenaOptionsGrid.appendChild(btn);
    });

    // Start Round Timer
    if (state.battle.timerInterval) clearInterval(state.battle.timerInterval);
    state.battle.timerInterval = setInterval(() => {
      state.battle.roundTimer--;
      dom.arenaTimer.textContent = `${state.battle.roundTimer}s`;

      if (state.battle.roundTimer <= 0) {
        clearInterval(state.battle.timerInterval);
        nextBattleRound();
      }
    }, 1000);

    // Simulate Rival answering after random delay (2.5s - 5.5s)
    if (state.battle.rivalTimeout) clearTimeout(state.battle.rivalTimeout);
    const delay = Math.random() * 3000 + 2500;
    state.battle.rivalTimeout = setTimeout(() => {
      // 80% chance of correct answer for Bot
      if (Math.random() < 0.80) {
        state.battle.rival.score++;
        dom.gladiatorP2Score.textContent = state.battle.rival.score;
        dom.gladiatorP2Bar.style.width = `${(state.battle.rival.score / 5) * 100}%`;
        dom.arenaFooterStatus.textContent = `⚡ ${state.battle.rival.name} answered correctly!`;
      }
    }, delay);
  }

  function handlePlayerBattleChoice(chosen, correct, btn) {
    if (state.battle.playerAnswered) return;
    state.battle.playerAnswered = true;

    if (chosen === correct) {
      btn.classList.add('correct-hit');
      state.battle.player.score++;
      dom.gladiatorP1Score.textContent = state.battle.player.score;
      dom.gladiatorP1Bar.style.width = `${(state.battle.player.score / 5) * 100}%`;
      dom.arenaFooterStatus.textContent = "🎯 Direct hit! Correct answer!";
    } else {
      btn.classList.add('wrong-hit');
      dom.arenaFooterStatus.textContent = "❌ Missed! Incorrect choice.";
    }

    setTimeout(() => {
      nextBattleRound();
    }, 1200);
  }

  function nextBattleRound() {
    if (state.battle.timerInterval) clearInterval(state.battle.timerInterval);
    if (state.battle.rivalTimeout) clearTimeout(state.battle.rivalTimeout);

    if (state.battle.currentRound + 1 < 5) {
      loadBattleRound(state.battle.currentRound + 1);
    } else {
      endBattleMatch();
    }
  }

  function endBattleMatch() {
    if (state.battle.timerInterval) clearInterval(state.battle.timerInterval);
    if (state.battle.rivalTimeout) clearTimeout(state.battle.rivalTimeout);

    dom.battleArenaCard.style.display = 'none';
    dom.battleVictoryCard.style.display = 'block';

    const pScore = state.battle.player.score;
    const rScore = state.battle.rival.score;

    dom.finalP1Name.textContent = "You";
    dom.finalP1Score.textContent = pScore;
    dom.finalP2Name.textContent = state.battle.rival.name;
    dom.finalP2Score.textContent = rScore;

    if (pScore > rScore) {
      dom.battleOutcomeIcon.textContent = "🏆";
      dom.battleOutcomeHeadline.textContent = "VICTORY!";
      dom.battleOutcomeSub.textContent = `You triumphed ${pScore} - ${rScore} over ${state.battle.rival.name}!`;
      triggerConfetti();
    } else if (pScore === rScore) {
      dom.battleOutcomeIcon.textContent = "🤝";
      dom.battleOutcomeHeadline.textContent = "DRAW CLASH!";
      dom.battleOutcomeSub.textContent = `A thrilling tie of ${pScore} - ${rScore}! Both combatants held their ground.`;
    } else {
      dom.battleOutcomeIcon.textContent = "💀";
      dom.battleOutcomeHeadline.textContent = "DEFEAT";
      dom.battleOutcomeSub.textContent = `${state.battle.rival.name} edged ahead ${rScore} - ${pScore}. Train hard for a rematch!`;
    }
  }

  // ================= Instructor Dashboard =================
  function renderAdminDashboard() {
    const attempts = state.resultsHistory.length;
    dom.kpiAttempts.textContent = attempts;
    dom.kpiQuestionsCount.textContent = state.questions.length;

    if (attempts === 0) {
      dom.kpiAvg.textContent = "0.0%";
      dom.kpiPassRate.textContent = "0.0%";
      dom.kpiPassRatio.textContent = "0/0";
      dom.kpiHighest.textContent = "N/A";
      dom.kpiTopper.textContent = "No data yet";
      renderHistoryTable([]);
      renderScoreChart([]);
      renderAdminQuestionsList();
      return;
    }

    let sum = 0;
    let passedCount = 0;
    let highestPercent = -1;
    let topperName = "";

    state.resultsHistory.forEach(r => {
      sum += r.percent;
      if (r.percent >= state.settings.passMark) passedCount++;
      if (r.percent > highestPercent) {
        highestPercent = r.percent;
        topperName = r.name;
      }
    });

    const avg = (sum / attempts).toFixed(1);
    const passRate = ((passedCount / attempts) * 100).toFixed(1);

    dom.kpiAvg.textContent = `${avg}%`;
    dom.kpiPassRate.textContent = `${passRate}%`;
    dom.kpiPassRatio.textContent = `${passedCount}/${attempts}`;
    dom.kpiHighest.textContent = `${highestPercent}%`;
    dom.kpiTopper.textContent = topperName;

    renderHistoryTable(state.resultsHistory);
    renderScoreChart(state.resultsHistory);
    renderAdminQuestionsList();
  }

  function renderHistoryTable(list) {
    dom.historyTbody.innerHTML = '';
    if (list.length === 0) {
      dom.historyTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--text-dim);">No examination records recorded yet.</td></tr>`;
      return;
    }

    list.slice().reverse().forEach(r => {
      const tr = document.createElement('tr');
      const outcomeBadge = r.percent >= state.settings.passMark
        ? `<span class="badge-outcome pass">PASS</span>`
        : `<span class="badge-outcome fail">FAIL</span>`;

      tr.innerHTML = `
        <td><code class="code-font">${r.candidateId}</code></td>
        <td><strong>${r.name}</strong></td>
        <td>${r.score}/${r.total}</td>
        <td><strong>${r.percent}%</strong></td>
        <td>${r.timeTaken || 0}s</td>
        <td>${r.autoSubmitted ? '<span style="color:var(--amber)">Auto (Timer)</span>' : 'Manual'}</td>
        <td>${r.timestamp}</td>
        <td>${outcomeBadge}</td>
      `;
      dom.historyTbody.appendChild(tr);
    });
  }

  function filterHistoryTable(keyword) {
    const q = keyword.toLowerCase().trim();
    if (!q) {
      renderHistoryTable(state.resultsHistory);
      return;
    }
    const filtered = state.resultsHistory.filter(r =>
      r.candidateId.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    );
    renderHistoryTable(filtered);
  }

  function renderAdminQuestionsList() {
    dom.adminQuestionsList.innerHTML = '';
    state.questions.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'q-manage-card';

      card.innerHTML = `
        <div class="q-manage-info">
          <span class="q-manage-num">QUESTION #${idx + 1}</span>
          <div class="q-manage-prompt">${q.text}</div>
          <div class="q-manage-correct">✓ Correct: ${q.options[q.correct]}</div>
        </div>
        <div class="q-manage-actions">
          <button class="btn-icon-del" title="Delete question" data-idx="${idx}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `;

      card.querySelector('.btn-icon-del').addEventListener('click', () => deleteQuestion(idx));
      dom.adminQuestionsList.appendChild(card);
    });
  }

  async function handleAddQuestion(e) {
    e.preventDefault();
    const text = document.getElementById('new-q-text').value.trim();
    const opt1 = document.getElementById('new-opt-1').value.trim();
    const opt2 = document.getElementById('new-opt-2').value.trim();
    const opt3 = document.getElementById('new-opt-3').value.trim();
    const opt4 = document.getElementById('new-opt-4').value.trim();
    const correct = parseInt(document.getElementById('new-correct-idx').value, 10);

    if (!text || !opt1 || !opt2 || !opt3 || !opt4) {
      showToast("All fields are required.", "error");
      return;
    }

    const newQ = {
      id: state.questions.length + 1,
      text: text,
      options: [opt1, opt2, opt3, opt4],
      correct: correct
    };

    state.questions.push(newQ);
    saveLocal('qm_questions', state.questions);

    if (state.connected) {
      try {
        await fetch('/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newQ)
        });
      } catch (err) {}
    }

    dom.modalAddQ.classList.remove('active');
    dom.formAddQ.reset();
    renderAdminQuestionsList();
    dom.kpiQuestionsCount.textContent = state.questions.length;
    showToast("New question added to repository!", "success");
  }

  function deleteQuestion(idx) {
    if (state.questions.length <= 1) {
      showToast("At least 1 question must remain in the bank.", "error");
      return;
    }
    if (!confirm(`Delete question #${idx + 1}?`)) return;

    state.questions.splice(idx, 1);
    saveLocal('qm_questions', state.questions);
    renderAdminQuestionsList();
    dom.kpiQuestionsCount.textContent = state.questions.length;
    showToast("Question removed.", "info");
  }

  async function handleSaveConfig(e) {
    e.preventDefault();
    const dur = parseInt(dom.cfgDuration.value, 10);
    const pass = parseInt(dom.cfgPassmark.value, 10);
    const code = dom.cfgCode.value.trim().toUpperCase();

    if (isNaN(dur) || dur < 10) {
      showToast("Duration must be at least 10 seconds.", "error");
      return;
    }
    if (!code) {
      showToast("Access Code cannot be empty.", "error");
      return;
    }

    state.settings.duration = dur;
    state.settings.passMark = pass;
    state.settings.accessCode = code;

    dom.labelExamDuration.textContent = `${dur}s Live Countdown`;
    if (dom.hintCodeDisplay) dom.hintCodeDisplay.textContent = code;

    saveLocal('qm_settings', state.settings);

    if (state.connected) {
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state.settings)
        });
      } catch (err) {}
    }

    showToast(`Exam parameters and Passcode "${code}" saved!`, "success");
  }

  // ================= Canvas Score Chart =================
  function renderScoreChart(list) {
    const canvas = document.getElementById('score-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const brackets = [
      { label: "0-39% (Fail)", count: 0, color: "#ef4444" },
      { label: "40-59% (Pass)", count: 0, color: "#f59e0b" },
      { label: "60-79% (Good)", count: 0, color: "#6366f1" },
      { label: "80-100% (Dist.)", count: 0, color: "#10b981" }
    ];

    if (list && list.length > 0) {
      list.forEach(r => {
        if (r.percent < 40) brackets[0].count++;
        else if (r.percent < 60) brackets[1].count++;
        else if (r.percent < 80) brackets[2].count++;
        else brackets[3].count++;
      });
    }

    const maxCount = Math.max(1, ...brackets.map(b => b.count));
    const padding = 40;
    const chartHeight = height - padding * 2;
    const barWidth = 70;
    const gap = (width - padding * 2 - barWidth * brackets.length) / (brackets.length - 1);

    ctx.strokeStyle = state.theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    brackets.forEach((b, idx) => {
      const x = padding + idx * (barWidth + gap);
      const barH = (b.count / maxCount) * chartHeight;
      const y = padding + chartHeight - barH;

      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, b.color);
      grad.addColorStop(1, b.color + '44');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, [6, 6, 0, 0]);
      ctx.fill();

      ctx.fillStyle = state.theme === 'dark' ? '#f8fafc' : '#0f172a';
      ctx.font = "bold 13px JetBrains Mono";
      ctx.textAlign = "center";
      ctx.fillText(b.count, x + barWidth / 2, y - 8);

      ctx.fillStyle = state.theme === 'dark' ? '#94a3b8' : '#475569';
      ctx.font = "500 11px Plus Jakarta Sans";
      ctx.fillText(b.label, x + barWidth / 2, height - 12);
    });
  }

  // ================= Floating Particle Canvas Background =================
  function setupCanvasAnimation() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = 35;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        r: Math.random() * 2.5 + 1,
        alpha: Math.random() * 0.4 + 0.1
      });
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.fillStyle = state.theme === 'dark'
          ? `rgba(99, 102, 241, ${p.alpha})`
          : `rgba(99, 102, 241, ${p.alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(animate);
    }
    animate();
  }

  // ================= Confetti Particle Burst =================
  function triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const confettiPieces = [];
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

    for (let i = 0; i < 90; i++) {
      confettiPieces.push({
        x: canvas.width / 2,
        y: canvas.height / 3,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.7) * 14,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 10
      });
    }

    let frames = 0;
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frames++;

      confettiPieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25;
        p.rotation += p.vr;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (frames < 120) {
        requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    render();
  }

  // ================= Toast Notifications =================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = "ℹ️";
    if (type === 'success') icon = "✓";
    else if (type === 'error') icon = "⚠️";

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  // Kickstart Application
  window.addEventListener('DOMContentLoaded', init);

})();
