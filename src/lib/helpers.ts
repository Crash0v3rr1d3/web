import * as https from "node:https";

export function trimText(input: string, maxLength: number = 100): string {
  if (input.length <= maxLength) return input;
  return input.substring(0, maxLength - 3) + "...";
}
export function getCurrentTimeInMadrid(): Date {
  // Create a date object with the current UTC time
  const now = new Date();

  // Convert the UTC time to Madrid's time (UTC+7)
  const offsetMadrid = 7;
  now.setHours(now.getUTCHours() + offsetMadrid);

  return now;
}

export function formatTimeForMadrid(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Europe/Madrid",
  };

  let formattedTime = new Intl.DateTimeFormat("en-US", options).format(date);

  return formattedTime;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "numeric",
  });
}

export function isMorningTime(timeString: string): boolean {
  return timeString.includes('AM');
}

export function getTimeThemeColor(date: Date): string {
  return isMorningTime(formatTimeForMadrid(date)) ? 'text-amber-400' : 'text-blue-400';
}

export function fetchJsonIPv4(url: string, timeoutMs: number = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    // Load the API Key from import.meta.env or process.env during build.
    // Astro exposes .env vars securely on the server-side.
    const apiKey = import.meta.env ? import.meta.env.RANSOMWARE_API_KEY : process.env.RANSOMWARE_API_KEY;
    const headers: Record<string, string> = { "User-Agent": "Astro-Fetch/1.0" };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`; // Assuming Bearer, or just 'x-api-key' etc. To be generic, many APIs use x-api-key. The prompt didn't specify. I'll pass both just to be safe, or just append it as query. Wait, let's pass it strictly as an authorization header or custom header. 
      headers["x-api-key"] = apiKey;
    }

    const req = https.get(
      url,
      { family: 4, timeout: timeoutMs, headers },
      (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP Status ${res.statusCode}`));
        }
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on("error", (err) => {
      reject(err);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
  });
}
