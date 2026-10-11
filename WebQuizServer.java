import com.sun.net.httpserver.*;
import java.awt.Desktop;
import java.io.*;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

/**
 * WebQuizServer - Full-Stack Java HTTP Server & REST API for QuizMaster Pro.
 * Provides an embedded multi-threaded HTTP server that serves the interactive
 * web application and handles candidate registration, live quiz submissions,
 * file-based persistence, and instructor reports.
 */
public class WebQuizServer {
    private static final int DEFAULT_PORT = 8080;
    private static int port = DEFAULT_PORT;
    private static int quizDuration = 120;
    private static int passMark = 40;
    private static String accessCode = "JAVA2026";

    // File stores
    private static final String QUESTIONS_FILE = "questions.txt";
    private static final String CANDIDATES_FILE = "candidates.txt";
    private static final String RESULTS_FILE = "results.txt";
    private static final String REPORT_FILE = "report.txt";

    // In-memory data models
    private static final List<QuestionItem> questionBank = Collections.synchronizedList(new ArrayList<>());
    private static final Map<String, CandidateItem> candidateMap = new ConcurrentHashMap<>();
    private static final List<ResultItem> resultsList = Collections.synchronizedList(new ArrayList<>());

    public static void main(String[] args) {
        System.out.println("==========================================================");
        System.out.println("   QUIZMASTER PRO - JAVA FULL-STACK EXAMINATION SUITE    ");
        System.out.println("==========================================================");
        System.out.println("[Init] Loading persistent records from file storage...");

        loadAllData();

        HttpServer server = null;
        try {
            server = HttpServer.create(new InetSocketAddress(port), 0);
        } catch (IOException e) {
            // Fallback port if 8080 is already occupied
            try {
                port = 8081;
                server = HttpServer.create(new InetSocketAddress(port), 0);
            } catch (IOException ex) {
                System.err.println("[Error] Failed to start server: " + ex.getMessage());
                return;
            }
        }

        // Multi-threaded executor pool for handling concurrent candidate requests
        server.setExecutor(Executors.newFixedThreadPool(12));

        // REST API Contexts
        server.createContext("/api/questions", new QuestionsHandler());
        server.createContext("/api/questions/seed", new SeedQuestionsHandler());
        server.createContext("/api/candidates", new CandidatesHandler());
        server.createContext("/api/submit", new SubmitHandler());
        server.createContext("/api/results", new ResultsHandler());
        server.createContext("/api/settings", new SettingsHandler());

        // Static Web Asset Contexts
        server.createContext("/", new StaticFileHandler());

        server.start();

        String url = "http://localhost:" + port + "/";
        System.out.println("[Ready] Server listening at: " + url);
        System.out.println("[Ready] Candidates registered : " + candidateMap.size());
        System.out.println("[Ready] Question bank size    : " + questionBank.size());
        System.out.println("[Ready] Exam results stored   : " + resultsList.size());
        System.out.println("----------------------------------------------------------");
        System.out.println("[Info] Opening default web browser automatically...");

        // Automatically open the user's browser
        try {
            if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                Desktop.getDesktop().browse(new URI(url));
            } else {
                new ProcessBuilder("rundll32", "url.dll,FileProtocolHandler", url).start();
            }
        } catch (Exception e) {
            System.out.println("[Notice] Please open your browser and navigate to: " + url);
        }

