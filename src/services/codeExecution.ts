// Code execution service using Piston API (FREE) or Judge0 API
// Supports: C++, Java, C#, Go, Rust, and many other languages

// Piston API types (FREE - No API key required)
interface PistonExecutionRequest {
  language: string;
  version: string;
  files: Array<{
    content: string;
  }>;
  stdin?: string;
}

interface PistonExecutionResponse {
  run: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
}

// Judge0 API types
interface ExecutionRequest {
  source_code: string;
  language_id: number;
  stdin?: string;
  expected_output?: string;
}

interface ExecutionResponse {
  token: string;
}

interface ExecutionResult {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: {
    id: number;
    description: string;
  };
  time: string | null;
  memory: number | null;
}

// Piston API language mapping (FREE - No API key required)
export const PISTON_LANGUAGES: { [key: string]: { name: string; version: string } } = {
  cpp: { name: 'cpp', version: '10.2.0' },
  c: { name: 'c', version: '10.2.0' },
  java: { name: 'java', version: '15.0.2' },
  csharp: { name: 'csharp', version: '5.0.201' },
  go: { name: 'go', version: '1.16.2' },
  rust: { name: 'rust', version: '1.68.2' },
  python: { name: 'python', version: '3.10.0' },
  javascript: { name: 'javascript', version: '18.15.0' },
  typescript: { name: 'typescript', version: '5.0.3' },
  php: { name: 'php', version: '8.2.3' },
  ruby: { name: 'ruby', version: '3.0.1' },
  swift: { name: 'swift', version: '5.3.3' },
  kotlin: { name: 'kotlin', version: '1.9.0' },
  scala: { name: 'scala', version: '3.2.1' },
  perl: { name: 'perl', version: '5.34.0' },
  r: { name: 'r', version: '4.3.0' },
  bash: { name: 'bash', version: '5.2.0' },
  // Note: SQL is handled separately using sql.js (browser-based)
};

// Language ID mapping for Judge0 API
export const LANGUAGE_IDS: { [key: string]: number } = {
  cpp: 54,        // C++ (GCC 9.2.0)
  c: 50,          // C (GCC 9.2.0)
  java: 62,       // Java (OpenJDK 13.0.1)
  csharp: 51,     // C# (Mono 6.6.0.161)
  go: 60,         // Go (1.13.5)
  rust: 73,       // Rust (1.40.0)
  python: 71,     // Python (3.8.1)
  javascript: 63, // Node.js (12.14.0)
  typescript: 74, // TypeScript (3.7.4)
  php: 68,        // PHP (7.4.1)
  ruby: 72,       // Ruby (2.7.0)
  swift: 83,      // Swift (5.2.3)
  kotlin: 78,     // Kotlin (1.3.70)
  scala: 81,      // Scala (2.13.2)
  perl: 85,       // Perl (5.28.1)
  r: 80,          // R (4.0.0)
  bash: 46,       // Bash (5.0.0)
  sql: 82,        // SQL (SQLite 3.27.2)
};

// Determine which execution service to use
export const getExecutionService = (): 'piston' | 'judge0' => {
  // Check if user explicitly wants to use Judge0
  const useJudge0 = import.meta.env.VITE_USE_JUDGE0 === 'true';
  const rapidApiKey = import.meta.env.VITE_RAPIDAPI_KEY;
  const judge0Url = import.meta.env.VITE_JUDGE0_URL;
  
  // If Judge0 is explicitly configured, use it
  if (useJudge0 || rapidApiKey || judge0Url) {
    return 'judge0';
  }
  
  // Default to Piston (FREE, no API key needed)
  return 'piston';
};

// Get Judge0 API endpoint (can be self-hosted or use RapidAPI)
const getJudge0Endpoint = (): string => {
  // Option 1: Use RapidAPI Judge0 (requires RapidAPI key)
  const rapidApiKey = import.meta.env.VITE_RAPIDAPI_KEY;
  if (rapidApiKey) {
    return 'https://judge0-ce.p.rapidapi.com';
  }
  
  // Option 2: Use self-hosted Judge0 instance
  const judge0Url = import.meta.env.VITE_JUDGE0_URL;
  if (judge0Url) {
    return judge0Url;
  }
  
  // Option 3: Use public Judge0 instance (limited, may have rate limits)
  return 'https://ce.judge0.com';
};

const getHeaders = (): HeadersInit => {
  const rapidApiKey = import.meta.env.VITE_RAPIDAPI_KEY;
  const judge0AuthToken = import.meta.env.VITE_JUDGE0_AUTH_TOKEN;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (rapidApiKey) {
    // Using RapidAPI
    headers['X-RapidAPI-Key'] = rapidApiKey;
    headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
  } else if (judge0AuthToken) {
    // Using self-hosted with auth token
    headers['Authorization'] = `Bearer ${judge0AuthToken}`;
  }
  
  return headers;
};

// Submit code for execution
export const submitCode = async (
  sourceCode: string,
  language: string,
  stdin?: string
): Promise<string> => {
  const languageId = LANGUAGE_IDS[language.toLowerCase()];
  
  if (!languageId) {
    throw new Error(`Language ${language} is not supported`);
  }
  
  const endpoint = getJudge0Endpoint();
  const url = `${endpoint}/submissions?base64_encoded=false&wait=false`;
  
  const requestBody: ExecutionRequest = {
    source_code: sourceCode,
    language_id: languageId,
    stdin: stdin || '',
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(requestBody),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to submit code: ${response.status} ${errorText}`);
  }
  
  const data: ExecutionResponse = await response.json();
  return data.token;
};

// Get execution result
export const getExecutionResult = async (token: string): Promise<ExecutionResult> => {
  const endpoint = getJudge0Endpoint();
  const url = `${endpoint}/submissions/${token}?base64_encoded=false`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get result: ${response.status}`);
  }
  
  const result: ExecutionResult = await response.json();
  return result;
};

