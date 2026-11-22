async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, options);
  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch {
      // Use the HTTP status when the server response is not JSON.
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response;
}

export async function fetchAnalyses() {
  const response = await request("/analyses");
  return (await response.json()).analyses;
}

export async function fetchAnalysis(id) {
  const response = await request(`/analyses/${id}`);
  return (await response.json()).analysis;
}

export async function submitAnalysis(file, jobDescription, weights) {
  const formData = new FormData();
  formData.append("resume", file);
  formData.append("jobDescription", jobDescription);
  formData.append("weights", JSON.stringify(weights));
  const response = await request("/analyses", { method: "POST", body: formData });
  return (await response.json()).analysis;
}

export async function runFairness(id) {
  const response = await request(`/analyses/${id}/fairness`, { method: "POST" });
  return (await response.json()).analysis;
}

export async function requestAdvisory(id) {
  const response = await request(`/analyses/${id}/advisory`, { method: "POST" });
  return (await response.json()).analysis;
}

export async function compareAnalyses(ids) {
  const response = await request("/analyses/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids })
  });
  return (await response.json()).analyses;
}

export async function deleteAnalysis(id) {
  await request(`/analyses/${id}`, { method: "DELETE" });
}

export async function downloadReport(id, filename) {
  const response = await request(`/analyses/${id}/report`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `analysis-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