        System.out.println("[Info] Web server is active. Press Ctrl+C in this console to terminate.");
    }

    /* ---------------- Persistence & Seed Logic ---------------- */
    private static void loadAllData() {
        // 1. Load questions
        List<String> qLines = readFileLines(QUESTIONS_FILE);
        for (String line : qLines) {
            if (line.isBlank()) continue;
            QuestionItem q = QuestionItem.fromFileLine(line);
            if (q != null) questionBank.add(q);
        }
        if (questionBank.isEmpty()) {
            seedQuestions();
        }

        // 2. Load candidates
        List<String> cLines = readFileLines(CANDIDATES_FILE);
        for (String line : cLines) {
            if (line.isBlank()) continue;
            CandidateItem c = CandidateItem.fromFileLine(line);
            if (c != null) candidateMap.put(c.id, c);
        }
        if (candidateMap.isEmpty()) {
            // Seed sample candidates
            CandidateItem c1 = new CandidateItem("C101", "Goutam Kumar Majhi", "goutam@example.com");
            CandidateItem c2 = new CandidateItem("C102", "Priya Sharma", "priya@example.com");
            CandidateItem c3 = new CandidateItem("C103", "Rahul Verma", "rahul@example.com");
            candidateMap.put(c1.id, c1);
            candidateMap.put(c2.id, c2);
            candidateMap.put(c3.id, c3);
            appendFileLine(CANDIDATES_FILE, c1.toFileLine());
            appendFileLine(CANDIDATES_FILE, c2.toFileLine());
            appendFileLine(CANDIDATES_FILE, c3.toFileLine());
        }

        // 3. Load results
        List<String> rLines = readFileLines(RESULTS_FILE);
        for (String line : rLines) {
            if (line.isBlank()) continue;
            ResultItem r = ResultItem.fromFileLine(line);
            if (r != null) resultsList.add(r);
        }
    }

    private static void seedQuestions() {
        addIfMissing("What will System.out.println(s1 == s2) print if String s1 = \"Java\"; String s2 = new String(\"Java\").intern();?",
                new String[]{"false", "true", "Compile-time error", "NullPointerException"}, 1);
        addIfMissing("In Java multithreading, what is the primary guarantee of the volatile keyword?",
                new String[]{"Guarantees atomic execution of compound operations like count++", "Prevents instruction reordering and ensures thread visibility from main memory", "Acquires an intrinsic monitor lock on the object", "Prevents the variable from being serialized"}, 1);
        addIfMissing("If both a try block and its finally block contain return statements, which value is returned?",
                new String[]{"The value from the try block", "The value from the finally block", "Compilation error: unreachable code", "Both values concatenated"}, 1);
        addIfMissing("What happens when two distinct keys produce the exact same hashCode() in a Java 8+ HashMap?",
                new String[]{"HashMap throws a HashCollisionException", "The second key overwrites the first key immediately", "Stored in the same bucket as a linked list, transforming into a red-black tree when chain exceeds 8", "A new HashMap with double capacity is automatically allocated"}, 2);
        addIfMissing("Which statement regarding Java Generics Type Erasure is true?",
                new String[]{"Generic type information is fully preserved in bytecode for runtime reflection", "Type parameters are replaced with their bounds or Object, and explicit casts are inserted", "Primitive types like int can be directly used as generic type arguments", "Generic classes generate separate bytecode classes for each type parameter"}, 1);
        addIfMissing("Given Super { int x = 10; } and Sub extends Super { int x = 20; }, what does Super obj = new Sub(); System.out.println(obj.x); print?",
                new String[]{"20", "10", "Compilation error", "Runtime ClassCastException"}, 1);
        addIfMissing("Which interface must a resource class implement to be managed automatically in a try-with-resources statement?",
                new String[]{"java.io.Serializable", "java.lang.AutoCloseable", "java.lang.Cloneable", "java.lang.Runnable"}, 1);
        addIfMissing("In Java multithreading, what condition causes a Deadlock?",
                new String[]{"A thread runs an infinite loop consuming 100% CPU", "Two or more threads are waiting indefinitely for locks held by each other in a cyclic dependency", "A thread attempts to access an uninitialized object reference", "The JVM runs out of heap memory during thread allocation"}, 1);
        addIfMissing("What is the result of executing: List<Integer> list = Arrays.asList(1, 2, 3); list.add(4);?",
                new String[]{"[1, 2, 3, 4]", "UnsupportedOperationException at runtime", "Compilation Error: add() method not found", "IndexOutOfBoundsException at runtime"}, 1);
        addIfMissing("Which memory region in the JVM stores local primitive variables and method call stack frames?",
                new String[]{"Heap Memory", "Metaspace", "Java Thread Stack", "Code Cache"}, 2);
        addIfMissing("What is the core distinction between fail-fast and fail-safe iterators in Java Collections?",
                new String[]{"Fail-fast throws ConcurrentModificationException on modification; fail-safe operates on a cloned snapshot", "Fail-fast iterators are synchronized; fail-safe iterators are unsynchronized", "Fail-fast iterators only operate on Sets; fail-safe iterators operate on Lists", "Fail-fast iterators continue running silently on concurrent changes"}, 0);
        addIfMissing("What is the output of Math.min(Double.MIN_VALUE, 0.0d)?",
                new String[]{"0.0", "Double.MIN_VALUE", "Double.NaN", "-Infinity"}, 0);
        addIfMissing("Which garbage collection algorithm became the default collector starting in Java 9 for server-class hardware?",
                new String[]{"Serial GC", "Parallel GC", "Garbage-First (G1) GC", "Z Garbage Collector (ZGC)"}, 2);
        addIfMissing("Can an abstract class in Java have a constructor, and if so, how is it invoked?",
                new String[]{"No, abstract classes cannot declare constructors because they cannot be instantiated", "Yes, it is invoked via super() when a concrete subclass instance is instantiated", "Yes, but it can only be invoked statically using reflection", "No, only concrete classes and interfaces can declare constructors"}, 1);
        addIfMissing("In Java Functional Programming, what is the functional descriptor / signature of a Predicate<T>?",
                new String[]{"T -> void", "T -> boolean", "() -> T", "(T, T) -> T"}, 1);
    }

    private static void addIfMissing(String text, String[] opts, int correct) {
        String cleanText = text.replace("|", "/");
        for (QuestionItem q : questionBank) {
            if (q.text.equalsIgnoreCase(cleanText)) return;
        }
        addQuestion(text, opts, correct);
    }

    private static void addQuestion(String text, String[] opts, int correct) {
        int id = questionBank.isEmpty() ? 1 : questionBank.get(questionBank.size() - 1).id + 1;
        QuestionItem q = new QuestionItem(id, text.replace("|", "/"), opts, correct);
        questionBank.add(q);
        appendFileLine(QUESTIONS_FILE, q.toFileLine());
    }

    private static synchronized List<String> readFileLines(String filename) {
        try {
            Path p = Paths.get(filename);
            return Files.exists(p) ? Files.readAllLines(p, StandardCharsets.UTF_8) : new ArrayList<>();
        } catch (IOException e) {
            return new ArrayList<>();
        }
    }

    private static synchronized void appendFileLine(String filename, String line) {
        try (PrintWriter pw = new PrintWriter(new OutputStreamWriter(new FileOutputStream(filename, true), StandardCharsets.UTF_8))) {
            pw.println(line);
        } catch (IOException e) {
            System.err.println("[FileStore Error] " + e.getMessage());
        }
    }

    private static synchronized void rewriteCandidatesFile() {
        try (PrintWriter pw = new PrintWriter(new OutputStreamWriter(new FileOutputStream(CANDIDATES_FILE, false), StandardCharsets.UTF_8))) {
            for (CandidateItem c : candidateMap.values()) {
                pw.println(c.toFileLine());
            }
        } catch (IOException e) {
            System.err.println("[FileStore Error] " + e.getMessage());
        }
    }

    /* ---------------- Static Web Asset Handler ---------------- */
    static class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            String path = ex.getRequestURI().getPath();
            if (path == null || path.equals("/") || path.isBlank()) {
                path = "/index.html";
            }

            File file = new File("web" + path);
            if (!file.exists() || file.isDirectory()) {
                // Try relative to workspace
                file = new File("web/index.html");
            }

            if (!file.exists()) {
                sendResponse(ex, 404, "text/plain", "File not found: " + path);
                return;
            }

            String mimeType = "text/html; charset=UTF-8";
            if (path.endsWith(".css")) mimeType = "text/css; charset=UTF-8";
            else if (path.endsWith(".js")) mimeType = "application/javascript; charset=UTF-8";
            else if (path.endsWith(".svg")) mimeType = "image/svg+xml";
            else if (path.endsWith(".png")) mimeType = "image/png";

            byte[] bytes = Files.readAllBytes(file.toPath());
            ex.getResponseHeaders().set("Content-Type", mimeType);
            ex.getResponseHeaders().set("Cache-Control", "no-cache, no-store, must-revalidate");
            ex.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = ex.getResponseBody()) {
                os.write(bytes);
            }
        }
    }

    /* ---------------- API: /api/questions ---------------- */
    static class QuestionsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            addCorsHeaders(ex);
            String method = ex.getRequestMethod();

            if ("OPTIONS".equalsIgnoreCase(method)) {
                ex.sendResponseHeaders(204, -1);
                return;
            }

            if ("GET".equalsIgnoreCase(method)) {
                StringBuilder json = new StringBuilder("[");
                for (int i = 0; i < questionBank.size(); i++) {
                    QuestionItem q = questionBank.get(i);
                    json.append(q.toJson());
                    if (i < questionBank.size() - 1) json.append(",");
                }
                json.append("]");
                sendResponse(ex, 200, "application/json", json.toString());
                logRequest("GET", "/api/questions", 200);
            } else if ("POST".equalsIgnoreCase(method)) {
                String body = readRequestBody(ex);
                String text = extractJsonField(body, "text");
                String[] opts = extractJsonArray(body, "options");
                int correct = extractJsonInt(body, "correct", 0);

                if (text != null && !text.isBlank() && opts != null && opts.length == 4) {
                    addQuestion(text, opts, correct);
                    sendResponse(ex, 201, "application/json", "{\"status\":\"created\",\"count\":" + questionBank.size() + "}");
                    logRequest("POST", "/api/questions (Added new question)", 201);
                } else {
                    sendResponse(ex, 400, "application/json", "{\"error\":\"Invalid question payload\"}");
                }
            } else {
                sendResponse(ex, 405, "application/json", "{\"error\":\"Method not allowed\"}");
            }
        }
    }

    /* ---------------- API: /api/questions/seed ---------------- */
    static class SeedQuestionsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            addCorsHeaders(ex);
            seedQuestions();
            sendResponse(ex, 200, "application/json", "{\"status\":\"reseeded\",\"count\":" + questionBank.size() + "}");
            logRequest("POST", "/api/questions/seed", 200);
        }
    }

    /* ---------------- API: /api/candidates ---------------- */
    static class CandidatesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            addCorsHeaders(ex);
            String method = ex.getRequestMethod();

            if ("OPTIONS".equalsIgnoreCase(method)) {
                ex.sendResponseHeaders(204, -1);
                return;
            }

            if ("GET".equalsIgnoreCase(method)) {
                String query = ex.getRequestURI().getQuery();
                if (query != null && query.contains("id=")) {
                    String id = query.split("id=")[1].split("&")[0];
                    CandidateItem c = candidateMap.get(id);
                    if (c != null) {
                        sendResponse(ex, 200, "application/json", c.toJson());
                    } else {
                        sendResponse(ex, 404, "application/json", "{\"error\":\"Candidate not found\"}");
                    }
                    return;
                }

                StringBuilder json = new StringBuilder("[");
                List<CandidateItem> list = new ArrayList<>(candidateMap.values());
                for (int i = 0; i < list.size(); i++) {
                    json.append(list.get(i).toJson());
                    if (i < list.size() - 1) json.append(",");
                }
                json.append("]");
                sendResponse(ex, 200, "application/json", json.toString());
                logRequest("GET", "/api/candidates", 200);
            } else if ("POST".equalsIgnoreCase(method)) {
                String body = readRequestBody(ex);
                String id = extractJsonField(body, "id");
                String name = extractJsonField(body, "name");
                String email = extractJsonField(body, "email");

                if (id != null && !id.isBlank() && name != null && !name.isBlank()) {
                    id = id.trim().replace("|", "");
                    name = name.trim().replace("|", "");
                    email = (email == null ? "" : email.trim().replace("|", ""));

                    boolean isNew = !candidateMap.containsKey(id);
                    CandidateItem c = new CandidateItem(id, name, email);
                    candidateMap.put(id, c);
                    rewriteCandidatesFile();
                    sendResponse(ex, isNew ? 201 : 200, "application/json", c.toJson());
                    logRequest("POST", "/api/candidates (" + (isNew ? "Registered: " : "Refreshed: ") + name + " [" + id + "])", isNew ? 201 : 200);
                } else {
                    sendResponse(ex, 400, "application/json", "{\"error\":\"Missing required candidate fields\"}");
                }
            } else {
                sendResponse(ex, 405, "application/json", "{\"error\":\"Method not allowed\"}");
            }
        }
    }

    /* ---------------- API: /api/submit (Live Evaluation & Storage) ---------------- */
    static class SubmitHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            addCorsHeaders(ex);
            if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) {
                sendResponse(ex, 405, "application/json", "{\"error\":\"POST required\"}");
                return;
            }

            String body = readRequestBody(ex);
            String cid = extractJsonField(body, "candidateId");
            String name = extractJsonField(body, "name");
            int score = extractJsonInt(body, "score", 0);
            int total = extractJsonInt(body, "total", questionBank.size());
            long timeTaken = extractJsonInt(body, "timeTakenSec", 0);
            boolean autoSubmitted = body.contains("\"autoSubmitted\":true");

            String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            ResultItem r = new ResultItem(cid, name, score, total, timeTaken, autoSubmitted, ts);
            resultsList.add(r);
            appendFileLine(RESULTS_FILE, r.toFileLine());

            // Write / update instructor summary report.txt
            updateInstructorReportFile();

            sendResponse(ex, 200, "application/json", r.toJson());
            logRequest("POST", "/api/submit (Score: " + score + "/" + total + " for " + name + ")", 200);
        }
    }

    private static synchronized void updateInstructorReportFile() {
        if (resultsList.isEmpty()) return;
        double sum = 0, max = -1, min = 101;
        int pass = 0, auto = 0;
        String top = "", low = "";
        for (ResultItem r : resultsList) {
            double p = r.percent();
            sum += p;
            if (p > max) { max = p; top = r.name; }
            if (p < min) { min = p; low = r.name; }
            if (p >= passMark) pass++;
            if (r.autoSubmitted) auto++;
        }
        int total = resultsList.size();
        try (PrintWriter pw = new PrintWriter(new FileWriter(REPORT_FILE, false))) {
            pw.printf("Attempts=%d, Avg=%.1f%%, High=%.1f%% (%s), Low=%.1f%% (%s), PassRate=%.1f%%, AutoSubmitted=%d%n",
                    total, sum / total, max, top, min, low, pass * 100.0 / total, auto);
            for (ResultItem r : resultsList) {
                pw.println(r.toFileLine());
            }
        } catch (IOException e) {
            System.err.println("[Report Error] " + e.getMessage());
        }
    }

    /* ---------------- API: /api/results (Sorted Leaderboard) ---------------- */
    static class ResultsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            addCorsHeaders(ex);
            List<ResultItem> sorted = new ArrayList<>(resultsList);
            sorted.sort((a, b) -> {
                int cmp = Integer.compare(b.score, a.score);
                if (cmp != 0) return cmp;
                return Long.compare(a.timeTakenSec, b.timeTakenSec);
            });

            StringBuilder json = new StringBuilder("[");
            for (int i = 0; i < sorted.size(); i++) {
                json.append(sorted.get(i).toJson());
                if (i < sorted.size() - 1) json.append(",");
            }
            json.append("]");
            sendResponse(ex, 200, "application/json", json.toString());
            logRequest("GET", "/api/results (Leaderboard)", 200);
        }
    }

    /* ---------------- API: /api/settings ---------------- */
    static class SettingsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            addCorsHeaders(ex);
            String method = ex.getRequestMethod();
            if ("POST".equalsIgnoreCase(method)) {
                String body = readRequestBody(ex);
                int dur = extractJsonInt(body, "duration", quizDuration);
                int pass = extractJsonInt(body, "passMark", passMark);
                String code = extractJsonField(body, "accessCode");
                if (dur >= 5) quizDuration = dur;
                if (pass >= 10 && pass <= 100) passMark = pass;
                if (code != null && !code.isBlank()) accessCode = code.trim().toUpperCase();
                logRequest("POST", "/api/settings (Duration: " + quizDuration + "s, PassMark: " + passMark + "%, Code: " + accessCode + ")", 200);
            }
            String json = String.format("{\"duration\":%d,\"passMark\":%d,\"accessCode\":\"%s\",\"server\":\"QuizMasterPro/2.0\"}",
                    quizDuration, passMark, escape(accessCode));
            sendResponse(ex, 200, "application/json", json);
        }
    }

    /* ---------------- Utility Helpers ---------------- */
    private static void logRequest(String method, String endpoint, int status) {
        String time = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"));
        System.out.printf("[%s] [Worker-%d] %-4s %-45s -> %d%n",
                time, Thread.currentThread().threadId(), method, endpoint, status);
    }

    private static void addCorsHeaders(HttpExchange ex) {
        ex.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        ex.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
        ex.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
    }

    private static void sendResponse(HttpExchange ex, int code, String contentType, String response) throws IOException {
        byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", contentType);
        ex.sendResponseHeaders(code, bytes.length);
        try (OutputStream os = ex.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static String readRequestBody(HttpExchange ex) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(ex.getRequestBody(), StandardCharsets.UTF_8))) {
            return reader.lines().collect(Collectors.joining("\n"));
        }
    }

    private static String extractJsonField(String json, String key) {
        int idx = json.indexOf("\"" + key + "\"");
        if (idx == -1) return null;
        int colon = json.indexOf(":", idx);
        if (colon == -1) return null;
        int quoteStart = json.indexOf("\"", colon);
        if (quoteStart == -1) return null;
        int quoteEnd = json.indexOf("\"", quoteStart + 1);
        if (quoteEnd == -1) return null;
        return json.substring(quoteStart + 1, quoteEnd);
    }

    private static int extractJsonInt(String json, String key, int def) {
        int idx = json.indexOf("\"" + key + "\"");
        if (idx == -1) return def;
        int colon = json.indexOf(":", idx);
        if (colon == -1) return def;
        int end = colon + 1;
        while (end < json.length() && (Character.isDigit(json.charAt(end)) || json.charAt(end) == ' ')) {
            end++;
        }
        try {
            return Integer.parseInt(json.substring(colon + 1, end).trim());
        } catch (NumberFormatException e) {
            return def;
        }
    }

    private static String[] extractJsonArray(String json, String key) {
        int idx = json.indexOf("\"" + key + "\"");
        if (idx == -1) return null;
        int openBracket = json.indexOf("[", idx);
        int closeBracket = json.indexOf("]", openBracket);
        if (openBracket == -1 || closeBracket == -1) return null;
        String content = json.substring(openBracket + 1, closeBracket);
        String[] parts = content.split(",");
        String[] res = new String[parts.length];
        for (int i = 0; i < parts.length; i++) {
            res[i] = parts[i].trim().replaceAll("^\"|\"$", "").replace("\\\"", "\"");
        }
        return res;
    }

    /* ---------------- Entity Models ---------------- */
    static class QuestionItem {
        int id; String text; String[] options; int correct;
        QuestionItem(int id, String text, String[] options, int correct) {
            this.id = id; this.text = text; this.options = options; this.correct = correct;
        }
        String toFileLine() {
            return id + "|" + text + "|" + String.join("|", options) + "|" + correct;
        }
        String toJson() {
            return String.format("{\"id\":%d,\"text\":\"%s\",\"options\":[\"%s\",\"%s\",\"%s\",\"%s\"],\"correct\":%d}",
                    id, escape(text), escape(options[0]), escape(options[1]), escape(options[2]), escape(options[3]), correct);
        }
        static QuestionItem fromFileLine(String line) {
            String[] p = line.split("\\|");
            if (p.length < 7) return null;
            return new QuestionItem(Integer.parseInt(p[0]), p[1], new String[]{p[2], p[3], p[4], p[5]}, Integer.parseInt(p[6]));
        }
    }

    static class CandidateItem {
        String id, name, email;
        CandidateItem(String id, String name, String email) {
            this.id = id; this.name = name; this.email = email;
        }
        String toFileLine() { return id + "|" + name + "|" + email; }
        String toJson() {
            return String.format("{\"id\":\"%s\",\"name\":\"%s\",\"email\":\"%s\"}", escape(id), escape(name), escape(email));
        }
        static CandidateItem fromFileLine(String line) {
            String[] p = line.split("\\|");
            if (p.length < 2) return null;
            return new CandidateItem(p[0], p[1], p.length > 2 ? p[2] : "");
        }
    }

    static class ResultItem {
        String candidateId, name, timestamp;
        int score, total;
        long timeTakenSec;
        boolean autoSubmitted;
        ResultItem(String cid, String name, int score, int total, long t, boolean auto, String ts) {
            this.candidateId = cid; this.name = name; this.score = score; this.total = total;
            this.timeTakenSec = t; this.autoSubmitted = auto; this.timestamp = ts;
        }
        double percent() { return total == 0 ? 0 : score * 100.0 / total; }
        String toFileLine() {
            return candidateId + "|" + name + "|" + score + "|" + total + "|" + timeTakenSec + "|" + autoSubmitted + "|" + timestamp;
        }
        String toJson() {
            return String.format("{\"candidateId\":\"%s\",\"name\":\"%s\",\"score\":%d,\"total\":%d,\"percent\":%.1f,\"timeTaken\":%d,\"autoSubmitted\":%b,\"timestamp\":\"%s\"}",
                    escape(candidateId), escape(name), score, total, percent(), timeTakenSec, autoSubmitted, escape(timestamp));
        }
        static ResultItem fromFileLine(String line) {
            String[] p = line.split("\\|");
            if (p.length < 7) return null;
            return new ResultItem(p[0], p[1], Integer.parseInt(p[2]), Integer.parseInt(p[3]),
                    Long.parseLong(p[4]), Boolean.parseBoolean(p[5]), p[6]);
        }
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }
}
