import Papa from "papaparse";

// Types for the CSV data
interface BseMappingRow {
  "Security Code": string;
  "Security Id": string;
  [key: string]: string;
}

interface ScreenerRow {
  Name?: string;
  "BSE Code"?: string;
  "NSE Code"?: string;
  [key: string]: string | number | undefined;
}

// Processing statistics
export interface ProcessingStats {
  totalRows: number;
  rowsWithNseCode: number;
  rowsMatchedViaBse: number;
  rowsDropped: number;
  droppedRows: Array<{ name: string; bseCode: string; reason: string }>;
}

export interface ProcessingResult {
  output: string;
  stats: ProcessingStats;
}

// Cache for BSE mapping data
let bseMappingCache: Map<string, string> | null = null;

/**
 * Fetches and parses the BSE mapping CSV from /bse_mapping.csv
 * Creates Map: Security Code (string) -> Security Id (string)
 * Removes '#' characters from Security Id
 */
export async function loadBseMapping(): Promise<Map<string, string>> {
  if (bseMappingCache) {
    return bseMappingCache;
  }

  const response = await fetch("/bse_mapping.csv");
  if (!response.ok) {
    throw new Error(`Failed to fetch BSE mapping: ${response.status}`);
  }
  const csvText = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse<BseMappingRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapping = new Map<string, string>();

        for (const row of results.data) {
          const securityCode = row["Security Code"]?.trim();
          // CRUCIAL: Remove '#' characters from Security Id
          const securityId = row["Security Id"]?.replace(/#/g, "").trim();

          if (securityCode && securityId) {
            mapping.set(securityCode, securityId);
          }
        }

        console.log(`BSE Mapping loaded: ${mapping.size} entries`);
        bseMappingCache = mapping;
        resolve(mapping);
      },
      error: (error: Error) => {
        reject(new Error(`Failed to parse BSE mapping: ${error.message}`));
      },
    });
  });
}

/**
 * Checks if a code is valid (non-empty string, not "nan", etc.)
 */
function isValidCode(value: string | undefined | null): boolean {
  if (!value) return false;
  const trimmed = value.toString().trim().toLowerCase();
  return trimmed !== "" && trimmed !== "nan" && trimmed !== "null" && trimmed !== "undefined";
}

/**
 * Cleans ticker code for TradingView: replaces '&' and '-' with '_'
 */
function cleanTickerCode(code: string): string {
  return code.trim().replace(/&/g, "_").replace(/-/g, "_");
}

/**
 * Processes user's uploaded CSV using STRICT deterministic logic:
 *
 * Priority Chain:
 * A) IF row has valid NSE Code -> Output: NSE:[NSE Code]
 * B) ELSE IF row's BSE Code exists in mapping -> Output: BSE:[Security Id]
 * C) ELSE -> Drop row and log warning
 */
export async function processScreenerData(csvFile: File): Promise<ProcessingResult> {
  // Step 1: Load the mapping index
  const bseMapping = await loadBseMapping();

  // Step 2: Parse user's CSV
  const csvText = await csvFile.text();

  return new Promise((resolve, reject) => {
    Papa.parse<ScreenerRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const output: string[] = [];
        let totalRows = 0;
        let matchedNSE = 0;
        let matchedBSE = 0;
        let skipped = 0;
        const droppedRows: Array<{ name: string; bseCode: string; reason: string }> = [];

        // Step 3: Process row by row
        for (const row of results.data) {
          // Skip completely empty rows
          if (!row["Name"] && !row["BSE Code"] && !row["NSE Code"]) {
            continue;
          }

          totalRows++;

          const rowName = row["Name"]?.toString().trim() || "Unknown";
          const nseCode = row["NSE Code"]?.toString().trim() || "";
          const bseCode = row["BSE Code"]?.toString().trim() || "";

          // CONDITION A: IF row has valid NSE Code
          if (isValidCode(nseCode)) {
            const ticker = `NSE:${cleanTickerCode(nseCode)}`;
            output.push(ticker);
            matchedNSE++;
            continue;
          }

          // CONDITION B: ELSE IF row's BSE Code exists in mapping
          if (isValidCode(bseCode) && bseMapping.has(bseCode)) {
            const securityId = bseMapping.get(bseCode)!;
            const ticker = `BSE:${cleanTickerCode(securityId)}`;
            output.push(ticker);
            matchedBSE++;
            continue;
          }

          // CONDITION C: ELSE drop the row
          console.warn(`Skipped row: ${rowName} (No NSE Code and BSE Code not found in map)`);
          skipped++;
          droppedRows.push({
            name: rowName,
            bseCode: bseCode || "(empty)",
            reason: "No NSE Code and BSE Code not found in map",
          });
        }

        // Step 4: Log summary stats
        console.log("Stats:", { totalRows, matchedNSE, matchedBSE, skipped });

        // Verification: ensure all rows are accounted for
        const accounted = matchedNSE + matchedBSE + skipped;
        if (accounted !== totalRows) {
          console.error(`Row count mismatch! Total: ${totalRows}, Accounted: ${accounted}`);
        }

        resolve({
          output: output.join("\n"),
          stats: {
            totalRows,
            rowsWithNseCode: matchedNSE,
            rowsMatchedViaBse: matchedBSE,
            rowsDropped: skipped,
            droppedRows,
          },
        });
      },
      error: (error: Error) => {
        reject(new Error(`Failed to parse uploaded CSV: ${error.message}`));
      },
    });
  });
}

/**
 * Creates a downloadable text file from the output
 */
export function downloadAsText(content: string, filename: string = "watchlist.txt"): void {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
