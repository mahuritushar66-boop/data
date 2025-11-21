import { loader } from "@monaco-editor/react";

// Configure Monaco Editor workers
if (typeof window !== "undefined") {
  // Use jsDelivr CDN which is reliable and fast
  const baseUrl = "https://cdn.jsdelivr.net/npm/monaco-editor@0.54.0/min/vs";
  
  // Configure worker URLs
  (window as any).MonacoEnvironment = {
    getWorkerUrl: function (_moduleId: string, label: string) {
      // For SQL, we can use the default editor worker
      // Other languages use their specific workers
      if (label === "json") {
        return `${baseUrl}/language/json/json.worker.js`;
      }
      if (label === "css" || label === "scss" || label === "less") {
        return `${baseUrl}/language/css/css.worker.js`;
      }
      if (label === "html" || label === "handlebars" || label === "razor") {
        return `${baseUrl}/language/html/html.worker.js`;
      }
      if (label === "typescript" || label === "javascript") {
        return `${baseUrl}/language/typescript/ts.worker.js`;
      }
      // Default editor worker (used for SQL and other languages)
      return `${baseUrl}/editor/editor.worker.js`;
    },
  };
  
  // Configure the loader to use CDN
  loader.config({ 
    paths: { 
      vs: baseUrl
    } 
  });
}

