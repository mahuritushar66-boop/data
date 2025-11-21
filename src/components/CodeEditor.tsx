import { useState, useEffect, useRef, useMemo } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Loader2, CheckCircle2, XCircle, Code2, Terminal, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { db as firestoreDb } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import initSqlJs, { Database } from "sql.js";
import { executeCode, isJudge0Configured, getSupportedLanguages } from "@/services/codeExecution";
import "@/lib/monaco-config";

interface CodeEditorProps {
  language?: string;
  defaultValue?: string;
  height?: string;
  question?: string;
  questionId?: string; // Question ID for tracking completion
  expectedOutput?: string; // Expected output for validation
  hideOutput?: boolean; // Hide output section (for separate display)
  sqlTableNames?: string; // Comma-separated table names for SQL questions
  onOutputChange?: (output: { columns: string[]; values: any[][] } | null, textOutput: string | null) => void; // Callback for output changes
  onValidationChange?: (result: { passed: boolean; message?: string } | null) => void; // Callback for validation changes
}

type ParsedSqlTable = {
  originalName: string;
  tableName: string;
  columns: string[];
  values: any[][];
};

const sanitizeIdentifier = (value: string, fallback: string) => {
  if (!value) return fallback;
  const cleaned = value
    .toString()
    .trim()
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/_{2,}/g, "_");
  const noLeadingDigits = cleaned.replace(/^[^A-Za-z_]+/, "");
  return noLeadingDigits || fallback;
};

const extractSqlTablesFromQuestion = (questionText?: string, adminTableNames?: string): ParsedSqlTable[] => {
  if (!questionText) return [];
  const tables: ParsedSqlTable[] = [];
  const regex = /\{[\s\S]*?"columns"[\s\S]*?"values"[\s\S]*?\}/g;
  let match: RegExpExecArray | null;
  
  // Parse admin-provided table names (comma-separated)
  const adminTableNamesList: string[] = adminTableNames
    ? adminTableNames.split(',').map(name => name.trim().toLowerCase()).filter(name => name.length > 0)
    : [];

  // Try to extract table names mentioned in the question text (e.g., "FROM customers", "table: customers", "customers table")
  const tableNamePatterns = [
    /(?:FROM|from)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /(?:table|Table|TABLE)[:\s]+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /([a-zA-Z_][a-zA-Z0-9_]*)\s+table/gi,
    /SQL\s+table[:\s]+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /using\s+the\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+table/gi,
    /the\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+table/gi,
  ];
  const mentionedTables: string[] = [];
  tableNamePatterns.forEach(pattern => {
    // Reset regex lastIndex for global regex
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(questionText)) !== null) {
      if (m[1]) {
        const tableName = m[1].toLowerCase();
        // Skip common SQL keywords and generic words
        const skipWords = ['select', 'where', 'group', 'order', 'having', 'limit', 'join', 'inner', 'left', 'right', 'outer', 'on', 'as', 'and', 'or', 'not', 'in', 'exists', 'like', 'between'];
        if (!skipWords.includes(tableName) && !mentionedTables.includes(tableName)) {
          mentionedTables.push(tableName);
        }
      }
    }
  });

  console.log("Extracted mentioned tables from question:", mentionedTables);
  console.log("Question text sample:", questionText?.substring(0, 300));

  while ((match = regex.exec(questionText)) !== null) {
    try {
      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed.columns) || !Array.isArray(parsed.values)) continue;
      // Try to get table name from various possible fields (support both camelCase and snake_case)
      let rawName =
        (typeof parsed.tableName === "string" && parsed.tableName.trim()) ||
        (typeof parsed.table_name === "string" && parsed.table_name.trim()) ||
        (typeof parsed.name === "string" && parsed.name.trim()) ||
        (typeof parsed.table === "string" && parsed.table.trim());
      
      console.log("JSON table found, rawName from JSON:", rawName);
      console.log("Current tables.length:", tables.length);
      console.log("mentionedTables:", mentionedTables);
      
      // If no table name in JSON, try to use admin-provided names first, then mentioned tables, then fallback
      if (!rawName) {
        if (adminTableNamesList.length > 0 && tables.length < adminTableNamesList.length) {
          // Use admin-provided table names in order
          rawName = adminTableNamesList[tables.length];
          console.log("Using admin-provided table name:", rawName);
        } else if (mentionedTables.length > 0) {
          // Use the first mentioned table for the first JSON block, second for second, etc.
          rawName = mentionedTables[Math.min(tables.length, mentionedTables.length - 1)];
          console.log("Using mentioned table name:", rawName);
        } else {
          // Fallback to generic name only if no table names were mentioned
          rawName = `dataset_${tables.length + 1}`;
          console.log("No mentioned tables found, using fallback:", rawName);
        }
      }
      
      // Normalize to lowercase for consistency, but preserve original case for display
      const normalizedRawName = rawName.toLowerCase();
      
      // Use the raw name directly if it's a valid SQL identifier, otherwise sanitize
      const tableName = /^[A-Za-z_][A-Za-z0-9_]*$/.test(normalizedRawName) 
        ? normalizedRawName 
        : sanitizeIdentifier(normalizedRawName, `dataset_${tables.length + 1}`);
      const columns = parsed.columns.map((col: string, idx: number) =>
        sanitizeIdentifier(col, `column_${idx + 1}`),
      );
      const values = Array.isArray(parsed.values) ? parsed.values : [];
      tables.push({
        originalName: rawName.toLowerCase(), // Store lowercase for consistency
        tableName: tableName.toLowerCase(), // Ensure lowercase
        columns,
        values,
      });
    } catch {
      // ignore malformed JSON blocks
    }
  }

  return tables;
};

