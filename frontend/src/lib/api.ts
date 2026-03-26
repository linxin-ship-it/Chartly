import { StreamEvent } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

export async function startAnalysis(
  file: File,
  goal: string,
  onEvent: (event: StreamEvent) => void,
  onDone: () => void,
  onError: (error: string) => void,
): Promise<AbortController> {
  const controller = new AbortController();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("goal", goal);

  try {
    const apiPath = API_BASE ? `${API_BASE}/api/analyze` : "/api/analyze";
    const response = await fetch(apiPath, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      onError(`Server error: ${response.status} — ${text}`);
      return controller;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError("Failed to get response stream");
      return controller;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    const processStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const event: StreamEvent = JSON.parse(line.slice(6));
                onEvent(event);
                if (event.type === "done") {
                  onDone();
                  return;
                }
              } catch {
                // skip malformed events
              }
            }
          }
        }
        onDone();
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        onError(String(err));
      }
    };

    processStream();
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") return controller;
    onError(String(err));
  }

  return controller;
}
