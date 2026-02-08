import api from "../api/client";

export async function downloadFile(
  attachmentId: string,
  fileName: string
): Promise<void> {
  const response = await api.get(`/attachments/${attachmentId}/download`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
