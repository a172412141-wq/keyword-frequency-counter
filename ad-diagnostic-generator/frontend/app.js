const state = {
  file: null,
  fields: [],
  values: [],
  downloadBlob: null,
  downloadName: "广告诊断表.xlsx",
};

const $ = (id) => document.getElementById(id);
const elements = {
  fileInput: $("file-input"),
  dropZone: $("drop-zone"),
  fileCard: $("file-card"),
  fileName: $("file-name"),
  fileSize: $("file-size"),
  removeFile: $("remove-file"),
  sampleButton: $("sample-button"),
  analyzeButton: $("analyze-button"),
  uploadPanel: $("upload-panel"),
  selectionPanel: $("selection-panel"),
  resultPanel: $("result-panel"),
  fieldSelect: $("field-select"),
  valueSelect: $("value-select"),
  valueSearch: $("value-search"),
  valueCount: $("value-count"),
  generateButton: $("generate-button"),
  loadingOverlay: $("loading-overlay"),
  loadingCopy: $("loading-copy"),
  statusLine: $("status-line"),
  resultCopy: $("result-copy"),
  resultStats: $("result-stats"),
  downloadAgain: $("download-again"),
  startOver: $("start-over"),
};

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function setStep(current) {
  document.querySelectorAll(".stepper li").forEach((item) => {
    const step = Number(item.dataset.step);
    item.classList.toggle("active", step === current);
    item.classList.toggle("done", step < current);
  });
}

function showLoading(copy) {
  elements.loadingCopy.textContent = copy;
  elements.loadingOverlay.hidden = false;
}

function hideLoading() {
  elements.loadingOverlay.hidden = true;
}

function showError(message) {
  elements.statusLine.textContent = message;
  elements.statusLine.hidden = false;
  elements.statusLine.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearError() {
  elements.statusLine.hidden = true;
  elements.statusLine.textContent = "";
}

async function apiError(response) {
  try {
    const body = await response.json();
    return body.detail || "请求失败，请检查文件后重试。";
  } catch {
    return `请求失败（${response.status}）。`;
  }
}

function chooseFile(file) {
  clearError();
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    showError("请选择 .xlsx 格式的 Amazon Ads Bulk 文件。 ");
    return;
  }
  if (file.size > 200 * 1024 * 1024) {
    showError("文件不能超过 200MB。 ");
    return;
  }
  state.file = file;
  elements.fileName.textContent = file.name;
  elements.fileSize.textContent = `${formatBytes(file.size)} · 等待校验`;
  elements.dropZone.hidden = true;
  elements.fileCard.hidden = false;
  elements.analyzeButton.disabled = false;
}

async function loadSample() {
  clearError();
  showLoading("正在准备示例 Bulk…");
  try {
    const response = await fetch("/static/sample-bulk.xlsx");
    if (!response.ok) throw new Error("示例文件暂时不可用。 ");
    const blob = await response.blob();
    chooseFile(new File([blob], "Amazon_Ads_Bulk_示例.xlsx", { type: blob.type }));
  } catch (error) {
    showError(error.message || "示例文件加载失败。 ");
  } finally {
    hideLoading();
  }
}

function resetAll() {
  state.file = null;
  state.fields = [];
  state.values = [];
  state.downloadBlob = null;
  elements.fileInput.value = "";
  elements.dropZone.hidden = false;
  elements.fileCard.hidden = true;
  elements.analyzeButton.disabled = true;
  elements.uploadPanel.hidden = false;
  elements.selectionPanel.hidden = true;
  elements.resultPanel.hidden = true;
  elements.valueSearch.value = "";
  clearError();
  setStep(1);
  window.scrollTo({ top: document.querySelector(".workspace").offsetTop - 24, behavior: "smooth" });
}

function renderValues(query = "") {
  const normalized = query.trim().toLocaleLowerCase();
  const filtered = normalized
    ? state.values.filter((value) => value.toLocaleLowerCase().includes(normalized))
    : state.values;
  elements.valueSelect.replaceChildren(
    ...filtered.slice(0, 5000).map((value) => new Option(value, value)),
  );
  if (elements.valueSelect.options.length) elements.valueSelect.selectedIndex = 0;
  const suffix = filtered.length > 5000 ? "，显示前 5,000 个" : "";
  elements.valueCount.textContent = `匹配 ${filtered.length.toLocaleString()} 个值${suffix}`;
}

