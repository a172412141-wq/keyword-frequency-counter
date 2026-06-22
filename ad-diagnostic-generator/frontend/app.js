const state = {
  file: null,
  fields: [],
  values: [],
  selectedValues: new Set(),
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
  selectVisible: $("select-visible"),
  clearSelection: $("clear-selection"),
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
  state.selectedValues.clear();
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

function renderValues(query = "", selectDefault = true) {
  const normalized = query.trim().toLocaleLowerCase();
  const filtered = normalized
    ? state.values.filter((value) => value.toLocaleLowerCase().includes(normalized))
    : state.values;
  const options = filtered.slice(0, 5000).map((value) => {
    const option = new Option(value, value);
    option.selected = state.selectedValues.has(value);
    return option;
  });
  elements.valueSelect.replaceChildren(...options);
  if (selectDefault && !state.selectedValues.size && options.length) {
    options[0].selected = true;
    state.selectedValues.add(options[0].value);
  }
  const suffix = filtered.length > 5000 ? "，显示前 5,000 个" : "";
  elements.valueCount.textContent = `已选 ${state.selectedValues.size.toLocaleString()} 个 · 匹配 ${filtered.length.toLocaleString()} 个值${suffix}`;
}

function selectVisibleValues() {
  Array.from(elements.valueSelect.options).forEach((option) => state.selectedValues.add(option.value));
  renderValues(elements.valueSearch.value, false);
}

function clearSelectedValues() {
  state.selectedValues.clear();
  renderValues(elements.valueSearch.value, false);
}

function syncSelectedValues() {
  Array.from(elements.valueSelect.options).forEach((option) => {
    if (option.selected) state.selectedValues.add(option.value);
    else state.selectedValues.delete(option.value);
  });
  renderValues(elements.valueSearch.value);
}

function selectField(fieldName) {
  const field = state.fields.find((item) => item.name === fieldName);
  state.values = field ? field.values : [];
  state.selectedValues.clear();
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
    $("summary-rows").textContent = data.summary.data_rows.toLocaleString();
    $("summary-search-rows").textContent = data.summary.search_term_rows.toLocaleString();
    $("summary-portfolio-rows").textContent = data.summary.portfolio_rows.toLocaleString();
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
  const selectedValues = Array.from(state.selectedValues);
  if (!selectedValues.length) {
    showError("请至少选择一个父体或产品组。 ");
    return;
  }
  clearError();
  showLoading("正在合并所选数据并生成 8-Sheet 工作簿…");
  const formData = new FormData();
  formData.append("file", state.file);
  formData.append("selected_field", selectedField);
  selectedValues.forEach((value) => formData.append("selected_values", value));
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
          `已选 ${stats.selected_values.length.toLocaleString()} 项`,
        ]
      : ["8 个工作表"];
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
elements.valueSelect.addEventListener("change", syncSelectedValues);
elements.selectVisible.addEventListener("click", selectVisibleValues);
elements.clearSelection.addEventListener("click", clearSelectedValues);
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
