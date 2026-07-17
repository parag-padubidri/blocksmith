// Direct blob downloads (the prototype's copy-paste modal only existed because
// the artifact sandbox blocked downloads).

export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(name: string, text: string, type = "text/plain") {
  downloadBlob(name, new Blob([text], { type }));
}
