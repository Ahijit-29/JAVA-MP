import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

/* ---------- Main application ---------- */
public class QuizSystem {
    static BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
    static QuestionBank bank = new QuestionBank();
    static CandidateRegistry registry = new CandidateRegistry();
    static int duration = 120;

    static String ask(String prompt) throws IOException {
        System.out.print(prompt); String s = in.readLine(); return s == null ? "" : s.trim();
    }

    public static void main(String[] args) throws IOException {
        while (true) {
            System.out.println("\n===== ONLINE QUIZ MANAGEMENT SYSTEM =====");
            System.out.println("1. Add question        2. List questions");
            System.out.println("3. Register candidate  4. Take quiz");
            System.out.println("5. Candidate scorecard 6. Exam history");
            System.out.println("7. Instructor report   8. Set quiz duration (current " + duration + "s)");
            System.out.println("0. Exit");
            String ch = ask("Choice: ");
            switch (ch) {
                case "1": addQuestion(); break;
                case "2": for (Question q : bank.questions) System.out.println(q.id + ". " + q.text + " -> " + q.options[q.correct]); break;
                case "3": register(); break;
                case "4": takeQuiz(); break;
                case "5": scorecard(); break;
                case "6": history(); break;
                case "7": report(); break;
                case "8": try { duration = Math.max(5, Integer.parseInt(ask("Seconds: "))); } catch (NumberFormatException e) { System.out.println("Invalid."); } break;
                case "0": System.out.println("Goodbye!"); return;
                default: System.out.println("Invalid choice.");
            }
        }
    }

    static void addQuestion() throws IOException {
        String text = ask("Question: ");
        String[] opts = new String[4];
        for (int i = 0; i < 4; i++) opts[i] = ask("Option " + (i + 1) + ": ");
        try {
            int c = Integer.parseInt(ask("Correct option (1-4): "));
            if (c < 1 || c > 4 || text.isEmpty()) throw new NumberFormatException();
            bank.add(text, opts, c - 1);
            System.out.println("Question added.");
        } catch (NumberFormatException e) { System.out.println("Invalid input. Question not added."); }
    }

    static void register() throws IOException {
        String id = ask("Candidate ID: "), name = ask("Name: "), email = ask("Email: ");
        if (id.isEmpty() || name.isEmpty()) { System.out.println("ID and name required."); return; }
        boolean ok = registry.register(new Candidate(id.replace("|", ""), name.replace("|", ""), email.replace("|", "")));
        System.out.println(ok ? "Registered." : "ID already exists.");
    }

    static void takeQuiz() throws IOException {
        Candidate c = registry.map.get(ask("Candidate ID: "));
        if (c == null) { System.out.println("Candidate not found. Register first."); return; }
        if (bank.questions.isEmpty()) { System.out.println("No questions available."); return; }
        new QuizSession(c, bank.questions, duration).conduct(in);
    }

    static void scorecard() throws IOException {
        String id = ask("Candidate ID: ");
        List<Result> all = ResultStore.loadAll();
        Result latest = null;
        for (Result r : all) if (r.candidateId.equals(id)) latest = r;
        if (latest == null) System.out.println("No result found."); else latest.print();
    }

    static void history() throws IOException {
        String id = ask("Candidate ID (blank = all): ");
        System.out.printf("%-8s %-15s %-9s %-8s %-6s %s%n", "ID", "Name", "Score", "Percent", "Time", "Date");
        for (Result r : ResultStore.loadAll())
            if (id.isEmpty() || r.candidateId.equals(id))
                System.out.printf("%-8s %-15s %-9s %-8s %-6s %s%s%n", r.candidateId, r.name,
                        r.score + "/" + r.total, String.format("%.1f%%", r.percent()), r.timeTakenSec + "s",
                        r.timestamp, r.autoSubmitted ? " [auto]" : "");
    }