const CodeEditor = ({ language = "sql", defaultValue = "", height = "300px", question, questionId, expectedOutput, hideOutput = false, sqlTableNames, onOutputChange, onValidationChange }: CodeEditorProps) => {
  const { currentUser } = useAuth();
  const [hasAwardedXP, setHasAwardedXP] = useState(false);
  // Get comment syntax based on language
  const getCommentPrefix = (lang: string): string => {
    if (lang === "python") return "#";
    if (lang === "sql") return "--";
    // JavaScript, TypeScript, Java, C++, C#, Go, Rust all use //
    if (["javascript", "typescript", "java", "cpp", "csharp", "go", "rust"].includes(lang)) return "//";
    return "#"; // Default to Python-style
  };

  // Get starter code based on language
  const getStarterCode = (lang: string, firstTableName?: string): string => {
    switch (lang) {
      case "python":
        return "# Write your Python solution here\nprint('Hello, World!')";
      case "sql":
        // Use the first available table name, or a generic one
        const tableName = firstTableName || "customers";
        return `SELECT * FROM ${tableName} LIMIT 5;`;
      case "javascript":
        return "// Write your JavaScript solution here\nconsole.log('Hello, World!');";
      case "typescript":
        return "// Write your TypeScript solution here\nconsole.log('Hello, World!');";
      case "java":
        return "// Write your Java solution here\npublic class Solution {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, World!\");\n    }\n}";
      case "cpp":
        return "// Write your C++ solution here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << \"Hello, World!\" << endl;\n    return 0;\n}";
      case "csharp":
        return "// Write your C# solution here\nusing System;\n\nclass Solution {\n    static void Main() {\n        Console.WriteLine(\"Hello, World!\");\n    }\n}";
      case "go":
        return "// Write your Go solution here\npackage main\n\nimport \"fmt\"\n\nfunc main() {\n    fmt.Println(\"Hello, World!\")\n}";
      case "rust":
        return "// Write your Rust solution here\nfn main() {\n    println!(\"Hello, World!\");\n}";
      default:
        return "# Write your code here";
    }
  };

  // Generate initial code with question context
  const getInitialCode = useMemo(() => {
    if (defaultValue) return defaultValue;
    
    const commentPrefix = getCommentPrefix(language);
    let initialCode = "";
    
    if (question) {
      // Remove JSON blocks from question text before adding as comments
      // This prevents JSON table definitions from appearing in the editor
      let cleanedQuestion = question;
      
      // Remove JSON blocks that match table structure pattern
      cleanedQuestion = cleanedQuestion.replace(/\{[\s\S]*?"columns"[\s\S]*?"values"[\s\S]*?\}/g, '');
      
      // Remove any remaining standalone JSON-like structures
      cleanedQuestion = cleanedQuestion.replace(/\{[^{}]*\}/g, '');
      
      // Clean up extra whitespace
      cleanedQuestion = cleanedQuestion.replace(/\n{3,}/g, '\n\n').trim();
      
      // Add question text as comments (without JSON blocks)
      if (cleanedQuestion) {
        const questionLines = cleanedQuestion.split("\n")
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(line => `${commentPrefix} ${line}`)
          .join("\n");
        const solutionPrompt = language === "sql" 
          ? `${commentPrefix} Write your SQL solution below:`
          : `${commentPrefix} Write your ${language} solution below:`;
        initialCode = `${questionLines}\n\n${solutionPrompt}\n`;
      } else {
        // If question was only JSON, just add the prompt
        const solutionPrompt = language === "sql" 
          ? `${commentPrefix} Write your SQL solution below:`
          : `${commentPrefix} Write your ${language} solution below:`;
        initialCode = `${solutionPrompt}\n`;
      }
    } else {
      initialCode = `${commentPrefix} Write your ${language} code here\n`;
    }
    
    // Add starter code - for SQL, try to use the first table name from question
    let firstTableName: string | undefined;
    if (language === "sql" && question) {
      // Try to extract first table name from admin-provided names
      if (sqlTableNames) {
        const names = sqlTableNames.split(',').map(n => n.trim().toLowerCase()).filter(n => n.length > 0);
        if (names.length > 0) firstTableName = names[0];
      }
      // If not found, try to extract from question text
      if (!firstTableName) {
        const tableMatch = question.match(/(?:FROM|from|table|Table|TABLE)[:\s]+([a-zA-Z_][a-zA-Z0-9_]*)/i);
        if (tableMatch && tableMatch[1]) {
          firstTableName = tableMatch[1].toLowerCase();
        }
      }
    }
    initialCode += getStarterCode(language, firstTableName);
    return initialCode;
  }, [defaultValue, question, language, sqlTableNames]);

  const [code, setCode] = useState(getInitialCode);
  const [output, setOutput] = useState<{ columns: string[]; values: any[][] } | null>(null);
  const [textOutput, setTextOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<{ passed: boolean; message?: string } | null>(null);
  const [showXpModal, setShowXpModal] = useState(false);
  const { toast: toastHook } = useToast();

  // Debug: Log when modal state changes
  useEffect(() => {
    console.log("showXpModal state changed:", showXpModal);
  }, [showXpModal]);

  // Reset hasAwardedXP when questionId changes
  useEffect(() => {
    setHasAwardedXP(false);
  }, [questionId]);

  // Notify parent of output changes
  useEffect(() => {
    if (onOutputChange) {
      onOutputChange(output, textOutput);
    }
  }, [output, textOutput, onOutputChange]);

  // Notify parent of validation changes
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(validationResult);
    }
  }, [validationResult, onValidationChange]);

  // Function to track question completion and award XP
  const trackQuestionCompletion = async (questionId: string) => {
    if (!currentUser || !questionId) {
      console.log("trackQuestionCompletion: Missing user or questionId", { currentUser: !!currentUser, questionId });
      return false;
    }

    if (hasAwardedXP) {
      console.log("trackQuestionCompletion: XP already awarded for this session");
      return false;
    }

    try {
      // Check if already completed
      const submissionRef = doc(firestoreDb, "userQuestionSubmissions", `${currentUser.uid}_${questionId}`);
      const submissionSnap = await getDoc(submissionRef);

      if (submissionSnap.exists() && submissionSnap.data().status === "completed") {
        console.log("trackQuestionCompletion: Question already completed previously");
        return false; // Already completed
      }

      // Mark as completed - use setDoc for create, updateDoc for update
      if (submissionSnap.exists()) {
        // Update existing document
        await updateDoc(submissionRef, {
          status: "completed",
          completedAt: serverTimestamp(),
        });
      } else {
        // Create new document
        await setDoc(submissionRef, {
          userId: currentUser.uid,
          questionId: questionId,
          status: "completed",
          completedAt: serverTimestamp(),
        });
      }

      // Award XP (25 points per question)
      const userRef = doc(firestoreDb, "users", currentUser.uid);
      await setDoc(userRef, {
        xp: increment(25),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setHasAwardedXP(true);
      console.log("trackQuestionCompletion: XP awarded successfully, returning true");
      // Don't show toast here, let the modal handle it
      return true;
    } catch (error: any) {
      console.error("Error tracking completion:", error);
      console.error("Error details:", {
        code: error?.code,
        message: error?.message,
        userId: currentUser?.uid,
        questionId: questionId
      });
      toastHook({
        title: "Error",
        description: error?.message || "Failed to track completion. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };
  const [sqlJs, setSqlJs] = useState<any>(null);
  const [db, setDb] = useState<Database | null>(null);
  const [pyodide, setPyodide] = useState<any>(null);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const { toast } = useToast();
  const dbInitialized = useRef(false);
  const dbRef = useRef<Database | null>(null);
  const pyodideLoading = useRef(false);
  const questionTables = useMemo(() => {
    const tables = extractSqlTablesFromQuestion(question, sqlTableNames);
    console.log("Extracted SQL tables from question:", tables);
    console.log("Question text:", question?.substring(0, 500)); // Log first 500 chars
    console.log("Admin-provided table names:", sqlTableNames);
    return tables;
  }, [question, sqlTableNames]);

  // Function to normalize and compare outputs
  const compareOutputs = (
    actualOutput: { columns: string[]; values: any[][] } | string | null,
    expectedOutput: string
  ): { passed: boolean; message?: string } => {
    if (!expectedOutput) {
      return { passed: true }; // No expected output means no validation
    }

    try {
      if (language === "sql" && actualOutput && typeof actualOutput === "object" && "columns" in actualOutput) {
        // For SQL, expectedOutput should be a JSON string
        const expected = JSON.parse(expectedOutput);
        
        // Compare columns
        const actualCols = actualOutput.columns.map(c => c.toLowerCase().trim());
        const expectedCols = expected.columns?.map((c: string) => c.toLowerCase().trim()) || [];
        
        if (actualCols.length !== expectedCols.length) {
          return { 
            passed: false, 
            message: `Column count mismatch. Expected ${expectedCols.length}, got ${actualCols.length}` 
          };
        }

        // Compare values (normalize for comparison)
        const actualValues = actualOutput.values.map(row => 
          row.map(cell => String(cell).toLowerCase().trim())
        ).sort();
        const expectedValues = (expected.values || []).map((row: any[]) => 
          row.map((cell: any) => String(cell).toLowerCase().trim())
        ).sort();

        if (actualValues.length !== expectedValues.length) {
          return { 
            passed: false, 
            message: `Row count mismatch. Expected ${expectedValues.length}, got ${actualValues.length}` 
          };
        }

        // Deep comparison of values
        const actualStr = JSON.stringify(actualValues);
        const expectedStr = JSON.stringify(expectedValues);
        
        if (actualStr === expectedStr) {
          return { passed: true, message: "Output matches expected result! ✓" };
        } else {
          return { 
            passed: false, 
            message: "Output does not match expected result. Check your solution." 
          };
        }
      } else if (typeof actualOutput === "string" || textOutput) {
        // For text-based outputs (Python, JavaScript, etc.)
        const actual = (typeof actualOutput === "string" ? actualOutput : textOutput || "").trim().toLowerCase();
        const expected = expectedOutput.trim().toLowerCase();
        
        // Remove extra whitespace and compare
        const normalizedActual = actual.replace(/\s+/g, " ");
        const normalizedExpected = expected.replace(/\s+/g, " ");
        
        if (normalizedActual === normalizedExpected) {
          return { passed: true, message: "Output matches expected result! ✓" };
        } else {
          // Try partial match
          if (normalizedActual.includes(normalizedExpected) || normalizedExpected.includes(normalizedActual)) {
            return { passed: true, message: "Output partially matches expected result! ✓" };
          }
          return { 
            passed: false, 
            message: "Output does not match expected result. Check your solution." 
          };
        }
      }
    } catch (error) {
      console.error("Validation error:", error);
      return { passed: false, message: "Error validating output. Please check the expected output format." };
    }

    return { passed: true };
  };

  // Update code when question, defaultValue, or language changes
  useEffect(() => {
    setCode(getInitialCode);
    setOutput(null);
    setTextOutput(null);
    setValidationResult(null);
    // Reset database initialization when language changes
    if (language !== "sql") {
      dbInitialized.current = false;
      if (dbRef.current) {
        dbRef.current.close();
        dbRef.current = null;
      }
      setDb(null);
      setAvailableTables([]);
    }
  }, [getInitialCode, language]);

  // Initialize Python (Pyodide) for Python execution
  useEffect(() => {
    if (language === "python" && !pyodide && !pyodideLoading.current) {
      pyodideLoading.current = true;
      const loadPyodide = async () => {
        try {
          // Dynamically import Pyodide
          const pyodideModule = await import("pyodide");
          const pyodideInstance = await pyodideModule.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/",
          });
          setPyodide(pyodideInstance);
        } catch (error) {
          console.error("Failed to load Pyodide:", error);
          toast({
            title: "Python runtime not available",
            description: "Python execution may not work. Please refresh the page.",
            variant: "destructive",
          });
        } finally {
          pyodideLoading.current = false;
        }
      };
      loadPyodide();
    }
  }, [language, pyodide, toast]);

  // Initialize SQL.js runtime when needed
  useEffect(() => {
    if (language !== "sql" || sqlJs) return;
    let cancelled = false;

    const loadSqlJs = async () => {
        try {
          const SQL = await initSqlJs({
            locateFile: (file) => `https://sql.js.org/dist/${file}`,
          });
        if (!cancelled) {
          setSqlJs(SQL);
        }
      } catch (error) {
        console.error("Failed to initialize SQL.js:", error);
        if (!cancelled) {
          toast({
            title: "SQL environment not available",
            description: "SQL execution may not work. Please refresh the page.",
            variant: "destructive",
          });
        }
      }
    };

    loadSqlJs();

    return () => {
      cancelled = true;
    };
  }, [language, sqlJs, toast]);

  // Build SQL database using question tables (or fallback sample data)
  useEffect(() => {
    if (language !== "sql" || !sqlJs) return;

    const createSampleDatabase = (database: any) => {
          database.run(`
            CREATE TABLE employees (
              id INTEGER PRIMARY KEY,
              name TEXT NOT NULL,
              department TEXT,
              salary INTEGER,
              hire_date TEXT
            );
          `);
          
          database.run(`
            INSERT INTO employees (name, department, salary, hire_date) VALUES
            ('John Doe', 'Engineering', 75000, '2020-01-15'),
            ('Jane Smith', 'Marketing', 65000, '2019-03-20'),
            ('Bob Johnson', 'Engineering', 80000, '2018-06-10'),
            ('Alice Williams', 'Sales', 60000, '2021-02-05'),
            ('Charlie Brown', 'Engineering', 90000, '2017-11-30');
          `);
          
          database.run(`
            CREATE TABLE products (
              id INTEGER PRIMARY KEY,
              name TEXT NOT NULL,
              category TEXT,
              price REAL,
              stock INTEGER
            );
          `);
          
          database.run(`
            INSERT INTO products (name, category, price, stock) VALUES
            ('Laptop', 'Electronics', 999.99, 50),
            ('Mouse', 'Electronics', 29.99, 200),
            ('Desk Chair', 'Furniture', 199.99, 30),
            ('Monitor', 'Electronics', 299.99, 75),
            ('Keyboard', 'Electronics', 79.99, 150);
          `);
          
          database.run(`
            CREATE TABLE orders (
              id INTEGER PRIMARY KEY,
              product_id INTEGER,
              employee_id INTEGER,
              quantity INTEGER,
              order_date TEXT,
              FOREIGN KEY (product_id) REFERENCES products(id),
              FOREIGN KEY (employee_id) REFERENCES employees(id)
            );
          `);
          
          database.run(`
            INSERT INTO orders (product_id, employee_id, quantity, order_date) VALUES
        (1, 1, 2, '2023-01-10'),
        (2, 2, 5, '2023-02-15'),
        (3, 3, 1, '2023-03-05'),
        (4, 4, 3, '2023-04-20'),
        (5, 5, 4, '2023-05-25');
          `);

      setAvailableTables(["employees", "products", "orders"]);
    };

    const buildQuestionTables = (database: any) => {
      const names: string[] = [];

      questionTables.forEach((table, index) => {
        // Prefer originalName if it's a valid SQL identifier, otherwise use tableName
        // Normalize to lowercase for consistency
        let tableName = (table.originalName && /^[A-Za-z_][A-Za-z0-9_]*$/.test(table.originalName))
          ? table.originalName.toLowerCase()
          : (table.tableName || `dataset_${index + 1}`);
        // Ensure it's lowercase
        tableName = tableName.toLowerCase();
        names.push(tableName);

        const columnDefinitions = table.columns
          .map((col) => `"${col.replace(/"/g, '""')}" TEXT`)
          .join(", ");
        database.run(`CREATE TABLE "${tableName}" (${columnDefinitions});`);

        const placeholders = table.columns.map(() => "?").join(", ");
        const insertStmt = database.prepare(
          `INSERT INTO "${tableName}" (${table.columns
            .map((col) => `"${col.replace(/"/g, '""')}"`)
            .join(", ")}) VALUES (${placeholders})`,
        );

        table.values.forEach((row) => {
          const normalizedRow = Array.isArray(row) ? row.map((value) => value ?? null) : [];
          insertStmt.run(normalizedRow);
        });

        insertStmt.free();
      });

      // Log created tables for debugging
      console.log("Created SQL tables:", names);
      setAvailableTables(names);
    };

    const setupDatabase = () => {
      if (!sqlJs) return;

      if (dbRef.current) {
        dbRef.current.close();
        dbRef.current = null;
      }

      const database = new sqlJs.Database();
      if (questionTables.length > 0) {
        buildQuestionTables(database);
      } else {
        createSampleDatabase(database);
      }
          
          dbRef.current = database;
          setDb(database);
          dbInitialized.current = true;
    };

    setupDatabase();

    return () => {
      if (dbRef.current) {
        dbRef.current.close();
        dbRef.current = null;
      }
      setDb(null);
      setAvailableTables([]);
      dbInitialized.current = false;
    };
  }, [language, sqlJs, questionTables]);

  // Helper function to extract executable code (remove comments)
  const extractExecutableCode = (code: string, lang: string): string => {
    if (lang === "sql") {
      // First, remove JSON blocks that might be in the code (from question text)
      // This handles cases where JSON table data is included in comments
      let cleanedCode = code.replace(/\{[^{}]*"columns"[^{}]*"values"[^{}]*\}/g, '');
      
      // For SQL, remove single-line comments (-- and #)
      return cleanedCode
        .split('\n')
        .map(line => {
          // Remove -- comments
          const dashIndex = line.indexOf('--');
          if (dashIndex !== -1) {
            line = line.substring(0, dashIndex);
          }
          // Remove # comments (if not in string)
          const hashIndex = line.indexOf('#');
          if (hashIndex !== -1) {
            // Simple check: if line doesn't contain quotes, safe to remove
            const beforeHash = line.substring(0, hashIndex);
            if (!beforeHash.includes("'") && !beforeHash.includes('"')) {
              line = line.substring(0, hashIndex);
            }
          }
          return line.trim();
        })
        .filter(line => {
          // Filter out lines that are empty, comments, or contain JSON-like structures
          const trimmed = line.trim();
          if (trimmed.length === 0) return false;
          if (trimmed.startsWith('--') || trimmed.startsWith('#')) return false;
          // Filter out lines that look like JSON (contain { or } but aren't SQL)
          if ((trimmed.includes('{') || trimmed.includes('}')) && !trimmed.match(/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)/i)) {
            return false;
          }
          return true;
        })
        .join('\n')
        .trim();
    } else if (lang === "python") {
      // For Python, remove # comments but preserve strings
      const lines = code.split('\n');
      const processedLines: string[] = [];
      let inMultiLineString = false;
      let stringChar = '';
      
      for (const line of lines) {
        let processedLine = line;
        let inString = false;
        let currentStringChar = '';
        
        // Process character by character to handle strings properly
        let result = '';
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];
          
          if (!inString && (char === '"' || char === "'")) {
            // Check for triple quotes
            if (nextChar === char && line[i + 2] === char) {
              inMultiLineString = !inMultiLineString;
              stringChar = char;
              result += char + char + char;
              i += 2;
              continue;
            }
            inString = true;
            currentStringChar = char;
            result += char;
          } else if (inString && char === currentStringChar) {
            inString = false;
            currentStringChar = '';
            result += char;
          } else if (!inString && !inMultiLineString && char === '#') {
            // Found comment, stop processing this line
            break;
          } else {
            result += char;
          }
        }
        
        processedLine = result.trimEnd();
        
        // Skip lines that are only comments or empty
        if (processedLine && !processedLine.trim().startsWith('#')) {
          processedLines.push(processedLine);
        }
      }
      
      return processedLines.join('\n').trim();
    } else if (lang === "javascript" || lang === "typescript") {
      // For JS/TS, remove // and /* */ comments
      let result = code;
      // Remove /* */ comments (but not inside strings)
      result = result.replace(/\/\*[\s\S]*?\*\//g, '');
      // Remove // comments
      return result
        .split('\n')
        .map(line => {
          const slashIndex = line.indexOf('//');
          if (slashIndex !== -1) {
            // Check if // is inside a string
            const beforeSlash = line.substring(0, slashIndex);
            const singleQuotes = (beforeSlash.match(/'/g) || []).length;
            const doubleQuotes = (beforeSlash.match(/"/g) || []).length;
            const backticks = (beforeSlash.match(/`/g) || []).length;
            if (singleQuotes % 2 === 0 && doubleQuotes % 2 === 0 && backticks % 2 === 0) {
              return line.substring(0, slashIndex).trimEnd();
            }
          }
          return line;
        })
        .filter(line => line.trim().length > 0 && !line.trim().startsWith('//'))
        .join('\n')
        .trim();
    }
    // For other languages, return as-is
    return code.trim();
  };

  const handleRun = async () => {
    if (!code.trim()) {
      toast({
        title: "No code to execute",
        description: "Please write some code first.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setOutput(null);
    setTextOutput(null);
    setValidationResult(null);

    // Extract executable code (remove comments)
    const executableCode = extractExecutableCode(code, language);

    if (!executableCode) {
      toast({
        title: "No executable code",
        description: "Please write some code to execute (comments are ignored).",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      if (language === "sql") {
        if (!db) {
          toast({
            title: "Database not initialized",
            description: "Please wait for the database to load.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Split by semicolons to handle multiple queries
        const queries = executableCode.split(";").filter((q) => q.trim());
        
        if (queries.length === 0) {
          toast({
            title: "No valid query",
            description: "Please write a valid SQL query.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Execute the last query (or all queries if needed)
        let query = queries[queries.length - 1].trim();
        
        // Normalize table names in the query to match created table names (case-insensitive)
        // This helps when user writes "FROM customers" but table was created as "customers" (lowercase)
        // SQLite is case-insensitive for ASCII, but we normalize to be safe
        const tableNames = availableTables;
        tableNames.forEach(tableName => {
          // Replace table names in FROM/JOIN clauses (case-insensitive, whole word only)
          // Match: FROM customers, JOIN customers, customers WHERE, etc.
          const escapedTableName = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedTableName}\\b`, 'gi');
          query = query.replace(regex, `"${tableName}"`);
        });
        
        console.log("Executing SQL query:", query);
        console.log("Available tables:", tableNames);
        
        if (query.toLowerCase().startsWith("select")) {
          // SELECT query - return results
          const result = db.exec(query);
          
          if (result.length > 0) {
            const { columns, values } = result[0];
            const outputData = { columns, values };
            setOutput(outputData);
            
            // Validate output if expectedOutput is provided
            if (expectedOutput) {
              const validation = compareOutputs(outputData, expectedOutput);
              setValidationResult(validation);
              console.log("Validation result:", validation);
              if (validation.passed) {
                toast({
                  title: "✓ Solution Correct!",
                  description: validation.message || "Your output matches the expected result.",
                });
                // Track completion and award XP
                if (questionId) {
                  console.log("Tracking completion for questionId:", questionId);
                  const xpAwarded = await trackQuestionCompletion(questionId);
                  console.log("XP awarded result:", xpAwarded);
                  if (xpAwarded) {
                    console.log("Setting showXpModal to true");
                    setShowXpModal(true);
                  } else {
                    console.log("XP not awarded, check trackQuestionCompletion logs");
                  }
                } else {
                  console.log("No questionId provided, cannot track completion");
                }
              } else {
                toast({
                  title: "Solution Incorrect",
                  description: validation.message || "Your output doesn't match the expected result.",
                  variant: "destructive",
                });
              }
            } else {
              toast({
                title: "Query executed successfully",
                description: `Returned ${values.length} row(s).`,
              });
            }
          } else {
            setOutput({ columns: [], values: [] });
            if (expectedOutput) {
              const validation = compareOutputs({ columns: [], values: [] }, expectedOutput);
              setValidationResult(validation);
            }
            toast({
              title: "Query executed",
              description: "No results returned.",
            });
          }
        } else {
          // INSERT, UPDATE, DELETE, CREATE, etc.
          db.run(query);
          setOutput({ columns: ["Status"], values: [["Query executed successfully"]] });
          toast({
            title: "Query executed successfully",
            description: "The query has been executed.",
          });
        }
      } else if (language === "python") {
        if (!pyodide) {
          toast({
            title: "Python runtime not ready",
            description: "Please wait for Python to load, then try again.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Capture stdout
        let outputText = "";
        pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
`);

        try {
          // Execute Python code (only executable code, comments removed)
          pyodide.runPython(executableCode);
          outputText = pyodide.runPython("sys.stdout.getvalue()");
        } catch (error: any) {
          outputText = `Error: ${error.message || String(error)}`;
        }

        const finalOutput = outputText || "(No output)";
        setTextOutput(finalOutput);
        
        // Validate output if expectedOutput is provided
        if (expectedOutput) {
          const validation = compareOutputs(finalOutput, expectedOutput);
          setValidationResult(validation);
          if (validation.passed) {
            toast({
              title: "✓ Solution Correct!",
              description: validation.message || "Your output matches the expected result.",
            });
            // Track completion and award XP
            if (questionId) {
              const xpAwarded = await trackQuestionCompletion(questionId);
              if (xpAwarded) {
                setShowXpModal(true);
              }
            }
          } else {
            toast({
              title: "Solution Incorrect",
              description: validation.message || "Your output doesn't match the expected result.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Code executed",
            description: outputText ? "Check the output below." : "Code ran successfully with no output.",
          });
        }
      } else if (language === "javascript") {
        // Execute JavaScript code
        try {
          // Capture console.log output
          const logs: string[] = [];
          const originalLog = console.log;
          const originalError = console.error;
          const originalWarn = console.warn;
          
          console.log = (...args: any[]) => {
            logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '));
            originalLog.apply(console, args);
          };
          
          console.error = (...args: any[]) => {
            logs.push(`ERROR: ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ')}`);
            originalError.apply(console, args);
          };
          
          console.warn = (...args: any[]) => {
            logs.push(`WARN: ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ')}`);
            originalWarn.apply(console, args);
          };

          // Execute code in a safe context (only executable code, comments removed)
          const result = new Function(executableCode)();
          
          // Restore console
          console.log = originalLog;
          console.error = originalError;
          console.warn = originalWarn;

          let outputText = logs.join('\n');
          if (result !== undefined) {
            outputText = outputText ? `${outputText}\n\nReturn value: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}` : `Return value: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}`;
          }
          
          const finalOutput = outputText || "(No output)";
          setTextOutput(finalOutput);
          
          // Validate output if expectedOutput is provided
          if (expectedOutput) {
            const validation = compareOutputs(finalOutput, expectedOutput);
            setValidationResult(validation);
            if (validation.passed) {
              toast({
                title: "✓ Solution Correct!",
                description: validation.message || "Your output matches the expected result.",
              });
              if (questionId) {
                const xpAwarded = await trackQuestionCompletion(questionId);
                if (xpAwarded) {
                  setShowXpModal(true);
                }
              }
            } else {
              toast({
                title: "Solution Incorrect",
                description: validation.message || "Your output doesn't match the expected result.",
                variant: "destructive",
              });
            }
          } else {
            toast({
              title: "Code executed",
              description: outputText ? "Check the output below." : "Code ran successfully with no output.",
            });
          }
        } catch (error: any) {
          setTextOutput(`Error: ${error.message || String(error)}\n\nStack trace:\n${error.stack || 'No stack trace available'}`);
          toast({
            title: "Execution Error",
            description: error.message || "An error occurred while executing the code.",
            variant: "destructive",
          });
        }
      } else if (language === "typescript") {
        // For TypeScript, we'll execute it as JavaScript (basic transpilation)
        // Note: This is a simplified approach - full TypeScript checking would require a compiler
        try {
          const logs: string[] = [];
          const originalLog = console.log;
          const originalError = console.error;
          const originalWarn = console.warn;
          
          console.log = (...args: any[]) => {
            logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '));
            originalLog.apply(console, args);
          };
          
          console.error = (...args: any[]) => {
            logs.push(`ERROR: ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ')}`);
            originalError.apply(console, args);
          };
          
          console.warn = (...args: any[]) => {
            logs.push(`WARN: ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ')}`);
            originalWarn.apply(console, args);
          };

          // Execute as JavaScript (TypeScript syntax is mostly compatible)
          // Remove TypeScript-specific syntax for execution
          let jsCode = executableCode
            .replace(/:\s*\w+(\[\])?/g, '') // Remove type annotations
            .replace(/interface\s+\w+\s*\{[^}]*\}/g, '') // Remove interfaces
            .replace(/type\s+\w+\s*=.*?;/g, ''); // Remove type aliases
          
          const result = new Function(jsCode)();
          
          // Restore console
          console.log = originalLog;
          console.error = originalError;
          console.warn = originalWarn;

          let outputText = logs.join('\n');
          if (result !== undefined) {
            outputText = outputText ? `${outputText}\n\nReturn value: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}` : `Return value: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}`;
          }
          
          const finalOutput = outputText || "(No output)\n\nNote: TypeScript is executed as JavaScript. Full type checking is not performed.";
          setTextOutput(finalOutput);
          
          // Validate output if expectedOutput is provided
          if (expectedOutput) {
            const validation = compareOutputs(finalOutput, expectedOutput);
            setValidationResult(validation);
            if (validation.passed) {
              toast({
                title: "✓ Solution Correct!",
                description: validation.message || "Your output matches the expected result.",
              });
              if (questionId) {
                const xpAwarded = await trackQuestionCompletion(questionId);
                if (xpAwarded) {
                  setShowXpModal(true);
                }
              }
            } else {
              toast({
                title: "Solution Incorrect",
                description: validation.message || "Your output doesn't match the expected result.",
                variant: "destructive",
              });
            }
          } else {
            toast({
              title: "Code executed",
              description: "TypeScript executed as JavaScript. Full type checking not available.",
            });
          }
        } catch (error: any) {
          setTextOutput(`Error: ${error.message || String(error)}\n\nStack trace:\n${error.stack || 'No stack trace available'}\n\nNote: TypeScript is executed as JavaScript.`);
          toast({
            title: "Execution Error",
            description: error.message || "An error occurred while executing the code.",
            variant: "destructive",
          });
        }
      } else {
        // For other languages (Java, C++, C#, Go, Rust, etc.), use Piston API (FREE) or Judge0 API
        // Piston API is FREE and works by default - no configuration needed!

        // Check if language is supported by Judge0
        const supportedLanguages = getSupportedLanguages();
        if (!supportedLanguages.includes(language.toLowerCase())) {
        setTextOutput(
            `Language ${language.toUpperCase()} is not currently supported.\n\n` +
            `Supported languages: ${supportedLanguages.join(', ')}`
        );
        toast({
            title: "Language not supported",
            description: `Please use one of the supported languages.`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        try {
          // Execute code using Judge0
          const result = await executeCode(executableCode, language);
          
          let outputText = result.output || '';
          if (result.error) {
            outputText = outputText ? `${outputText}\n\nError:\n${result.error}` : `Error:\n${result.error}`;
          }
          
          if (result.time) {
            outputText += `\n\nExecution time: ${result.time}s`;
          }
          if (result.memory) {
            outputText += `\nMemory used: ${(result.memory / 1024).toFixed(2)} KB`;
          }
          
          const finalOutput = outputText || "(No output)";
          setTextOutput(finalOutput);
          
          // Validate output if expectedOutput is provided
          if (expectedOutput) {
            const validation = compareOutputs(finalOutput, expectedOutput);
            setValidationResult(validation);
            if (validation.passed) {
              toast({
                title: "✓ Solution Correct!",
                description: validation.message || "Your output matches the expected result.",
              });
              // Track completion and award XP
              if (questionId) {
                const xpAwarded = await trackQuestionCompletion(questionId);
                if (xpAwarded) {
                  setShowXpModal(true);
                }
              }
            } else {
              toast({
                title: "Solution Incorrect",
                description: validation.message || "Your output doesn't match the expected result.",
                variant: "destructive",
              });
            }
          } else {
            if (result.error) {
              toast({
                title: result.error.includes("Compilation") ? "Compilation Error" : "Execution Error",
                description: result.error,
                variant: "destructive",
              });
            } else {
              toast({
                title: "Code executed successfully",
                description: result.time ? `Execution time: ${result.time}s` : "Check the output below.",
              });
            }
          }
        } catch (error: any) {
          setTextOutput(`Error: ${error.message || String(error)}\n\nPlease check your Judge0 API configuration.`);
          toast({
            title: "Execution Error",
            description: error.message || "An error occurred while executing the code.",
            variant: "destructive",
        });
        }
      }
    } catch (error: any) {
      console.error("Execution error:", error);
      const errorMsg = error.message || "An error occurred while executing the code.";
      toast({
        title: "Execution Error",
        description: errorMsg,
        variant: "destructive",
      });
      setTextOutput(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={hideOutput ? "h-full flex flex-col" : "space-y-4"}>
      <div className={`border-2 border-border/50 rounded-xl overflow-hidden bg-background/60 shadow-lg ${hideOutput ? "flex-1 flex flex-col min-h-0" : ""}`}>
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-muted/40 to-muted/20 border-b border-border/50 gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 border border-primary/20">
              <Code2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">
            {language.toUpperCase()} Editor
          </span>
          </div>
          <Button
            onClick={handleRun}
            disabled={loading || (language === "sql" && !db) || (language === "python" && !pyodide)}
            size="sm"
            className="gap-2 text-sm h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all"
            title={
              language === "sql" && !db
                ? "Waiting for SQL database to initialize..."
                : language === "python" && !pyodide
                ? "Waiting for Python runtime to load..."
                : "Run code"
            }
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Run Code</span>
              </>
            )}
          </Button>
        </div>
        {language === "sql" && availableTables.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-2 text-xs border-b border-border/50 bg-muted/20">
            <span className="text-muted-foreground">Tables available:</span>
            {availableTables.map((name) => (
              <code
                key={name}
                className="px-2 py-0.5 rounded bg-background border border-border/40 text-foreground font-semibold"
              >
                {name}
              </code>
            ))}
          </div>
        )}
        <div className="flex-1 min-h-0">
        <Editor
          height={height}
          language={language}
          value={code}
          onChange={(value) => setCode(value || "")}
          theme="vs-dark"
          loading={<div className="flex items-center justify-center h-full text-muted-foreground">Loading editor...</div>}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: "on",
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            scrollbar: {
              vertical: "auto",
              horizontal: "auto",
            },
          }}
        />
        </div>
      </div>

      {validationResult && (
        <div className={`border-2 rounded-xl overflow-hidden shadow-lg ${
          validationResult.passed 
            ? "border-green-500/60 bg-gradient-to-br from-green-500/15 to-green-500/5" 
            : "border-red-500/60 bg-gradient-to-br from-red-500/15 to-red-500/5"
        }`}>
          <div className={`px-5 py-4 flex items-center gap-3 ${
            validationResult.passed 
              ? "bg-green-500/20 border-b border-green-500/30" 
              : "bg-red-500/20 border-b border-red-500/30"
          }`}>
            {validationResult.passed ? (
              <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/40">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/40">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
            )}
            <div className="flex-1">
              <span className={`text-sm font-bold block ${
                validationResult.passed ? "text-green-400" : "text-red-400"
            }`}>
                {validationResult.passed ? "✓ Solution Correct!" : "✗ Solution Incorrect"}
            </span>
            {validationResult.message && (
                <span className="text-xs text-muted-foreground mt-1 block">
                {validationResult.message}
              </span>
            )}
            </div>
          </div>
        </div>
      )}

      {!hideOutput && (output || textOutput) && (
        <div className="border-2 border-border/50 rounded-xl overflow-hidden bg-background/60 shadow-lg">
          <div className="px-4 py-3 bg-gradient-to-r from-muted/40 to-muted/20 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-primary/10 border border-primary/20">
                <Terminal className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">
              Output
            </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            {output && output.columns.length > 0 && output.values.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border/50 bg-muted/30">
                    {output.columns.map((col, idx) => (
                      <th key={idx} className="px-5 py-3 text-left font-bold text-foreground">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {output.values.map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="px-5 py-3 text-foreground/90">
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : textOutput ? (
              <div className="p-5">
                <pre className="text-sm text-foreground/90 font-mono whitespace-pre-wrap bg-background/70 p-4 rounded-lg border border-border/50 shadow-inner">
                  {textOutput}
                </pre>
              </div>
            ) : (
              <div className="p-5 text-sm text-muted-foreground text-center">
                No results to display
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={showXpModal} onOpenChange={setShowXpModal}>
        <DialogContent className="max-w-sm text-center space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
              <Trophy className="h-6 w-6 text-yellow-400" />
              +25 XP
            </DialogTitle>
            <DialogDescription className="text-base">
              Question completed! Keep solving to climb the leaderboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              XP is awarded once per question. Check the leaderboard to see how you rank.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => setShowXpModal(false)}>
                Keep Practicing
              </Button>
              <Button onClick={() => { setShowXpModal(false); window.location.href = "/leaderboard"; }}>
                View Leaderboard
              </Button>
        </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CodeEditor;

