import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Loader2, CheckCircle2, XCircle, Code2, Terminal, Trophy, Check, X } from "lucide-react";
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
  difficulty?: "easy" | "medium" | "hard"; // Question difficulty for XP calculation
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

const isSelectLikeSql = (sql: string): boolean => {
  if (!sql) return false;
  const cleaned = sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--.*$/gm, " ")
    .trim()
    .toLowerCase();

  if (!cleaned) return false;

  const normalized = cleaned.replace(/^\(+/, "").trim();
  const nonSelectPrefixes = [
    "insert",
    "update",
    "delete",
    "create",
    "drop",
    "alter",
    "truncate",
    "comment",
    "grant",
    "revoke",
    "merge",
    "replace",
    "pragma",
    "vacuum",
    "attach",
    "detach",
  ];

  if (nonSelectPrefixes.some((prefix) => normalized.startsWith(prefix))) {
    return false;
  }

  if (
    normalized.startsWith("select") ||
    normalized.startsWith("with") ||
    normalized.startsWith("explain select") ||
    normalized.startsWith("explain with")
  ) {
    return true;
  }

  return /\bselect\b/.test(normalized);
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
  // Order matters: more specific patterns first to avoid false matches
  const tableNamePatterns = [
    /(?:FROM|from)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /SQL\s+table[:\s]+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /(?:table|Table|TABLE)[:\s]+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /using\s+the\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+table/gi,
    /the\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+table/gi,
    // More specific pattern: word before "table" but not "the"
    /\b([a-zA-Z_][a-zA-Z0-9_]*)\s+table\b/gi,
  ];
  const mentionedTables: string[] = [];
  tableNamePatterns.forEach(pattern => {
    // Reset regex lastIndex for global regex
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(questionText)) !== null) {
      if (m[1]) {
        const tableName = m[1].toLowerCase();
        // Skip common SQL keywords, articles, and generic words
        const skipWords = ['select', 'where', 'group', 'order', 'having', 'limit', 'join', 'inner', 'left', 'right', 'outer', 'on', 'as', 'and', 'or', 'not', 'in', 'exists', 'like', 'between', 'the', 'a', 'an', 'this', 'that', 'below', 'above'];
        if (!skipWords.includes(tableName) && !mentionedTables.includes(tableName)) {
          mentionedTables.push(tableName);
        }
      }
    }
  });

  while ((match = regex.exec(questionText)) !== null) {
    try {
      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed.columns) || !Array.isArray(parsed.values)) continue;
      
      // Priority: 1. Admin-provided names (ALWAYS use if provided), 2. JSON table name, 3. Mentioned tables, 4. Fallback
      let rawName: string | undefined;
      
      // First priority: ALWAYS use admin-provided table names if available (even if only one table and one name)
      if (adminTableNamesList.length > 0) {
        // Use the corresponding admin name for this table index, or the first one if we have more tables than names
        const adminNameIndex = Math.min(tables.length, adminTableNamesList.length - 1);
        rawName = adminTableNamesList[adminNameIndex];
      } else {
        // Second priority: Try to get table name from JSON
        rawName =
          (typeof parsed.tableName === "string" && parsed.tableName.trim()) ||
          (typeof parsed.table_name === "string" && parsed.table_name.trim()) ||
          (typeof parsed.name === "string" && parsed.name.trim()) ||
          (typeof parsed.table === "string" && parsed.table.trim());
        
        if (rawName) {
          // table name from JSON
        } else if (mentionedTables.length > 0) {
          // Third priority: Use mentioned tables from question text
          rawName = mentionedTables[Math.min(tables.length, mentionedTables.length - 1)];
        } else {
          // Fourth priority: Fallback to generic name
          rawName = `dataset_${tables.length + 1}`;
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

/**
 * Parse DataFrame print output and convert to structured table format
 * Handles pandas DataFrame print format like:
 *   ride_id driver_name fare_amount
 * 0     501       Arjun       250.0
 * 3     504        Sara       180.0
 */
const parseDataFrameOutput = (output: string): { columns: string[]; values: any[][] } | null => {
  if (!output || typeof output !== 'string') return null;
  
  const lines = output.trim().split('\n').filter(line => line.trim().length > 0);
  if (lines.length < 2) return null; // Need at least header + 1 data row
  
  try {
    // First line is the header (column names)
    const headerLine = lines[0].trim();
    // Split header by whitespace, but handle multiple spaces
    const columns = headerLine.split(/\s+/).filter(col => col.length > 0);
    
    if (columns.length === 0) return null;
    
    // Check if this looks like a DataFrame (has numeric index in first column of data rows)
    let hasIndex = false;
    if (lines.length > 1) {
      const firstDataLine = lines[1].trim();
      const firstPart = firstDataLine.split(/\s+/)[0];
      // Check if first part looks like an index (numeric)
      hasIndex = /^\d+$/.test(firstPart);
    }
    
    // Parse data rows (skip first line which is header)
    const values: any[][] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Split by whitespace, handling multiple spaces
      const parts = line.split(/\s+/).filter(part => part.length > 0);
      
      // If we detected an index, skip the first part
      let dataParts: string[];
      if (hasIndex && parts.length > columns.length) {
        // Has index column, skip it
        dataParts = parts.slice(1);
      } else if (parts.length === columns.length) {
        // No index column or already aligned
        dataParts = parts;
      } else if (parts.length > columns.length) {
        // More parts than columns, likely has index - skip first
        dataParts = parts.slice(1).slice(0, columns.length);
      } else {
        // Fewer parts - might be due to missing values or alignment issues
        dataParts = parts;
      }
      
      // Ensure we have the right number of columns
      while (dataParts.length < columns.length) {
        dataParts.push(''); // Pad with empty strings
      }
      dataParts = dataParts.slice(0, columns.length); // Trim if too many
      
      // Convert values, handling integers (remove .0 from floats that are actually integers)
      const row = dataParts.map((val) => {
        if (val === '' || val === null || val === undefined) return '';
        
        // Try to parse as number
        const numVal = Number(val);
        if (!isNaN(numVal) && val.trim() !== '') {
          // If it's a float that's actually an integer (e.g., 250.0), return as integer
          if (Number.isInteger(numVal)) {
            return Math.floor(numVal);
          }
          return numVal;
        }
        return String(val);
      });
      
      // Only add row if it has the correct number of columns
      if (row.length === columns.length) {
        values.push(row);
      }
    }
    
    if (values.length === 0) return null;
    
    return { columns, values };
  } catch (e) {
    // If parsing fails, return null to fall back to text output
    return null;
  }
};

const CodeEditor = ({ language = "sql", defaultValue = "", height = "300px", question, questionId, expectedOutput, hideOutput = false, sqlTableNames, difficulty, onOutputChange, onValidationChange }: CodeEditorProps) => {
  const { currentUser } = useAuth();
  const [hasAwardedXP, setHasAwardedXP] = useState(false);
  const [awardedXPAmount, setAwardedXPAmount] = useState(0);

  // Calculate XP based on difficulty
  const getXPForDifficulty = (diff?: "easy" | "medium" | "hard"): number => {
    switch (diff) {
      case "easy": return 10;
      case "medium": return 20;
      case "hard": return 25;
      default: return 10; // Default to easy if no difficulty set
    }
  };
  // Get comment syntax based on language
  const getCommentPrefix = (lang: string): string => {
    if (lang === "python") return "#";
    if (lang === "sql") return "--";
    // JavaScript, TypeScript, Java, C++, C#, Go, Rust all use //
    if (["javascript", "typescript", "java", "cpp", "csharp", "go", "rust"].includes(lang)) return "//";
    return "#"; // Default to Python-style
  };

  const getInstructionLine = (lang: string): string => {
    switch (lang) {
      case "python":
        return "# $ Write Your Python Code below";
      case "sql":
        return "-- Write your MySQL query statement below";
      case "javascript":
        return "// Write your JavaScript code below";
      case "typescript":
        return "// Write your TypeScript code below";
      case "java":
        return "// Write your Java code below";
      case "cpp":
        return "// Write your C++ code below";
      case "csharp":
        return "// Write your C# code below";
      case "go":
        return "// Write your Go code below";
      case "rust":
        return "// Write your Rust code below";
      default:
        return "# Write your code below";
    }
  };

  // Get starter code based on language
  const getStarterCode = (lang: string, firstTableName?: string): string => {
    const instruction = getInstructionLine(lang);
    switch (lang) {
      case "python":
        if (firstTableName) {
          return `${instruction}\nimport pandas as pd\nimport numpy as np\n\n${firstTableName}.head()`;
        }
        return `${instruction}\nimport pandas as pd\nimport numpy as np\n\nprint('Hello, World!')`;
      case "sql":
        // Use the first available table name, or a generic one
        const tableName = firstTableName || "customers";
        return `${instruction}\nSELECT * FROM ${tableName} LIMIT 5;`;
      case "javascript":
        return `${instruction}\n// console.log('Hello, World!');`;
      case "typescript":
        return `${instruction}\n// console.log('Hello, World!');`;
      case "java":
        return `${instruction}\npublic class Solution {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}`;
      case "cpp":
        return `${instruction}\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}`;
      case "csharp":
        return `${instruction}\nusing System;\n\nclass Solution {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}`;
      case "go":
        return `${instruction}\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}`;
      case "rust":
        return `${instruction}\nfn main() {\n    println!("Hello, World!");\n}`;
      default:
        return `${instruction}`;
    }
  };

  const questionTables = useMemo(() => {
    const tables = extractSqlTablesFromQuestion(question, sqlTableNames);
    return tables;
  }, [question, sqlTableNames]);

  // Generate initial code with question context
  const getInitialCode = useMemo(() => {
    if (defaultValue) return defaultValue;
    
    // Don't add question text to the compiler - just add starter code
    let initialCode = "";
    
    // Add starter code - extract table name for SQL and Python
    let firstTableName: string | undefined;
    
    // For both SQL and Python, try to get the table name from admin-provided names
    if ((language === "sql" || language === "python") && questionTables.length > 0) {
      // Use the actual table name from the parsed tables (this uses the correct priority)
      firstTableName = questionTables[0].tableName;
    } else if ((language === "sql" || language === "python") && sqlTableNames) {
      // Fallback: try to extract first table name from admin-provided names
        const names = sqlTableNames.split(',').map(n => n.trim().toLowerCase()).filter(n => n.length > 0);
      if (names.length > 0) {
        firstTableName = names[0];
      }
    } else if (language === "sql" && question) {
      // SQL-specific fallback: try to extract from question text
        const tableMatch = question.match(/(?:FROM|from|table|Table|TABLE)[:\s]+([a-zA-Z_][a-zA-Z0-9_]*)/i);
        if (tableMatch && tableMatch[1]) {
          firstTableName = tableMatch[1].toLowerCase();
        }
      }
    
    initialCode = getStarterCode(language, firstTableName);
    return initialCode;
  }, [defaultValue, question, language, sqlTableNames, questionTables]);

  const [code, setCode] = useState(getInitialCode);
  const [output, setOutput] = useState<{ columns: string[]; values: any[][] } | null>(null);
  const [textOutput, setTextOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const outputRef = useRef<{ columns: string[]; values: any[][] } | null>(null);
  const textOutputRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    outputRef.current = output;
  }, [output]);

  useEffect(() => {
    textOutputRef.current = textOutput;
  }, [textOutput]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);
  const [validationResult, setValidationResult] = useState<{ passed: boolean; message?: string } | null>(null);
  const [showXpModal, setShowXpModal] = useState(false);
  const { toast: toastHook } = useToast();

  // Debug: Log when modal state changes
  useEffect(() => {
    // track modal visibility internally if needed
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
      return false;
    }

    if (hasAwardedXP) {
      return false;
    }

    try {
      // Check if already completed
      const submissionRef = doc(firestoreDb, "userQuestionSubmissions", `${currentUser.uid}_${questionId}`);
      const submissionSnap = await getDoc(submissionRef);

      if (submissionSnap.exists() && submissionSnap.data().status === "completed") {
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

      // Award XP based on difficulty (easy: 10, medium: 20, hard: 25)
      const xpAmount = getXPForDifficulty(difficulty);
      
      // First check if user document exists
      const userRef = doc(firestoreDb, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        // Update existing user document
        await updateDoc(userRef, {
          xp: increment(xpAmount),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create new user document if it doesn't exist
        await setDoc(userRef, {
          xp: xpAmount,
          updatedAt: serverTimestamp(),
        });
      }

      setAwardedXPAmount(xpAmount);
      setHasAwardedXP(true);
      
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
      
      // Handle permission errors - show a helpful message
      if (error?.code === 'permission-denied' || error?.code === 'PERMISSION_DENIED') {
        console.error("Permission denied - check Firebase security rules for userQuestionSubmissions and users collections");
        toastHook({
          title: "Permission Error",
          description: "Unable to save completion. Please check your Firebase security rules.",
          variant: "destructive",
        });
        return false;
      }
      
      // Show toast for other errors
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
  const [availableDataframes, setAvailableDataframes] = useState<string[]>([]);
  const { toast } = useToast();
  const dbInitialized = useRef(false);
  const dbRef = useRef<Database | null>(null);
  const pyodideLoading = useRef(false);
  const pyodidePackagesLoaded = useRef<Set<string>>(new Set());

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
            message: "Your output is not matching the expected Output" 
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
            message: "Your output is not matching the expected Output" 
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
            message: "Your output is not matching the expected Output" 
          };
        }
      } else if (language === "python" && actualOutput && typeof actualOutput === "object" && "columns" in actualOutput) {
        // For Python with structured output (DataFrame converted to JSON format)
        // Expected output should be a JSON string
        try {
          const expected = JSON.parse(expectedOutput);
          
          // Compare columns
          const actualCols = actualOutput.columns.map(c => c.toLowerCase().trim());
          const expectedCols = expected.columns?.map((c: string) => c.toLowerCase().trim()) || [];
          
          if (actualCols.length !== expectedCols.length) {
            return { 
              passed: false, 
              message: "Your output is not matching the expected Output" 
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
              message: "Your output is not matching the expected Output" 
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
              message: "Your output is not matching the expected Output" 
            };
          }
        } catch (e) {
          // If expected output is not JSON, fall through to text comparison
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
            message: "Your output is not matching the expected Output" 
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
    // Extract dataframe names for Python
    if (language === "python") {
      const adminTableNamesList: string[] = sqlTableNames
        ? sqlTableNames.split(',').map(n => n.trim().toLowerCase()).filter(n => n.length > 0)
        : [];
      
      // Extract table names from question text
      const tableNamePatterns = [
        /(?:FROM|from)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
        /SQL\s+table[:\s]+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
        /(?:table|Table|TABLE)[:\s]+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
        /using\s+the\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+table/gi,
        /the\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+table/gi,
        /\b([a-zA-Z_][a-zA-Z0-9_]*)\s+table\b/gi,
      ];
      const mentionedTables: string[] = [];
      if (question) {
        tableNamePatterns.forEach(pattern => {
          pattern.lastIndex = 0;
          let m;
          while ((m = pattern.exec(question)) !== null) {
            if (m[1]) {
              const tableName = m[1].toLowerCase();
              const skipWords = ['select', 'where', 'group', 'order', 'having', 'limit', 'join', 'inner', 'left', 'right', 'outer', 'on', 'as', 'and', 'or', 'not', 'in', 'exists', 'like', 'between', 'the', 'a', 'an', 'this', 'that', 'below', 'above'];
              if (!skipWords.includes(tableName) && !mentionedTables.includes(tableName)) {
                mentionedTables.push(tableName);
              }
            }
          }
        });
      }
      
      // Combine admin names and mentioned tables, also include names from questionTables
      const allNames = new Set<string>();
      adminTableNamesList.forEach(name => allNames.add(name));
      mentionedTables.forEach(name => allNames.add(name));
      questionTables.forEach((table, i) => {
        const tableName = adminTableNamesList.length > 0 
          ? adminTableNamesList[Math.min(i, adminTableNamesList.length - 1)]
          : table.tableName;
        allNames.add(tableName);
      });
      
      setAvailableDataframes(Array.from(allNames));
    } else {
      setAvailableDataframes([]);
    }
  }, [getInitialCode, language, question, sqlTableNames, questionTables]);

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
          
          // Pre-load essential packages
          toast({
            title: "Loading Python libraries...",
            description: "This may take a few seconds on first load.",
          });
          
          try {
            await pyodideInstance.loadPackage(["numpy", "pandas"]);
            pyodidePackagesLoaded.current = new Set(["numpy", "pandas"]);
          } catch (pkgError) {
            console.warn("Could not pre-load packages:", pkgError);
          pyodidePackagesLoaded.current = new Set();
          }
          
          setPyodide(pyodideInstance);
          toast({
            title: "Python ready!",
            description: "You can now run Python code.",
          });
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
        toast({
          title: "Loading SQL environment...",
          description: "Setting up the database engine.",
        });
        
          const SQL = await initSqlJs({
            locateFile: (file) => `https://sql.js.org/dist/${file}`,
          });
        
        if (!cancelled) {
          setSqlJs(SQL);
          toast({
            title: "SQL ready!",
            description: "You can now run SQL queries.",
          });
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

  const ensurePyodidePackages = useCallback(
    async (codeSnippet: string) => {
      if (!pyodide) return true;
      const snippet = codeSnippet || "";
      
      // Extended list of supported packages in Pyodide
      const packagePatterns: Array<{ name: string; patterns: RegExp[] }> = [
        {
          name: "pandas",
          patterns: [/\bimport\s+pandas\b/i, /\bfrom\s+pandas\b/i],
        },
        {
          name: "numpy",
          patterns: [/\bimport\s+numpy\b/i, /\bfrom\s+numpy\b/i],
        },
        {
          name: "matplotlib",
          patterns: [/\bimport\s+matplotlib\b/i, /\bfrom\s+matplotlib\b/i],
        },
        {
          name: "scipy",
          patterns: [/\bimport\s+scipy\b/i, /\bfrom\s+scipy\b/i],
        },
        {
          name: "scikit-learn",
          patterns: [/\bimport\s+sklearn\b/i, /\bfrom\s+sklearn\b/i, /\bimport\s+scikit/i],
        },
        {
          name: "seaborn",
          patterns: [/\bimport\s+seaborn\b/i, /\bfrom\s+seaborn\b/i],
        },
        {
          name: "statsmodels",
          patterns: [/\bimport\s+statsmodels\b/i, /\bfrom\s+statsmodels\b/i],
        },
        {
          name: "networkx",
          patterns: [/\bimport\s+networkx\b/i, /\bfrom\s+networkx\b/i],
        },
        {
          name: "sympy",
          patterns: [/\bimport\s+sympy\b/i, /\bfrom\s+sympy\b/i],
        },
        {
          name: "pillow",
          patterns: [/\bimport\s+PIL\b/i, /\bfrom\s+PIL\b/i],
        },
        {
          name: "regex",
          patterns: [/\bimport\s+regex\b/i, /\bfrom\s+regex\b/i],
        },
        {
          name: "beautifulsoup4",
          patterns: [/\bimport\s+bs4\b/i, /\bfrom\s+bs4\b/i, /\bBeautifulSoup\b/],
        },
        {
          name: "lxml",
          patterns: [/\bimport\s+lxml\b/i, /\bfrom\s+lxml\b/i],
        },
        {
          name: "sqlalchemy",
          patterns: [/\bimport\s+sqlalchemy\b/i, /\bfrom\s+sqlalchemy\b/i],
        },
        {
          name: "openpyxl",
          patterns: [/\bimport\s+openpyxl\b/i, /\bfrom\s+openpyxl\b/i],
        },
        {
          name: "xlrd",
          patterns: [/\bimport\s+xlrd\b/i, /\bfrom\s+xlrd\b/i],
        },
      ];

      const packagesToLoad = new Set<string>();
      packagePatterns.forEach(({ name, patterns }) => {
        if (pyodidePackagesLoaded.current.has(name)) return;
        if (patterns.some((pattern) => pattern.test(snippet))) {
          packagesToLoad.add(name);
        }
      });

      if (packagesToLoad.size === 0) {
        return true;
      }

      try {
        toast({
          title: "Loading libraries...",
          description: `Installing: ${Array.from(packagesToLoad).join(", ")}`,
        });
        
        await pyodide.loadPackage(Array.from(packagesToLoad));
        packagesToLoad.forEach((pkg) => pyodidePackagesLoaded.current.add(pkg));
        
        toast({
          title: "Libraries loaded!",
          description: "Ready to run your code.",
        });
        return true;
      } catch (error) {
        console.error("Failed to load Pyodide packages:", error);
        toast({
          title: "Package installation failed",
          description: `Could not load: ${Array.from(packagesToLoad).join(", ")}. Some packages may not be available in the browser.`,
          variant: "destructive",
        });
        return false;
      }
    },
    [pyodide, toast],
  );

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
        // Try OneCompiler MySQL API first, fallback to SQLite
        let usedOnlineMySQL = false;
        
        // Generate table setup SQL from question data for online MySQL
        let setupSql = "";
        if (questionTables.length > 0) {
          questionTables.forEach((table) => {
            const tableName = table.tableName;
            const columns = table.columns;
            const values = table.values;
            
            setupSql += `DROP TABLE IF EXISTS ${tableName};\n`;
            const columnDefs = columns.map((col) => `\`${col}\` TEXT`).join(", ");
            setupSql += `CREATE TABLE \`${tableName}\` (${columnDefs});\n`;
            
            if (values.length > 0) {
              values.forEach((row) => {
                const rowValues = row.map((val) => {
                  if (val === null || val === undefined) return "NULL";
                  const escaped = String(val).replace(/'/g, "''");
                  return `'${escaped}'`;
                }).join(", ");
                setupSql += `INSERT INTO \`${tableName}\` (\`${columns.join("\`, \`")}\`) VALUES (${rowValues});\n`;
              });
            }
          });
        }

        try {
          toast({
            title: "Executing MySQL query...",
            description: "Trying OneCompiler, will use SQLite if unavailable...",
          });

          const fullSql = setupSql + "\n" + executableCode;
          
          // Use OneCompiler API for MySQL
          let response: Response;
          try {
            response = await fetch('https://onecompiler.com/api/v1/run?access_token=free', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              mode: 'cors',
              body: JSON.stringify({
                language: 'mysql',
                stdin: '',
                files: [{ name: 'main.sql', content: fullSql }],
              }),
            });
          } catch (fetchError: any) {
            // OneCompiler is blocked by CORS - same issue as Python
            // Silently fallback to SQLite (no need to show error, SQLite works fine)
            throw new Error("FALLBACK_TO_SQLITE");
          }

          if (!response.ok) {
            // If OneCompiler returns error, fallback to SQLite
            if (response.status >= 500 || response.status === 0) {
              throw new Error("FALLBACK_TO_SQLITE");
            }
            throw new Error(`OneCompiler returned ${response.status}`);
          }

          const result = await response.json();
          usedOnlineMySQL = true;

          if (result.stderr || result.exception) {
            const errorMsg = result.stderr || result.exception || "Unknown error";
            setTextOutput(`MySQL Error:\n${errorMsg}\n\nAvailable tables: ${availableTables.join(", ") || "Check table setup"}`);
            toast({
              title: "MySQL Error",
              description: "Check the output for details.",
              variant: "destructive",
            });
          } else if (result.stdout) {
            // Parse output into table format
            const outputLines = result.stdout.split("\n").filter((line: string) => line.trim());
            
            if (outputLines.length > 0) {
              const headerLine = outputLines[0];
              const columns = headerLine.split(/\t/).map((c: string) => c.trim()).filter((c: string) => c);
              
              if (columns.length > 0 && outputLines.length > 1) {
                const values = outputLines.slice(1)
                  .map((line: string) => line.split(/\t/).map((c: string) => c.trim()))
                  .filter((row: string[]) => row.length > 0 && row.some((cell: string) => cell));
                
                if (values.length > 0) {
                  setOutput({ columns, values });
                  toast({
                    title: "MySQL query executed",
                    description: `Returned ${values.length} row(s).`,
                  });
                } else {
                  setTextOutput(result.stdout || "(Query executed - no results)");
                  toast({ title: "Query executed" });
                }
              } else {
                setTextOutput(result.stdout);
                toast({ title: "Query executed" });
              }
            } else {
              setTextOutput("(Query executed successfully - no output)");
              toast({ title: "Query executed successfully" });
            }
          } else {
            setTextOutput("(Query executed successfully)");
            toast({ title: "Query executed successfully" });
          }
        } catch (onlineError: any) {
          // Fallback to SQLite (either CORS blocked or OneCompiler error)
          const isCorsFallback = onlineError.message === "FALLBACK_TO_SQLITE";
          
        if (!db) {
          toast({
              title: "SQL environment loading...",
              description: "Please wait for the database to initialize.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

          if (isCorsFallback) {
            toast({
              title: "Using SQLite (offline mode)",
              description: "OneCompiler blocked by CORS. SQLite works offline - some MySQL syntax may differ.",
            });
          } else {
            toast({
              title: "Using SQLite (offline mode)",
              description: "OneCompiler unavailable. Some MySQL syntax may differ.",
            });
        }

        // Split by semicolons to handle multiple queries
        const queries = executableCode
          .split(";")
          .map((q) => q.trim())
          .filter((q) => q.length > 0);

        if (queries.length === 0) {
          toast({
            title: "No valid query",
            description: "Please write a valid SQL query.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        let lastSelectOutput: { columns: string[]; values: any[][] } | null = null;
          const tableNames = availableTables;

        for (const originalQuery of queries) {
          let query = originalQuery;

          tableNames.forEach((tableName) => {
            const escapedTableName = tableName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(`\\b${escapedTableName}\\b`, "gi");
            query = query.replace(regex, `"${tableName}"`);
          });

            query = query.replace(/`/g, '"');

            // Convert MySQL functions to SQLite equivalents
            // MONTH(date) → CAST(strftime('%m', date) AS INTEGER)
            query = query.replace(/\bMONTH\s*\(\s*([^)]+)\s*\)/gi, "CAST(strftime('%m', $1) AS INTEGER)");
            // YEAR(date) → CAST(strftime('%Y', date) AS INTEGER)
            query = query.replace(/\bYEAR\s*\(\s*([^)]+)\s*\)/gi, "CAST(strftime('%Y', $1) AS INTEGER)");
            // DAY(date) → CAST(strftime('%d', date) AS INTEGER)
            query = query.replace(/\bDAY\s*\(\s*([^)]+)\s*\)/gi, "CAST(strftime('%d', $1) AS INTEGER)");
            // NOW() → datetime('now')
            query = query.replace(/\bNOW\s*\(\s*\)/gi, "datetime('now')");
            // CURDATE() → date('now')
            query = query.replace(/\bCURDATE\s*\(\s*\)/gi, "date('now')");
            // CURRENT_DATE() → date('now')
            query = query.replace(/\bCURRENT_DATE\s*\(\s*\)/gi, "date('now')");
            // CURRENT_TIMESTAMP() → datetime('now')
            query = query.replace(/\bCURRENT_TIMESTAMP\s*\(\s*\)/gi, "datetime('now')");
            // DATEDIFF(date1, date2) → CAST(julianday(date1) - julianday(date2) AS INTEGER)
            query = query.replace(/\bDATEDIFF\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/gi, "CAST(julianday($1) - julianday($2) AS INTEGER)");
            // DATE_ADD(date, INTERVAL n unit) - basic support
            query = query.replace(/\bDATE_ADD\s*\(\s*([^,]+)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi, "date($1, '+$2 days')");
            query = query.replace(/\bDATE_ADD\s*\(\s*([^,]+)\s*,\s*INTERVAL\s+(\d+)\s+MONTH\s*\)/gi, "date($1, '+$2 months')");
            query = query.replace(/\bDATE_ADD\s*\(\s*([^,]+)\s*,\s*INTERVAL\s+(\d+)\s+YEAR\s*\)/gi, "date($1, '+$2 years')");
            // CONCAT(a, b, ...) → a || b || ...
            query = query.replace(/\bCONCAT\s*\(([^)]+)\)/gi, (match, args) => {
              const parts = args.split(',').map((p: string) => p.trim());
              return `(${parts.join(' || ')})`;
            });
            // SUBSTRING(str, start, length) → SUBSTR(str, start, length)
            query = query.replace(/\bSUBSTRING\s*\(/gi, "SUBSTR(");
            // LOCATE(substr, str) → INSTR(str, substr) - note: args swapped
            query = query.replace(/\bLOCATE\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/gi, "INSTR($2, $1)");
            // LCASE/UCASE → LOWER/UPPER
            query = query.replace(/\bLCASE\s*\(/gi, "LOWER(");
            query = query.replace(/\bUCASE\s*\(/gi, "UPPER(");

            try {
          const isSelectQuery = isSelectLikeSql(query);

          if (isSelectQuery) {
            const resultSets = db.exec(query);
            if (resultSets.length > 0) {
              const finalResult = resultSets[resultSets.length - 1];
              lastSelectOutput = {
                columns: finalResult.columns,
                values: finalResult.values,
              };
            } else {
              lastSelectOutput = { columns: [], values: [] };
            }
          } else {
            db.run(query);
              }
            } catch (sqliteError: any) {
              const errorMsg = sqliteError.message || String(sqliteError);
              let helpfulMessage = errorMsg;
              
              if (errorMsg.includes("no such table")) {
                const tableMatch = errorMsg.match(/no such table:\s*(\w+)/i);
                const missingTable = tableMatch ? tableMatch[1] : "unknown";
                helpfulMessage = `Table "${missingTable}" not found. Available: ${tableNames.join(", ") || "none"}`;
              } else if (errorMsg.includes("no such column")) {
                helpfulMessage = `Column not found. Check your column names.`;
              } else if (errorMsg.includes("syntax error")) {
                helpfulMessage = `SQL syntax error. This uses SQLite - some MySQL syntax may not work.`;
              }
              
              setTextOutput(`SQL Error (SQLite): ${helpfulMessage}\n\nOriginal: ${errorMsg}\n\nTables: ${tableNames.join(", ") || "None"}`);
              toast({
                title: "SQL Error",
                description: helpfulMessage.split("\n")[0],
                variant: "destructive",
              });
              setLoading(false);
              return;
          }
        }

        if (lastSelectOutput) {
          setOutput(lastSelectOutput);
          setValidationResult(null);
          toast({
              title: "Query executed (SQLite)",
            description: `Returned ${lastSelectOutput.values.length} row(s).`,
          });
        } else {
          setOutput({ columns: ["Status"], values: [["Query executed successfully"]] });
            toast({ title: "Query executed" });
          }
        }
      } else if (language === "python") {
        // Try OneCompiler first, but it may be blocked by CORS
        // If blocked, automatically fallback to Pyodide (in-browser Python)
          toast({
          title: "Executing Python...",
          description: "Trying OneCompiler, will use in-browser Python if unavailable...",
        });

        try {
          // Build Python code with imports and table setup
          let pythonCode = `# Import all commonly used libraries
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn import *
import scipy
import statsmodels.api as sm
import json
import builtins

# Override print to automatically convert DataFrames to JSON format
_original_print = builtins.print
def print(*args, **kwargs):
    for arg in args:
        if isinstance(arg, pd.DataFrame):
            # Convert DataFrame to JSON format for structured output
            df_dict = arg.to_dict('records')
            # Convert values, handling integers (remove .0 from floats that are actually integers)
            def format_value(v):
                if v is None:
                    return ''
                if isinstance(v, (int, float)):
                    # If it's a float that's actually an integer, return as integer
                    if isinstance(v, float) and v.is_integer():
                        return int(v)
                    return v
                return str(v)
            df_json = json.dumps({
                "columns": list(arg.columns),
                "values": [[format_value(v) for v in row.values()] for row in df_dict]
            })
            # Output on separate lines for proper regex matching
            _original_print("__PYTHON_DF_JSON__")
            _original_print(df_json)
        else:
            _original_print(arg, **kwargs)

`;

          // Parse admin-provided table names (comma-separated) - ALWAYS prioritize these
          const adminTableNamesList: string[] = sqlTableNames
            ? sqlTableNames.split(',').map(n => n.trim().toLowerCase()).filter(n => n.length > 0)
            : [];

          // Pre-load table data as pandas DataFrames from question
          if (questionTables.length > 0) {
            for (let i = 0; i < questionTables.length; i++) {
              const table = questionTables[i];
              // Use admin-provided name if available, otherwise use parsed name
              const tableName = adminTableNamesList.length > 0 
                ? adminTableNamesList[Math.min(i, adminTableNamesList.length - 1)]
                : table.tableName;
              
              const columns = table.columns;
              const values = table.values;
              
              // Build data dictionary for DataFrame
              const dataDict: Record<string, any[]> = {};
              columns.forEach((col, colIdx) => {
                dataDict[col] = values.map(row => {
                  const val = row[colIdx];
                  if (val === null || val === undefined) return null;
                  // Try to convert to number if possible
                  const numVal = Number(val);
                  if (!isNaN(numVal) && String(val).trim() !== '') {
                    return numVal;
                  }
                  return String(val);
                });
              });
              
              const jsonData = JSON.stringify(dataDict).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
              pythonCode += `
# Load ${tableName} DataFrame
import json
_temp_data = json.loads('''${jsonData}''')
${tableName} = pd.DataFrame(_temp_data)
del _temp_data
`;
            }
            
            const finalTableNames = questionTables.map((table, i) => 
              adminTableNamesList.length > 0 
                ? adminTableNamesList[Math.min(i, adminTableNamesList.length - 1)]
                : table.tableName
            );
            
            // Create 'df' as an alias to the first DataFrame for convenience
            if (finalTableNames.length > 0) {
              const firstName = finalTableNames[0];
              pythonCode += `\n# Create 'df' as alias to first DataFrame (${firstName})\ndf = ${firstName}\n`;
            }
            
          toast({
              title: "DataFrames loaded",
              description: `Available: ${finalTableNames.length > 0 ? `df, ${finalTableNames.join(", ")}` : "None"}`,
            });
          } else if (adminTableNamesList.length > 0) {
            // Create empty DataFrames from admin-provided table names
            for (const tableName of adminTableNamesList) {
              pythonCode += `\n# Create empty DataFrame: ${tableName}\n${tableName} = pd.DataFrame()\n`;
            }
            // Create 'df' as an alias to the first DataFrame
            if (adminTableNamesList.length > 0) {
              pythonCode += `\n# Create 'df' as alias to first DataFrame (${adminTableNamesList[0]})\ndf = ${adminTableNamesList[0]}\n`;
            }
            toast({
              title: "Note: Empty DataFrames",
              description: `Created: df, ${adminTableNamesList.join(", ")}. Data from question not parsed.`,
            variant: "destructive",
          });
          }

          // Add user's code
          pythonCode += `\n# User's code\n${executableCode}\n`;

          // Try to capture last expression result if no output
          const lastLine = executableCode.trim().split('\n').pop() || '';
          const isExpression = lastLine && 
            !lastLine.includes('=') && 
            !lastLine.startsWith('print') && 
            !lastLine.startsWith('#') && 
            !lastLine.startsWith('import') && 
            !lastLine.startsWith('from') &&
            !lastLine.startsWith('if') &&
            !lastLine.startsWith('for') &&
            !lastLine.startsWith('while') &&
            !lastLine.startsWith('def') &&
            !lastLine.startsWith('class') &&
            lastLine.trim().length > 0;
          
          // Check if expected output is JSON format (for DataFrame comparison)
          let expectsJsonOutput = false;
          try {
            if (expectedOutput) {
              const parsed = JSON.parse(expectedOutput);
              if (parsed && typeof parsed === 'object' && Array.isArray(parsed.columns) && Array.isArray(parsed.values)) {
                expectsJsonOutput = true;
        }
            }
          } catch {
            // Not JSON format
          }
          
          if (isExpression) {
            if (expectsJsonOutput) {
              // For JSON expected output, try to get DataFrame as JSON
              pythonCode += `
# Capture last expression result as JSON (for DataFrame comparison)
import json
try:
    _last_result = ${lastLine}
    if _last_result is not None:
        if hasattr(_last_result, 'to_dict'):
            # DataFrame - convert to JSON format
            _df_dict = _last_result.to_dict('records')
            _df_json = json.dumps({"columns": list(_last_result.columns), "values": [[str(v) for v in row.values()] for row in _df_dict]}, indent=2)
            print("__PYTHON_DF_JSON__")
            print(_df_json)
        elif hasattr(_last_result, 'to_string'):
            print(_last_result.to_string())
        elif hasattr(_last_result, '__str__'):
            print(str(_last_result))
        else:
            print(_last_result)
except:
    pass
`;
            } else {
              // Regular text output
              pythonCode += `
# Capture last expression result
try:
    _last_result = ${lastLine}
    if _last_result is not None:
        if hasattr(_last_result, 'to_string'):
            print(_last_result.to_string())
        elif hasattr(_last_result, '__str__'):
            print(str(_last_result))
        else:
            print(_last_result)
except:
    pass
`;
            }
          }


          // Use OneCompiler API for Python
          let response: Response;
          try {
            response = await fetch('https://onecompiler.com/api/v1/run?access_token=free', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              mode: 'cors',
              body: JSON.stringify({
                language: 'python3',
                stdin: '',
                files: [{ name: 'main.py', content: pythonCode }],
              }),
            });
          } catch (fetchError: any) {
            // OneCompiler is blocked by CORS (Cross-Origin Resource Sharing)
            // This is a browser security feature - OneCompiler's API doesn't allow requests from other domains
            // Automatically fallback to Pyodide (in-browser Python)
            if (pyodide) {
              toast({
                title: "OneCompiler blocked (CORS)",
                description: "Using in-browser Python (Pyodide) instead. This is normal and works offline!",
              });
              throw new Error("FALLBACK_TO_PYODIDE");
            } else {
              // If Pyodide isn't loaded yet, provide helpful error message
              throw new Error(`OneCompiler is blocked by browser CORS policy.\n\nThis is a security restriction - OneCompiler's API doesn't allow requests from other websites.\n\nPlease wait for Pyodide to load, or refresh the page.\n\nOriginal error: ${fetchError.message || "CORS blocked"}`);
            }
          }

          if (!response.ok) {
            // If OneCompiler returns error, try Pyodide fallback
            if (pyodide && response.status >= 500) {
              toast({
                title: "OneCompiler error",
                description: "Falling back to in-browser Python (Pyodide).",
              });
              throw new Error("FALLBACK_TO_PYODIDE");
            }
            throw new Error(`OneCompiler returned ${response.status}`);
          }

          const result = await response.json();
          let outputText = "";
          let hasError = false;
          let structuredOutput: { columns: string[]; values: any[][] } | null = null;

          if (result.stderr || result.exception) {
            hasError = true;
            const errorMsg = result.stderr || result.exception || "Unknown error";
            
            // Provide helpful error messages
            let formattedError = errorMsg;
            if (errorMsg.includes("ModuleNotFoundError") || errorMsg.includes("No module named")) {
              const moduleMatch = errorMsg.match(/No module named ['"]([\w.-]+)['"]/);
              const moduleName = moduleMatch ? moduleMatch[1] : "unknown";
              formattedError = `Module "${moduleName}" is not available.\n\nAvailable libraries: pandas, numpy, matplotlib, seaborn, scikit-learn, scipy, statsmodels, sympy, networkx, pillow, beautifulsoup4, lxml, regex, requests, and more.\n\nOriginal error:\n${errorMsg}`;
            } else if (errorMsg.includes("NameError")) {
              // Use admin-provided names if available, otherwise use parsed names
              const adminTableNamesList: string[] = sqlTableNames
                ? sqlTableNames.split(',').map(n => n.trim().toLowerCase()).filter(n => n.length > 0)
                : [];
              const availableDFs = adminTableNamesList.length > 0
                ? adminTableNamesList.join(", ")
                : questionTables.map(t => t.tableName).join(", ");
              const allDFs = availableDFs || (sqlTableNames ? sqlTableNames.split(',').map(n => n.trim()).filter(n => n).join(", ") : "");
              formattedError = `NameError: Variable or function not defined.\n\n${allDFs ? `Available DataFrames: ${allDFs}\n\n` : ""}${errorMsg}`;
            } else if (errorMsg.includes("SyntaxError")) {
              formattedError = `SyntaxError: Check your Python syntax.\n\n${errorMsg}`;
            } else if (errorMsg.includes("TypeError")) {
              formattedError = `TypeError: Wrong type used.\n\n${errorMsg}`;
            } else if (errorMsg.includes("KeyError")) {
              formattedError = `KeyError: Column/key not found. Check column names.\n\n${errorMsg}`;
            }
            
            outputText = `Error:\n${formattedError}`;
          } else if (result.stdout) {
            outputText = result.stdout.trim();
            
            // Check if output contains DataFrame JSON format
            if (outputText.includes("__PYTHON_DF_JSON__")) {
              try {
                const jsonMatch = outputText.match(/__PYTHON_DF_JSON__\s*(\{[\s\S]*\})/);
                if (jsonMatch && jsonMatch[1]) {
                  const dfJson = JSON.parse(jsonMatch[1]);
                  if (dfJson.columns && dfJson.values) {
                    structuredOutput = {
                      columns: dfJson.columns,
                      values: dfJson.values
                    };
                    // Keep text output for display but also set structured output
                    outputText = outputText.replace(/__PYTHON_DF_JSON__\s*\{[\s\S]*\}/, '').trim() || outputText;
                  }
                }
              } catch (e) {
                // If JSON parsing fails, try to parse as DataFrame print output
              }
            }
            
            // If no structured output yet, try to parse DataFrame print format
            if (!structuredOutput && outputText) {
              const parsedDF = parseDataFrameOutput(outputText);
              if (parsedDF) {
                structuredOutput = parsedDF;
              }
            }
            
            if (!outputText) {
              outputText = "(No output - code ran but didn't print anything)";
            }
          } else {
            outputText = "(Code executed successfully - no output)";
          }

          setTextOutput(outputText);
          setOutput(structuredOutput);
          setValidationResult(null);
          
          if (hasError) {
            toast({
              title: "Python Error",
              description: "Check the output for details.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Code executed successfully",
              description: "Check the output below.",
            });
          }
        } catch (error: any) {
          let errorMsg = error.message || String(error);
          
          // Fallback to Pyodide if OneCompiler fails
          if (errorMsg === "FALLBACK_TO_PYODIDE" && pyodide) {
            try {
              // Use Pyodide as fallback
        const packagesReady = await ensurePyodidePackages(executableCode);
        if (!packagesReady) {
          setLoading(false);
          return;
        }

        let outputText = "";
              let hasError = false;
              
              // Reset stdout/stderr capture
        pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
`);

        try {
                // Always import pandas and numpy
                pyodide.runPython(`import pandas as pd\nimport numpy as np\nimport json\nimport builtins`);
                
                // Override print to automatically convert DataFrames to JSON format
                pyodide.runPython(`
_original_print = builtins.print
def print(*args, **kwargs):
    for arg in args:
        if isinstance(arg, pd.DataFrame):
            # Convert DataFrame to JSON format for structured output
            df_dict = arg.to_dict('records')
            # Convert values, handling integers (remove .0 from floats that are actually integers)
            def format_value(v):
                if v is None:
                    return ''
                if isinstance(v, (int, float)):
                    # If it's a float that's actually an integer, return as integer
                    if isinstance(v, float) and v.is_integer():
                        return int(v)
                    return v
                return str(v)
            df_json = json.dumps({
                "columns": list(arg.columns),
                "values": [[format_value(v) for v in row.values()] for row in df_dict]
            })
            # Output on separate lines for proper regex matching
            _original_print("__PYTHON_DF_JSON__")
            _original_print(df_json)
        else:
            _original_print(arg, **kwargs)
`);
                
                // Parse admin-provided table names (comma-separated) - ALWAYS prioritize these
                const adminTableNamesList: string[] = sqlTableNames
                  ? sqlTableNames.split(',').map(n => n.trim().toLowerCase()).filter(n => n.length > 0)
                  : [];
                
                // Pre-load table data as pandas DataFrames from question
                const dataframeNames: string[] = [];
                if (questionTables.length > 0) {
                  for (let i = 0; i < questionTables.length; i++) {
                    const table = questionTables[i];
                    // Use admin-provided name if available, otherwise use parsed name
                    const tableName = adminTableNamesList.length > 0 
                      ? adminTableNamesList[Math.min(i, adminTableNamesList.length - 1)]
                      : table.tableName;
                    
                    dataframeNames.push(tableName);
                    
                    const columns = table.columns;
                    const values = table.values;
                    
                    // Build data dictionary for DataFrame
                    const dataDict: Record<string, any[]> = {};
                    columns.forEach((col, colIdx) => {
                      dataDict[col] = values.map(row => {
                        const val = row[colIdx];
                        if (val === null || val === undefined) return null;
                        const numVal = Number(val);
                        if (!isNaN(numVal) && String(val).trim() !== '') return numVal;
                        return String(val);
                      });
                    });
                    
                    const jsonData = JSON.stringify(dataDict);
                    pyodide.runPython(`
import json
_temp_data = json.loads('''${jsonData.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}''')
${tableName} = pd.DataFrame(_temp_data)
del _temp_data
`);
                  }
                  
                  // Create 'df' as an alias to the first DataFrame for convenience
                  if (questionTables.length > 0) {
                    const firstName = adminTableNamesList.length > 0 
                      ? adminTableNamesList[0]
                      : questionTables[0].tableName;
                    pyodide.runPython(`# Create 'df' as alias to first DataFrame (${firstName})\ndf = ${firstName}`);
                    if (!dataframeNames.includes('df')) {
                      dataframeNames.push('df');
                    }
                  }
                  setAvailableDataframes(dataframeNames);
                } else if (adminTableNamesList.length > 0) {
                  // Create empty DataFrames from admin-provided table names
                  for (const tableName of adminTableNamesList) {
                    dataframeNames.push(tableName);
                    pyodide.runPython(`${tableName} = pd.DataFrame()`);
                  }
                  // Create 'df' as an alias to the first DataFrame
                  if (adminTableNamesList.length > 0) {
                    pyodide.runPython(`# Create 'df' as alias to first DataFrame (${adminTableNamesList[0]})\ndf = ${adminTableNamesList[0]}`);
                    if (!dataframeNames.includes('df')) {
                      dataframeNames.push('df');
                    }
                  }
                  setAvailableDataframes(dataframeNames);
                } else {
                  setAvailableDataframes([]);
                }

                // Execute user's Python code
          pyodide.runPython(executableCode);
                
                // Get output
          outputText = pyodide.runPython("sys.stdout.getvalue()");
                const stderrOutput = pyodide.runPython("sys.stderr.getvalue()");
                
                // Check if expected output is JSON format (for DataFrame comparison)
                let expectsJsonOutput = false;
                try {
                  if (expectedOutput) {
                    const parsed = JSON.parse(expectedOutput);
                    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.columns) && Array.isArray(parsed.values)) {
                      expectsJsonOutput = true;
                    }
                  }
                } catch {
                  // Not JSON format
                }
                
                // If no stdout but code might return a value, try to get last expression
                if (!outputText && !stderrOutput) {
                  try {
                    const lastLine = executableCode.trim().split('\n').pop() || '';
                    if (lastLine && !lastLine.includes('=') && !lastLine.startsWith('print') && !lastLine.startsWith('#')) {
                      if (expectsJsonOutput) {
                        // Try to get DataFrame as JSON
                        pyodide.runPython(`
import json
try:
    _result = ${lastLine}
    if _result is not None:
        if hasattr(_result, 'to_dict'):
            _df_dict = _result.to_dict('records')
            _df_json = json.dumps({"columns": list(_result.columns), "values": [[str(v) for v in row.values()] for row in _df_dict]}, indent=2)
            print("__PYTHON_DF_JSON__")
            print(_df_json)
        elif hasattr(_result, 'to_string'):
            print(_result.to_string())
        else:
            print(_result)
except:
    pass
`);
                      } else {
                        pyodide.runPython(`
try:
    _result = ${lastLine}
    if _result is not None:
        if hasattr(_result, 'to_string'):
            print(_result.to_string())
        else:
            print(_result)
except:
    pass
`);
                      }
                      outputText = pyodide.runPython("sys.stdout.getvalue()");
                    }
                  } catch (e) {
                    // Ignore
                  }
                }
                
                if (stderrOutput && !outputText) {
                  outputText = stderrOutput;
                  hasError = true;
                } else if (stderrOutput) {
                  outputText = `${outputText}\n\nWarnings:\n${stderrOutput}`;
                }
                
              } catch (pyError: any) {
                hasError = true;
                let pyErrorMsg = pyError.message || String(pyError);
                
                if (pyErrorMsg.includes("ModuleNotFoundError") || pyErrorMsg.includes("No module named")) {
                  const moduleMatch = pyErrorMsg.match(/No module named ['"]([\w.-]+)['"]/);
                  const moduleName = moduleMatch ? moduleMatch[1] : "unknown";
                  pyErrorMsg = `Module "${moduleName}" is not available.\n\nAvailable: pandas, numpy, scipy, matplotlib, seaborn, scikit-learn, statsmodels, sympy, networkx, pillow, beautifulsoup4, lxml, regex\n\nNote: requests, tensorflow, torch are NOT available in browser Python.`;
                } else if (pyErrorMsg.includes("NameError")) {
                  // Use admin-provided names if available, otherwise use parsed names
                  const adminTableNamesList: string[] = sqlTableNames
                    ? sqlTableNames.split(',').map(n => n.trim().toLowerCase()).filter(n => n.length > 0)
                    : [];
                  const availableDFs = adminTableNamesList.length > 0
                    ? adminTableNamesList.join(", ")
                    : questionTables.map(t => t.tableName).join(", ");
                  const allDFs = availableDFs || (sqlTableNames ? sqlTableNames.split(',').map(n => n.trim()).filter(n => n).join(", ") : "");
                  pyErrorMsg = `NameError: Variable or function not defined.\n\n${allDFs ? `Available DataFrames: ${allDFs}\n\n` : ""}${pyErrorMsg}`;
                }
                
                outputText = `Error:\n${pyErrorMsg}`;
              }

              // Check if output contains DataFrame JSON format
              let structuredOutput: { columns: string[]; values: any[][] } | null = null;
              if (outputText && outputText.includes("__PYTHON_DF_JSON__")) {
                try {
                  const jsonMatch = outputText.match(/__PYTHON_DF_JSON__\s*(\{[\s\S]*\})/);
                  if (jsonMatch && jsonMatch[1]) {
                    const dfJson = JSON.parse(jsonMatch[1]);
                    if (dfJson.columns && dfJson.values) {
                      structuredOutput = {
                        columns: dfJson.columns,
                        values: dfJson.values
                      };
                      // Clean up text output
                      outputText = outputText.replace(/__PYTHON_DF_JSON__\s*\{[\s\S]*\}/, '').trim() || outputText;
                    }
                  }
                } catch (e) {
                  // If JSON parsing fails, try to parse as DataFrame print output
                }
              }
              
              // If no structured output yet, try to parse DataFrame print format
              if (!structuredOutput && outputText) {
                const parsedDF = parseDataFrameOutput(outputText);
                if (parsedDF) {
                  structuredOutput = parsedDF;
                }
              }
              
              const finalOutput = outputText || "(No output - code ran but didn't print anything)";
        setTextOutput(finalOutput);
              setOutput(structuredOutput);
        setValidationResult(null);
              
              if (hasError) {
        toast({
                  title: "Python Error",
                  description: "Check the output for details.",
                  variant: "destructive",
                });
              } else {
                toast({
                  title: "Code executed successfully",
                  description: "Executed using in-browser Python (Pyodide).",
                });
              }
              setLoading(false);
              return;
            } catch (pyodideError: any) {
              errorMsg = `OneCompiler unavailable and Pyodide failed: ${pyodideError.message || String(pyodideError)}`;
            }
          }
          
          // Handle network errors
          if (errorMsg.includes("fetch") || errorMsg.includes("network") || errorMsg.includes("Failed to fetch")) {
            if (pyodide) {
              errorMsg = `OneCompiler network error. Please try again or the system will use in-browser Python.\n\nOriginal error: ${errorMsg}`;
            } else {
              errorMsg = `Network Error: Could not connect to OneCompiler.\n\nPlease check your internet connection and try again.\n\nOriginal error: ${errorMsg}`;
            }
          }
          
          setTextOutput(`Error:\n${errorMsg}`);
          setValidationResult(null);
          toast({
            title: "Execution Failed",
            description: "Could not execute Python code. Check the output for details.",
            variant: "destructive",
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
          // Clear validation result when just running code
          setValidationResult(null);
          toast({
            title: "Code executed",
            description: outputText ? "Check the output below." : "Code ran successfully with no output.",
          });
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
          // Clear validation result when just running code
          setValidationResult(null);
          toast({
            title: "Code executed",
            description: "TypeScript executed as JavaScript. Full type checking not available.",
          });
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
          // Clear validation result when just running code
          setValidationResult(null);
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

  const handleCheckAnswer = async () => {
    if (!expectedOutput) {
      toast({
        title: "No Expected Output",
        description: "This question doesn't have an expected output to check against.",
        variant: "default",
      });
      return;
    }

    // First, run the code automatically if not already running
    if (loading) {
      return; // Already running
    }

    // Store the current output state before running
    const previousOutput = output;
    const previousTextOutput = textOutput;

    // Run the code
    await handleRun();

    // Wait for the execution to complete and state to update
    // Use a polling approach to check when loading is false and output is set
    const maxAttempts = 50; // Maximum 5 seconds (50 * 100ms)
    let attempts = 0;

    const checkInterval = setInterval(() => {
      attempts++;
      
      // Check if loading is done using refs to get current values
      const currentLoading = loadingRef.current;
      const currentOutput = outputRef.current;
      const currentTextOutput = textOutputRef.current;
      
      if (attempts >= maxAttempts || (!currentLoading && (currentOutput !== previousOutput || currentTextOutput !== previousTextOutput))) {
        clearInterval(checkInterval);
        
        // Use a small delay to ensure React state has fully updated
        setTimeout(() => {
          // Get the latest output values
          const finalOutput = outputRef.current;
          const finalTextOutput = textOutputRef.current;
          
          if (!finalOutput && !finalTextOutput) {
            toast({
              title: "No Output",
              description: "Code execution did not produce any output.",
              variant: "default",
            });
            return;
          }

          // Validate the current output against expected output
          const validation = compareOutputs(finalOutput || finalTextOutput, expectedOutput);
          setValidationResult(validation);

          if (validation.passed) {
            toast({
              title: "✓ Solution Correct!",
              description: validation.message || "Your output matches the expected result.",
            });
            // Track completion and award XP
            if (questionId && currentUser) {
              trackQuestionCompletion(questionId).then((xpAwarded) => {
                if (xpAwarded) {
                  setShowXpModal(true);
                }
              }).catch((error) => {
                console.error("Error in trackQuestionCompletion:", error);
              });
            }
          } else {
            toast({
              title: "Solution Incorrect",
              description: "Your output does not match the Expected output",
              variant: "destructive",
            });
          }
        }, 200);
      }
    }, 100);
  };

  return (
    <div className={hideOutput ? "h-full flex flex-col" : "space-y-4"}>
      <div className={`${hideOutput ? "flex-1 flex flex-col min-h-0" : ""}`}>
        <div className="flex items-center justify-between px-4 py-2 bg-background border-b border-border/30 gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 border border-primary/20">
              <Code2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground hover:text-foreground !text-foreground">
            {language.toUpperCase()} Editor
          </span>
          </div>
          <div className="flex items-center gap-2">
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
            {expectedOutput && (
              <Button
                onClick={handleCheckAnswer}
                disabled={loading || (language === "sql" && !db) || (language === "python" && !pyodide)}
                size="sm"
                className="gap-2 text-sm h-9 px-4 bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all"
                title="Run code and check if output matches expected result"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Check Answer</span>
                  </>
                )}
              </Button>
            )}
          </div>
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
        {language === "python" && availableDataframes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-2 text-xs border-b border-border/50 bg-muted/20">
            <span className="text-muted-foreground">Dataframe available:</span>
            {availableDataframes.map((name) => (
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
        <div className={`border-2 rounded-xl overflow-hidden shadow-lg relative ${
          validationResult.passed 
            ? "border-green-500/60 bg-gradient-to-br from-green-500/15 to-green-500/5" 
            : "border-red-500/60 bg-gradient-to-br from-red-500/15 to-red-500/5"
        }`}>
          <button
            onClick={() => setValidationResult(null)}
            className="absolute right-2 top-2 rounded-md p-1 hover:bg-background/20 transition-colors z-10"
            aria-label="Close validation result"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
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
              +{awardedXPAmount} XP
            </DialogTitle>
            <DialogDescription className="text-base">
              Question completed! Keep solving to climb the leaderboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              XP earned: Easy (10), Medium (20), Hard (25). Check the leaderboard to see how you rank.
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

