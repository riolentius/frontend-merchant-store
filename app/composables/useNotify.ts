export const useNotify = () => {
  const toast = useToast();

  const extractErrorMessage = (err: any, fallback = "Something went wrong"): string => {
    const body = err?.data ?? err?.response?._data;
    return (
      body?.message ||
      body?.error ||
      (err?.message && err.message !== "Request failed" ? err.message : "") ||
      fallback
    );
  };

  const notifySuccess = (summary: string, detail?: string) =>
    toast.add({ severity: "success", summary, detail, life: 3000 });

  const notifyInfo = (summary: string, detail?: string) =>
    toast.add({ severity: "info", summary, detail, life: 3000 });

  const notifyWarn = (summary: string, detail?: string) =>
    toast.add({ severity: "warn", summary, detail, life: 4000 });

  const notifyError = (err: any, summary = "Error") => {
    console.error(summary, err);
    toast.add({ severity: "error", summary, detail: extractErrorMessage(err), life: 5000 });
  };

  return { notifySuccess, notifyInfo, notifyWarn, notifyError, extractErrorMessage };
};