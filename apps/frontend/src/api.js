const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");

function buildNetworkErrorMessage() {
  return `Cannot connect to backend API at ${API_BASE}. Ensure backend is running and accessible.`;
}

export async function parseTransaction(rawSms) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/parse-transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawSms })
    });
  } catch {
    throw new Error(buildNetworkErrorMessage());
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Transaction parsing failed");
  }

  return response.json();
}

export async function uploadCsvForInsights(file) {
  const formData = new FormData();
  formData.append("file", file);

  let response;
  try {
    response = await fetch(`${API_BASE}/api/insights/csv`, {
      method: "POST",
      body: formData
    });
  } catch {
    throw new Error(buildNetworkErrorMessage());
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "CSV/PDF analysis failed");
  }

  return response.json();
}