    static void report() {
        List<Result> all = ResultStore.loadAll();
        if (all.isEmpty()) { System.out.println("No exam data yet."); return; }
        double sum = 0, max = -1, min = 101; int pass = 0, auto = 0; String top = "", low = "";
        for (Result r : all) {
            double p = r.percent(); sum += p;
            if (p > max) { max = p; top = r.name; }
            if (p < min) { min = p; low = r.name; }
            if (p >= 40) pass++;
            if (r.autoSubmitted) auto++;
        }
        System.out.println("\n===== INSTRUCTOR PERFORMANCE REPORT =====");
        System.out.println("Total attempts   : " + all.size());
        System.out.printf("Average score    : %.1f%%%n", sum / all.size());
        System.out.printf("Highest          : %.1f%% (%s)%n", max, top);
        System.out.printf("Lowest           : %.1f%% (%s)%n", min, low);
        System.out.printf("Pass rate (>=40%%): %.1f%% (%d/%d)%n", pass * 100.0 / all.size(), pass, all.size());
        System.out.println("Auto-submitted   : " + auto);
        try (PrintWriter pw = new PrintWriter(new FileWriter("report.txt"))) {
            pw.printf("Attempts=%d, Avg=%.1f%%, High=%.1f%%, Low=%.1f%%, PassRate=%.1f%%, Auto=%d%n",
                    all.size(), sum / all.size(), max, min, pass * 100.0 / all.size(), auto);
            for (Result r : all) pw.println(r.toFileLine());
            System.out.println("Report saved to report.txt");
        } catch (IOException e) { System.out.println("Could not save report."); }
    }
}

/* ---------- Entity classes ---------- */
class Question {
    int id; String text; String[] options; int correct; // correct: 0-3
    Question(int id, String text, String[] options, int correct) {
        this.id = id; this.text = text; this.options = options; this.correct = correct;
    }
    String toFileLine() {
        return id + "|" + text + "|" + String.join("|", options) + "|" + correct;
    }
    static Question fromFileLine(String line) {
        String[] p = line.split("\\|");
        return new Question(Integer.parseInt(p[0]), p[1],
                new String[]{p[2], p[3], p[4], p[5]}, Integer.parseInt(p[6]));
    }
}

class Candidate {
    String id, name, email;
    Candidate(String id, String name, String email) { this.id = id; this.name = name; this.email = email; }
    String toFileLine() { return id + "|" + name + "|" + email; }
    static Candidate fromFileLine(String line) {
        String[] p = line.split("\\|");
        return new Candidate(p[0], p[1], p[2]);
    }
}
class Result {

    String candidateId, name, timestamp; int score, total; long timeTakenSec; boolean autoSubmitted;

    Result(String cid, String name, int score, int total, long t, boolean auto, String ts) {

        candidateId = cid; this.name = name; this.score = score; this.total = total;

        timeTakenSec = t; autoSubmitted = auto; timestamp = ts;

    }

    double percent() { return total == 0 ? 0 : score * 100.0 / total; }

    String toFileLine() {

        return candidateId + "|" + name + "|" + score + "|" + total + "|" + timeTakenSec + "|" + autoSubmitted + "|" + timestamp;

    }

    static Result fromFileLine(String line) {

        String[] p = line.split("\\\\|");

        return new Result(p[0], p[1], Integer.parseInt(p[2]), Integer.parseInt(p[3]),

                Long.parseLong(p[4]), Boolean.parseBoolean(p[5]), p[6]);

    }

    void print() {

        System.out.println("-------- SCORECARD --------");

        System.out.println("Candidate : " + name + " (" + candidateId + ")");

        System.out.println("Score     : " + score + "/" + total + String.format(" (%.1f%%)", percent()));

        System.out.println("Result    : " + (percent() >= 40 ? "PASS" : "FAIL"));

        System.out.println("Time taken: " + timeTakenSec + "s" + (autoSubmitted ? " (auto-submitted)" : ""));

        System.out.println("Date      : " + timestamp);

        System.out.println("---------------------------");

    }

}

/* ---------- File-based storage ---------- */

class FileStore {

    static List<String> read(String file) {

        try {

            Path p = Paths.get(file);

            return Files.exists(p) ? Files.readAllLines(p) : new ArrayList<>();

        } catch (IOException e) { System.out.println("Read error: " + e.getMessage()); return new ArrayList<>(); }

    }

    static void append(String file, String line) {

        try (PrintWriter pw = new PrintWriter(new FileWriter(file, true))) { pw.println(line); }

        catch (IOException e) { System.out.println("Write error: " + e.getMessage()); }

    }

}

class QuestionBank {

