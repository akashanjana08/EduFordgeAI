export async function readApiJson<T = any>(response: Response): Promise<T> {
  const body = await response.text();
  const responseStatus = `HTTP ${response.status}${
    response.statusText ? ` ${response.statusText}` : ""
  }`;

  if (!body.trim()) {
    throw new Error(`The server returned an empty response (${responseStatus}).`);
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(`The server returned invalid JSON (${responseStatus}).`);
  }
}
