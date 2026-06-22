function legacyCopy(content: string): void {
  const textarea = document.createElement("textarea");
  textarea.value = content;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("复制失败");
}

export async function copyTextToClipboard(content: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    legacyCopy(content);
    return;
  }

  try {
    await Promise.race([
      navigator.clipboard.writeText(content),
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("剪贴板响应超时")), 800);
      }),
    ]);
  } catch {
    legacyCopy(content);
  }
}