    static final String FILE = "questions.txt";

    List<Question> questions = new ArrayList<>();

    QuestionBank() {

        for (String l : FileStore.read(FILE)) if (!l.isBlank()) questions.add(Question.fromFileLine(l));

        if (questions.isEmpty()) seed();

    }

    private void seed() {

        add("What will System.out.println(s1 == s2) print if String s1 = \"Java\"; String s2 = new String(\"Java\").intern();?", new String[]{"false", "true", "Compile-time error", "NullPointerException"}, 1);

        add("In Java multithreading, what is the primary guarantee of the volatile keyword?", new String[]{"Guarantees atomic execution of compound operations like count++", "Prevents instruction reordering and ensures thread visibility from main memory", "Acquires an intrinsic monitor lock on the object", "Prevents the variable from being serialized"}, 1);

        add("If both a try block and its finally block contain return statements, which value is returned?", new String[]{"The value from the try block", "The value from the finally block", "Compilation error: unreachable code", "Both values concatenated"}, 1);

        add("What happens when two distinct keys produce the exact same hashCode() in a Java 8+ HashMap?", new String[]{"HashMap throws a HashCollisionException", "The second key overwrites the first key immediately", "Stored in the same bucket as a linked list, transforming into a red-black tree when chain exceeds 8", "A new HashMap with double capacity is automatically allocated"}, 2);

        add("Which statement regarding Java Generics Type Erasure is true?", new String[]{"Generic type information is fully preserved in bytecode for runtime reflection", "Type parameters are replaced with their bounds or Object, and explicit casts are inserted", "Primitive types like int can be directly used as generic type arguments", "Generic classes generate separate bytecode classes for each type parameter"}, 1);

        add("Given Super { int x = 10; } and Sub extends Super { int x = 20; }, what does Super obj = new Sub(); System.out.println(obj.x); print?", new String[]{"20", "10", "Compilation error", "Runtime ClassCastException"}, 1);

        add("Which interface must a resource class implement to be managed automatically in a try-with-resources statement?", new String[]{"java.io.Serializable", "java.lang.AutoCloseable", "java.lang.Cloneable", "java.lang.Runnable"}, 1);

        add("In Java multithreading, what condition causes a Deadlock?", new String[]{"A thread runs an infinite loop consuming 100% CPU", "Two or more threads are waiting indefinitely for locks held by each other in a cyclic dependency", "A thread attempts to access an uninitialized object reference", "The JVM runs out of heap memory during thread allocation"}, 1);

        add("What is the result of executing: List<Integer> list = Arrays.asList(1, 2, 3); list.add(4);?", new String[]{"[1, 2, 3, 4]", "UnsupportedOperationException at runtime", "Compilation Error: add() method not found", "IndexOutOfBoundsException at runtime"}, 1);

        add("Which memory region in the JVM stores local primitive variables and method call stack frames?", new String[]{"Heap Memory", "Metaspace", "Java Thread Stack", "Code Cache"}, 2);

        add("What is the core distinction between fail-fast and fail-safe iterators in Java Collections?", new String[]{"Fail-fast throws ConcurrentModificationException on modification; fail-safe operates on a cloned snapshot", "Fail-fast iterators are synchronized; fail-safe iterators are unsynchronized", "Fail-fast iterators only operate on Sets; fail-safe iterators operate on Lists", "Fail-fast iterators continue running silently on concurrent changes"}, 0);

        add("What is the output of Math.min(Double.MIN_VALUE, 0.0d)?", new String[]{"0.0", "Double.MIN_VALUE", "Double.NaN", "-Infinity"}, 0);

        add("Which garbage collection algorithm became the default collector starting in Java 9 for server-class hardware?", new String[]{"Serial GC", "Parallel GC", "Garbage-First (G1) GC", "Z Garbage Collector (ZGC)"}, 2);

        add("Can an abstract class in Java have a constructor, and if so, how is it invoked?", new String[]{"No, abstract classes cannot declare constructors because they cannot be instantiated", "Yes, it is invoked via super() when a concrete subclass instance is instantiated", "Yes, but it can only be invoked statically using reflection", "No, only concrete classes and interfaces can declare constructors"}, 1);

        add("In Java Functional Programming, what is the functional descriptor / signature of a Predicate<T>?", new String[]{"T -> void", "T -> boolean", "() -> T", "(T, T) -> T"}, 1);

    }