function selectField(fieldName) {
  const field = state.fields.find((item) => item.name === fieldName);
  state.values = field ? field.values : [];
  elements.valueSearch.value = "";
  renderValues();
}

async function analyzeFile() {
  if (!state.file) return;
  clearError();
  showLoading("正在读取并校验 Bulk…");
  const formData = new FormData();
  formData.append("file", state.file);
  try {
    const response = await fetch("/api/analyze", { method: "POST", body: formData });
    if (!response.ok) throw new Error(await apiError(response));
    const data = await response.json();
    state.fields = data.fields;
    elements.fileSize.textContent = `${formatBytes(state.file.size)} · 校验通过`;
    $("summary-sheet").textContent = data.summary.sheet_name;
    $("summary-header").textContent = `第 ${data.summary.header_row} 行`;
    $("summary-rows").textContent = data.summary.data_rows.toLocaleString();
    $("summary-fields").textContent = data.summary.field_count.toLocaleString();
    elements.fieldSelect.replaceChildren(
      ...state.fields.map((field) => new Option(`${field.label} · ${field.count.toLocaleString()} 个`, field.name)),
    );
    selectField(state.fields[0].name);
    elements.uploadPanel.hidden = true;
    elements.selectionPanel.hidden = false;
    setStep(2);
  } catch (error) {
    showError(error.message || "文件校验失败。 ");
  } finally {
    hideLoading();
  }
}

function parseFilename(header) {
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded) return decodeURIComponent(encoded[1]);
  return "广告诊断表.xlsx";
}

function triggerDownload() {
  if (!state.downloadBlob) return;
  const url = URL.createObjectURL(state.downloadBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = state.downloadName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function generateWorkbook() {
  const selectedField = elements.fieldSelect.value;
  const selectedValue = elements.valueSelect.value;
  if (!selectedValue) {
    showError("请先选择一个父体或产品组。 ");
    return;
  }
  clearError();
  showLoading("正在重建公式并生成 12-Sheet 工作簿…");
  const formData = new FormData();
  formData.append("file", state.file);
  formData.append("selected_field", selectedField);
  formData.append("selected_value", selectedValue);
  try {
    const response = await fetch("/api/generate", { method: "POST", body: formData });
    if (!response.ok) throw new Error(await apiError(response));
    state.downloadBlob = await response.blob();
    state.downloadName = parseFilename(response.headers.get("Content-Disposition") || "");
    const statsHeader = response.headers.get("X-Generation-Stats");
    const stats = statsHeader ? JSON.parse(statsHeader) : null;
    triggerDownload();
    elements.selectionPanel.hidden = true;
    elements.resultPanel.hidden = false;
    elements.resultCopy.textContent = `${state.downloadName} 已开始下载。`;
    const items = stats
      ? [
          `筛选行 ${stats.filtered_rows.toLocaleString()}`,
          `广告位 ${stats.bidding_rows.toLocaleString()}`,
          `搜索词 ${stats.search_terms.toLocaleString()}`,
          `广告组合 ${stats.portfolios.toLocaleString()}`,
          `ASIN-SKU ${stats.asin_sku_pairs.toLocaleString()}`,
        ]
      : ["12 个工作表"];
    elements.resultStats.replaceChildren(...items.map((item) => {
      const span = document.createElement("span");
      span.textContent = item;
      return span;
    }));
    setStep(3);
  } catch (error) {
    showError(error.message || "生成失败，请稍后重试。 ");
  } finally {
    hideLoading();
  }
}

elements.dropZone.addEventListener("click", () => elements.fileInput.click());
elements.fileInput.addEventListener("change", () => chooseFile(elements.fileInput.files[0]));
elements.removeFile.addEventListener("click", resetAll);
elements.sampleButton.addEventListener("click", loadSample);
elements.analyzeButton.addEventListener("click", analyzeFile);
elements.fieldSelect.addEventListener("change", () => selectField(elements.fieldSelect.value));
elements.valueSearch.addEventListener("input", () => renderValues(elements.valueSearch.value));
elements.generateButton.addEventListener("click", generateWorkbook);
elements.downloadAgain.addEventListener("click", triggerDownload);
elements.startOver.addEventListener("click", resetAll);

["dragenter", "dragover"].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("dragging");
  });
});
["dragleave", "drop"].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("dragging");
  });
});
elements.dropZone.addEventListener("drop", (event) => chooseFile(event.dataTransfer.files[0]));
