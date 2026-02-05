"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Copy, Download, Check, Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { processScreenerData, downloadAsText, type ProcessingStats } from "@/lib/converter";

export default function Home() {
  const [output, setOutput] = useState<string>("");
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showDropped, setShowDropped] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setFileName(file.name);
    setStats(null);
    setShowDropped(false);

    try {
      const result = await processScreenerData(file);
      setOutput(result.output);
      setStats(result.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
      setOutput("");
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    multiple: false,
  });

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!output) return;
    downloadAsText(output, "watchlist.txt");
  };

  const tickerCount = output ? output.split("\n").filter(Boolean).length : 0;

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Card Container */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
          {/* Header */}
          <h1 className="text-xl font-semibold text-center mb-6">
            Screener → TradingView
          </h1>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-colors duration-200
              ${isDragActive
                ? "border-blue-500 bg-blue-500/10"
                : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50"
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              {isLoading ? (
                <Loader2 className="w-10 h-10 text-zinc-500 animate-spin" />
              ) : (
                <Upload className="w-10 h-10 text-zinc-500" />
              )}
              <div className="text-zinc-400">
                {isLoading ? (
                  "Processing..."
                ) : isDragActive ? (
                  "Drop your CSV here"
                ) : (
                  <>
                    <span className="text-zinc-300">Drag & drop your CSV</span>
                    <br />
                    <span className="text-sm">or click to browse</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Results Section */}
          {output && stats && (
            <div className="mt-6 space-y-4">
              {/* Stats Summary */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Total rows:</span>
                    <span className="text-zinc-300 font-mono">{stats.totalRows}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">NSE matched:</span>
                    <span className="text-green-400 font-mono">{stats.rowsWithNseCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">BSE matched:</span>
                    <span className="text-blue-400 font-mono">{stats.rowsMatchedViaBse}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Dropped:</span>
                    <span className={`font-mono ${stats.rowsDropped > 0 ? "text-yellow-400" : "text-zinc-400"}`}>
                      {stats.rowsDropped}
                    </span>
                  </div>
                </div>

                {/* Dropped Rows Detail */}
                {stats.droppedRows.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <button
                      onClick={() => setShowDropped(!showDropped)}
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
                    >
                      {showDropped ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {showDropped ? "Hide" : "Show"} dropped rows
                    </button>
                    {showDropped && (
                      <div className="mt-2 max-h-32 overflow-y-auto text-xs space-y-1">
                        {stats.droppedRows.map((row, i) => (
                          <div key={i} className="text-zinc-500">
                            <span className="text-zinc-400">{row.name}</span>
                            <span className="text-zinc-600"> — {row.reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Info Bar */}
              <div className="flex items-center justify-between text-sm text-zinc-500">
                <span>{fileName}</span>
                <span className="text-green-400">{tickerCount} tickers output</span>
              </div>

              {/* Output Textarea */}
              <textarea
                readOnly
                value={output}
                className="w-full h-48 bg-zinc-950 border border-zinc-800 rounded-lg p-3
                  text-sm font-mono text-zinc-300 resize-none focus:outline-none
                  focus:border-zinc-700"
              />

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5
                    bg-zinc-800 hover:bg-zinc-700 border border-zinc-700
                    rounded-lg text-sm font-medium transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy to Clipboard
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5
                    bg-blue-600 hover:bg-blue-500
                    rounded-lg text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download .txt
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600 mt-4">
          Upload a CSV from Screener.in with BSE/NSE codes
        </p>
      </div>
    </main>
  );
}