    void add(String text, String[] opts, int correct) {

        int id = questions.isEmpty() ? 1 : questions.get(questions.size() - 1).id + 1;

        Question q = new Question(id, text.replace("|", "/"), Arrays.stream(opts).map(o -> o.replace("|", "/")).toArray(String[]::new), correct);

        questions.add(q);

        FileStore.append(FILE, q.toFileLine());

    }

}
class CandidateRegistry {
    static final String FILE = "candidates.txt";
    Map<String, Candidate> map = new LinkedHashMap<>();
    CandidateRegistry() {
        for (String l : FileStore.read(FILE)) if (!l.isBlank()) { Candidate c = Candidate.fromFileLine(l); map.put(c.id, c); }
    }
    boolean register(Candidate c) {
        if (map.containsKey(c.id)) return false;
        map.put(c.id, c); FileStore.append(FILE, c.toFileLine()); return true;
    }
}

class ResultStore {
    static final String FILE = "results.txt";
    static void save(Result r) { FileStore.append(FILE, r.toFileLine()); }
    static List<Result> loadAll() {
        List<Result> list = new ArrayList<>();
        for (String l : FileStore.read(FILE)) if (!l.isBlank()) list.add(Result.fromFileLine(l));
        return list;
    }
}

/* ---------- Quiz session with timer thread ---------- */
class TimerThread extends Thread {
    private final QuizSession session; private final int seconds;
    TimerThread(QuizSession s, int seconds) { this.session = s; this.seconds = seconds; setDaemon(true); }
    @Override public void run() {
        try {
            for (int left = seconds; left > 0; left--) {
                if (left == 10 || left == 30) System.out.println("\n[Timer] " + left + " seconds remaining!");
                Thread.sleep(1000);
            }
            if (session.submit(true) != null) System.out.println("\n[Timer] Time is up! Press Enter to continue.");
        } catch (InterruptedException e) { /* quiz finished early */ }
    }
}

class QuizSession {
    private final Candidate candidate; private final List<Question> questions; private final int[] answers;
    private final AtomicBoolean submitted = new AtomicBoolean(false);
    private final int durationSec; private final long startMillis;

    QuizSession(Candidate c, List<Question> qs, int durationSec) {
        candidate = c; questions = new ArrayList<>(qs); Collections.shuffle(questions);
        answers = new int[qs.size()]; Arrays.fill(answers, -1);
        this.durationSec = durationSec; startMillis = System.currentTimeMillis();
    }

    /** Evaluates, stores and prints result. Only the first call (student or timer) succeeds. */
    Result submit(boolean auto) {
        if (submitted.getAndSet(true)) return null;
        int score = 0;
        for (int i = 0; i < questions.size(); i++) if (answers[i] == questions.get(i).correct) score++;
        long taken = Math.min(durationSec, (System.currentTimeMillis() - startMillis) / 1000);
        String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        Result r = new Result(candidate.id, candidate.name, score, questions.size(), taken, auto, ts);
        ResultStore.save(r);
        System.out.println();
        r.print();
        return r;
    }

    boolean isSubmitted() { return submitted.get(); }

    void conduct(BufferedReader in) throws IOException {
        TimerThread timer = new TimerThread(this, durationSec);
        System.out.println("\nQuiz started for " + candidate.name + ". Duration: " + durationSec + "s. Enter 1-4 (Enter = skip).");
        timer.start();
        for (int i = 0; i < questions.size() && !isSubmitted(); i++) {
            Question q = questions.get(i);
            System.out.println("\nQ" + (i + 1) + ". " + q.text);
            for (int j = 0; j < 4; j++) System.out.println("   " + (j + 1) + ") " + q.options[j]);
            System.out.print("Your answer: ");
            String line = in.readLine();
            if (line == null) break;
            if (isSubmitted()) break;               // time expired while waiting for input
            try {
                int a = Integer.parseInt(line.trim());
                if (a >= 1 && a <= 4) answers[i] = a - 1; else System.out.println("Invalid option, skipped.");
            } catch (NumberFormatException e) { /* skipped */ }
        }
        submit(false);
        timer.interrupt();
    }
}