// Execute code using Piston API (FREE - No API key required)
const executeCodePiston = async (
  sourceCode: string,
  language: string,
  stdin?: string
): Promise<{ output: string; error: string | null; time: string | null; memory: number | null }> => {
  const langInfo = PISTON_LANGUAGES[language.toLowerCase()];
  
  if (!langInfo) {
    throw new Error(`Language ${language} is not supported by Piston API`);
  }
  
  const requestBody: PistonExecutionRequest = {
    language: langInfo.name,
    version: langInfo.version,
    files: [
      {
        content: sourceCode,
      },
    ],
    stdin: stdin || '',
  };
  
  try {
    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Piston API error: ${response.status} ${errorText}`);
    }
    
    const result: PistonExecutionResponse = await response.json();
    
    // Handle compilation errors
    if (result.compile && result.compile.code !== 0) {
      return {
        output: '',
        error: result.compile.stderr || result.compile.output || 'Compilation Error',
        time: null,
        memory: null,
      };
    }
    
    // Handle runtime errors
    if (result.run.code !== 0) {
      return {
        output: result.run.stdout || '',
        error: result.run.stderr || result.run.output || `Runtime Error (exit code: ${result.run.code})`,
        time: null,
        memory: null,
      };
    }
    
    // Success
    return {
      output: result.run.stdout || result.run.output || '',
      error: result.run.stderr || null,
      time: null, // Piston doesn't provide execution time
      memory: null, // Piston doesn't provide memory usage
    };
  } catch (error: any) {
    throw new Error(`Piston execution failed: ${error.message}`);
  }
};

// Execute code and wait for result (polling) - Judge0
const executeCodeJudge0 = async (
  sourceCode: string,
  language: string,
  stdin?: string,
  maxWaitTime: number = 10000 // 10 seconds
): Promise<{ output: string; error: string | null; time: string | null; memory: number | null }> => {
  try {
    // Submit code
    const token = await submitCode(sourceCode, language, stdin);
    
    // Poll for result
    const startTime = Date.now();
    let result: ExecutionResult;
    
    while (true) {
      result = await getExecutionResult(token);
      
      // Status 1 = In Queue, Status 2 = Processing
      if (result.status.id !== 1 && result.status.id !== 2) {
        break;
      }
      
      // Check timeout
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('Execution timeout');
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Handle different statuses
    if (result.status.id === 3) {
      // Accepted
      return {
        output: result.stdout || '',
        error: result.stderr || null,
        time: result.time,
        memory: result.memory,
      };
    } else if (result.status.id === 4) {
      // Wrong Answer
      return {
        output: result.stdout || '',
        error: result.message || 'Wrong Answer',
        time: result.time,
        memory: result.memory,
      };
    } else if (result.status.id === 5) {
      // Time Limit Exceeded
      return {
        output: result.stdout || '',
        error: 'Time Limit Exceeded',
        time: result.time,
        memory: result.memory,
      };
    } else if (result.status.id === 6) {
      // Compilation Error
      return {
        output: '',
        error: result.compile_output || result.message || 'Compilation Error',
        time: null,
        memory: null,
      };
    } else if (result.status.id === 7) {
      // Runtime Error
      return {
        output: result.stdout || '',
        error: result.stderr || result.message || 'Runtime Error',
        time: result.time,
        memory: result.memory,
      };
    } else if (result.status.id === 8) {
      // Runtime Error (NZEC)
      return {
        output: result.stdout || '',
        error: result.stderr || result.message || 'Runtime Error (NZEC)',
        time: result.time,
        memory: result.memory,
      };
    } else {
      // Other errors
      return {
        output: result.stdout || '',
        error: result.message || result.stderr || `Error: ${result.status.description}`,
        time: result.time,
        memory: result.memory,
      };
    }
  } catch (error: any) {
    throw new Error(`Execution failed: ${error.message}`);
  }
};

// Main execute function - automatically chooses the best service
export const executeCode = async (
  sourceCode: string,
  language: string,
  stdin?: string,
  maxWaitTime: number = 10000
): Promise<{ output: string; error: string | null; time: string | null; memory: number | null }> => {
  const service = getExecutionService();
  
  if (service === 'piston') {
    return executeCodePiston(sourceCode, language, stdin);
  } else {
    return executeCodeJudge0(sourceCode, language, stdin, maxWaitTime);
  }
};

// Check if any execution service is configured (Piston is always available for free)
export const isJudge0Configured = (): boolean => {
  // Piston is always available (FREE), so return true
  // But also check if Judge0 is explicitly configured
  return true;
};

// Get supported languages (combines Piston and Judge0 languages)
export const getSupportedLanguages = (): string[] => {
  const pistonLangs = Object.keys(PISTON_LANGUAGES);
  const judge0Langs = Object.keys(LANGUAGE_IDS);
  // Return union of both
  return Array.from(new Set([...pistonLangs, ...judge0Langs]));
};

