import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, ExternalLink, Eye, RefreshCw } from "lucide-react";

interface PdfViewerProps {
  url: string;
  title?: string;
}

const PdfViewer = ({ url, title }: PdfViewerProps) => {
  const [viewMode, setViewMode] = useState<"google" | "direct" | "none">("google");
  const [isLoading, setIsLoading] = useState(true);

  // Google Docs Viewer URL (bypasses CORS)
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  // Handle download - open in new window
  const handleOpenPdf = () => {
    // For Cloudinary raw URLs, we can try to force download
    const newWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (!newWindow) {
      // Fallback: create a temporary link
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Force download
  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = title ? `${title}.pdf` : "document.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      // Fallback to direct link
      handleOpenPdf();
    }
  };

  // Check if URL is valid
  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-muted/30 rounded-lg">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No PDF available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* PDF Header with Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-medium">{title || "Document"}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setIsLoading(true);
              setViewMode(viewMode === "google" ? "direct" : "google");
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {viewMode === "google" ? "Try Direct" : "Try Google Viewer"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenPdf}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open
          </Button>
          <Button variant="default" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      {viewMode !== "none" ? (
        <div className="w-full bg-muted/20 rounded-lg overflow-hidden relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Loading PDF...</p>
              </div>
            </div>
          )}
          <iframe
            src={viewMode === "google" ? googleViewerUrl : url}
            className="w-full h-[600px] border-0"
            title={title || "PDF Document"}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              if (viewMode === "google") {
                setViewMode("direct");
              } else {
                setViewMode("none");
              }
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-muted/30 rounded-lg space-y-4">
          <FileText className="h-16 w-16 text-muted-foreground" />
          <p className="text-center text-muted-foreground">
            PDF preview not available due to security restrictions.
          </p>
          <p className="text-center text-xs text-muted-foreground">
            Click the buttons below to view or download the PDF.
          </p>
          <div className="flex gap-3">
            <Button onClick={handleOpenPdf}>
              <Eye className="h-4 w-4 mr-2" />
              View PDF
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      )}

      {/* Direct link */}
      <div className="text-center space-y-2">
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" />
          Direct PDF Link (Right-click to save)
        </a>
      </div>
    </div>
  );
};

export default PdfViewer;

