#!/usr/bin/env node

import blessed from "blessed";
import { exec, spawn } from "child_process";

const screen = blessed.screen({
  smartCSR: true,
  title: "Mini Pod — 🐳",
  fullUnicode: true,
  dockBorders: true,
  style: { bg: "black", fg: "white" },
});

const header = blessed.box({
  parent: screen,
  top: 0,
  left: 0,
  width: "100%",
  height: 1,
  tags: true,
  content:
    " {magenta-fg}MiniKube{/magenta-fg}  ·  Theme: {cyan-fg}Dark Magenta/Cyan{/cyan-fg}  ·  Controls: " +
    "{green-fg}↑↓{/green-fg} move  " +
    "{green-fg}Enter{/green-fg} details  " +
    "{green-fg}L{/green-fg} logs  " +
    "{green-fg}M{/green-fg} metrics  " +
    "{green-fg}C{/green-fg} namespaces  " +
    "{green-fg}R{/green-fg} refresh  " +
    "{green-fg}TAB{/green-fg} focus  " +
    "{green-fg}Q{/green-fg} back/quit  " +
    "{green-fg}Ctrl+C{/green-fg} exit  " +
       "{green-fg}X{/green-fg} contexts",
  style: { bg: "black", fg: "white" },
  align: "left",
  padding: { left: 1 },
});


const sidebar = blessed.box({
  parent: screen,
  top: 1,
  left: 0,
  width: "30%",
  height: "90%-1",
  label: " Info ",
  tags: true,
  border: { type: "line" },
  style: {
    fg: "white",
    border: { fg: "magenta" },
    label: { fg: "magenta", bold: true },
  },
  scrollable: true,
  alwaysScroll: false,
  padding: { left: 1, right: 1 },
});

const podList = blessed.list({
  parent: screen,
  top: 1,
  left: "30%",
  width: "70%",
  height: "70%",
  label: " Pods ",
  tags: true,
  keys: true,
  mouse: true,
  vi: true,
  border: { type: "line" },
  style: {
    fg: "white",
    bg: "black",
    border: { fg: "cyan" },
    selected: { bg: "magenta", fg: "black", bold: true },
    item: { fg: "white" },
    label: { fg: "cyan", bold: true },
  },
  scrollbar: {
    ch: " ",
    track: { bg: "gray" },
    style: { bg: "magenta" },
  },
});

const detailsBox = blessed.box({
  parent: screen,
  top: "70%+1",
  left: "30%",
  width: "70%",
  height: "30%-1",
  label: " Detalhes ",
  tags: true,
  border: { type: "line" },
  style: {
    fg: "white",
    bg: "black",
    border: { fg: "green" },
    label: { fg: "green", bold: true },
  },
  scrollable: true,
  alwaysScroll: true,
  keys: true,
  vi: true,
  scrollbar: {
    ch: " ",
    track: { bg: "gray" },
    style: { bg: "yellow" },
  },
  padding: { left: 1, right: 1 },
});

const logBox = blessed.box({
  parent: screen,
  top: 1,
  left: "30%",
  width: "70%",
  height: "90%-1",
  label: " Logs (Press Q to go back) ",
  tags: true,
  border: { type: "line" },
  style: {
    fg: "white",
    bg: "black",
    border: { fg: "magenta" },
    label: { fg: "magenta", bold: true },
  },
  scrollable: true,
  alwaysScroll: true,
  hidden: true,
  keys: true,
  vi: true,
  scrollbar: {
    ch: " ",
    track: { bg: "gray" },
    style: { bg: "magenta" },
  },
  padding: { left: 1, right: 1 },
});

const metricsBox = blessed.box({
  parent: screen,
  top: 1,
  left: "30%",
  width: "70%",
  height: "90%-1",
  label: " Metrics (Press Q to go back) ",
  tags: true,
  border: { type: "line" },
  style: {
    fg: "white",
    bg: "black",
    border: { fg: "green" },
    label: { fg: "green", bold: true },
  },
  scrollable: true,
  alwaysScroll: false,
  hidden: true,
  keys: true,
  vi: true,
  padding: { left: 2, right: 2, top: 1 },
});

metricsBox.key(["q", "escape"], () => {
  stopMetrics();
});

const footer = blessed.box({
  parent: screen,
  bottom: 0,
  left: 0,
  width: "100%",
  height: 1,
  tags: true,
  content: " {cyan-fg}Status:{/cyan-fg} ready",
  style: { bg: "black", fg: "white" },
  align: "left",
  padding: { left: 1 },
});

// ---------- Estado ----------
let pods = [];
let currentNamespace = "default";
let logProcess = null;
let currentContext = "unknown";
let currentCluster = "unknown";

// ---------- Util helpers ----------
function setFooter(text) {
  footer.setContent(` {cyan-fg}Status:{/cyan-fg} ${text}`);
  screen.render();
}
function colorizeStatus(status) {
  if (!status) return "{white-fg}Unknown{/white-fg}";
  if (status.includes("Running")) return `{green-fg}${status}{/green-fg}`;
  if (status.includes("Completed")) return `{gray-fg}${status}{/gray-fg}`;
  if (status.includes("Pending")) return `{yellow-fg}${status}{/yellow-fg}`;
  if (status.includes("Crash") || status.includes("Error") || status.includes("Failed"))
    return `{red-fg}${status}{/red-fg}`;
  return `{white-fg}${status}{/white-fg}`;
}
function pad(text, len) {
  return text.toString().padEnd(len, " ");
}

// ---------- KUBECTL INTERACTIONS ----------

function runJsonCmd(cmdArgs, callback) {
  const proc = spawn("kubectl", cmdArgs);
  let out = "";
  let err = "";
  proc.stdout.on("data", (d) => (out += d.toString()));
  proc.stderr.on("data", (d) => (err += d.toString()));
  proc.on("close", () => {
    if (out && out.trim()) {
      try {
        const j = JSON.parse(out);
        callback(null, j);
      } catch (e) {
        callback(new Error("JSON parse error: " + e.message + (err ? " - " + err : "")));
      }
    } else {
      callback(new Error("No output: " + (err || "kubectl returned empty")));
    }
  });
}

function getCurrentContextInfo(cb) {
  exec("kubectl config current-context", (err, stdout) => {
    currentContext = (stdout || "").trim() || currentContext;
    exec(
      "kubectl config view --minify -o jsonpath='{.clusters[0].name}'",
      (e2, stdout2) => {
        currentCluster = (stdout2 || "").replace(/'/g, "").trim() || currentCluster;
        cb && cb();
      }
    );
  });
}

function getPodsForNamespace(namespace, cb) {
  const args = ["get", "pods", "-o", "json"];
  if (namespace && namespace !== "default") args.splice(2, 0, "-n", namespace);
  runJsonCmd(args, (err, json) => {
    if (err) return cb(err, []);
    try {
      const items = json.items || [];
      const parsed = items.map((p) => ({
        name: p.metadata.name,
        status: p.status.phase || (p.status?.containerStatuses?.[0]?.state?.waiting?.reason ?? "Unknown"),
        restarts:
          p.status?.containerStatuses?.reduce((s, c) => s + (c.restartCount || 0), 0) || 0,
        containers: (p.spec?.containers || []).map((c) => c.name),
      }));
      cb(null, parsed);
    } catch (e) {
      cb(e, []);
    }
  });
}

function getTopForNamespace(namespace, cb) {
  const args = ["top", "pods"];
  if (namespace && namespace !== "default") args.push("-n", namespace);
  const proc = spawn("kubectl", args.concat(["--no-headers"]));
  let out = "";
  let err = "";
  proc.stdout.on("data", (d) => (out += d.toString()));
  proc.stderr.on("data", (d) => (err += d.toString()));
  proc.on("close", () => {
    const lines = out.trim().split("\n").filter(Boolean);
    const parsed = lines.map((ln) => {
      const parts = ln.trim().split(/\s+/);
      return {
        name: parts[0],
        cpu: parts[1] || "n/a",
        mem: parts[2] || "n/a",
      };
    });
    cb(err ? new Error(err) : null, parsed);
  });
}

// ---------- UI Updaters ----------
function updateSidebar() {
  getCurrentContextInfo(() => {
    const header = `{bold}{magenta-fg}Context:{/magenta-fg}{/bold} ${currentContext}\n{bold}{cyan-fg}Cluster:{/cyan-fg}{/bold} ${currentCluster}\n{bold}Namespace:{/bold} ${currentNamespace}\n\n`;
    getTopForNamespace(currentNamespace, (err, top) => {
      let topText = "";
      if (err || !top.length) {
        topText = "{gray-fg}metrics unavailable{/gray-fg}\n";
      } else {
        topText = "{bold}Top Pods (CPU / MEM){/bold}\n";
        top.slice(0, 6).forEach((t) => {
          topText += `{cyan-fg}${t.name}{/cyan-fg}  ${t.cpu} / ${t.mem}\n`;
        });
      }
      const now = new Date().toLocaleTimeString();
      sidebar.setContent(header + topText + `\nUpdated: {yellow-fg}${now}{/yellow-fg}`);
      screen.render();
    });
  });
}

function refreshPods() {
  setFooter("refreshing pods...");
  getPodsForNamespace(currentNamespace, (err, list) => {
    if (err) {
      podList.setItems([`{red-fg}Error fetching pods: ${err.message}{/red-fg}`]);
      setFooter("error");
      screen.render();
      return;
    }
    pods = list;

    const padColor = (coloredText, totalLen) => {
      const clean = coloredText.replace(/\{[^}]+\}/g, "");
      const padSize = Math.max(totalLen - clean.length, 0);
      return coloredText + " ".repeat(padSize);
    };

    const headerLine = `{bold}{cyan-fg}${pad("POD", 48)}${pad("STATUS", 14)}RESTARTS{/cyan-fg}{/bold}`;

    const items = [headerLine].concat(
      pods.map((p) => {
        const name = pad(p.name, 48);
        const statusColored = colorizeStatus(p.status);
        const statusPadded = padColor(statusColored, 14);
        const rest = p.restarts.toString().padStart(4, " ");
        return `${name}${statusPadded}${rest}`;
      })
    );

    podList.setItems(items);
    setFooter(`pods: ${pods.length}`);
    screen.render();
  });
}

// ---------- Details & Logs ----------
function showDetailsFor(index) {
  if (index <= 0) return;
  const p = pods[index - 1];
  if (!p) return;

  setFooter(`fetching describe for ${p.name}...`);

  exec(
    `kubectl describe pod ${p.name} -n ${currentNamespace}`,
    { maxBuffer: 20 * 1024 * 1024 },
    (err, stdout, stderr) => {
      if (err) {
        detailsBox.setContent(`{red-fg}Error describe: ${stderr || err.message}{/red-fg}`);
        setFooter("error");
      } else {
        const formatted = stdout
          .split("\n")
          .map((l) => "  " + l)
          .join("\n");
        detailsBox.setContent(formatted);
        setFooter(`details: ${p.name}`);
      }

      podList.hide();
      sidebar.hide();
      detailsBox.top = 1;
      detailsBox.left = 0;
      detailsBox.width = "100%";
      detailsBox.height = "100%-2";
      detailsBox.show();
      detailsBox.focus();
      screen.render();
    }
  );
}

detailsBox.key(["q", "escape"], () => {
  detailsBox.hide();
  sidebar.show();
  podList.show();
  detailsBox.top = "70%+1";
  detailsBox.left = "30%";
  detailsBox.width = "70%";
  detailsBox.height = "30%-1";
  podList.focus();
  screen.render();
});


function startLogsForPodName(podName) {
  // stop previous
  if (logProcess) {
    try { logProcess.kill(); } catch (e) {}
    logProcess = null;
  }
  logBox.setContent(`{yellow-fg}Attaching logs for ${podName}... (Ctrl+C to stop){/yellow-fg}\n`);
  logBox.show();
  logBox.focus();
  screen.render();

  // spawn logs -f
  logProcess = spawn("kubectl", ["logs", "-f", podName, "-n", currentNamespace]);
  logProcess.stdout.on("data", (d) => {
    logBox.insertBottom(d.toString());
    logBox.setScrollPerc(100);
    screen.render();
  });
  logProcess.stderr.on("data", (d) => {
    logBox.insertBottom(`{red-fg}${d.toString()}{/red-fg}`);
    logBox.setScrollPerc(100);
    screen.render();
  });
  logProcess.on("close", () => {
    logBox.insertBottom("{gray-fg}\n--- Logs ended ---{/gray-fg}");
    screen.render();
  });
}

function stopLogs() {
  if (logProcess) {
    try { logProcess.kill(); } catch (e) {}
    logProcess = null;
  }
  logBox.hide();
  detailsBox.show();
  detailsBox.focus();
  screen.render();
}

let metricsInterval = null;

function showMetricsForPod(podName) {
  metricsBox.setContent(`{yellow-fg}Fetching metrics for ${podName}...{/yellow-fg}`);
  metricsBox.show();
  metricsBox.focus();
  screen.render();

  const drawBar = (value, maxLen = 30, color = "green") => {
    const num = parseInt(value);
    if (isNaN(num)) return `{gray-fg}[ ${" ".repeat(maxLen)} ]{/gray-fg}`;
    const filled = Math.min(Math.floor((num / 100) * maxLen), maxLen);
    const empty = maxLen - filled;
    const barColor =
      num < 60 ? "green" : num < 80 ? "yellow" : "red";
    return `{${barColor}-fg}[${"█".repeat(filled)}${" ".repeat(empty)}]{/${barColor}-fg}`;
  };

  const updateMetrics = () => {
    const proc = spawn("kubectl", ["top", "pod", podName, "-n", currentNamespace, "--no-headers"]);
    let out = "";
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.on("close", () => {
      const parts = out.trim().split(/\s+/);
      if (!parts.length || !parts[1]) {
        metricsBox.setContent(`{red-fg}Metrics unavailable for ${podName}{/red-fg}`);
      } else {
        const cpu = parts[1].replace("m", ""); 
        const mem = parts[2].replace("Mi", ""); 
        const now = new Date().toLocaleTimeString();

        const cpuVal = parseInt(cpu) || 0;
        const memVal = parseInt(mem) || 0;
        const cpuBar = drawBar(cpuVal, 40, "cyan");
        const memBar = drawBar(memVal / 10, 40, "magenta");

        metricsBox.setContent(
          `{center}{bold}{green-fg}${podName}{/green-fg}{/bold}{/center}\n\n` +
          `⚙️  {bold}CPU Usage:{/bold} {cyan-fg}${cpu}m{/cyan-fg}\n` +
          `    ${cpuBar}\n\n` +
          `💾 {bold}Memory Usage:{/bold} {magenta-fg}${mem}Mi{/magenta-fg}\n` +
          `    ${memBar}\n\n` +
          `{gray-fg}Last updated: ${now}{/gray-fg}`
        );
      }
      screen.render();
    });
  };

  updateMetrics();
  metricsInterval = setInterval(updateMetrics, 2500);
}

function stopMetrics() {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
  }
  metricsBox.hide();
  detailsBox.show();
  detailsBox.focus();
  screen.render();
}

// ---------- Key bindings ----------
podList.key(["enter"], () => {
  const idx = podList.selected;
  showDetailsFor(idx);
});

podList.key(["l", "L"], () => {
  const idx = podList.selected;
  if (idx <= 0) return;
  const p = pods[idx - 1];
  if (!p) return;
  startLogsForPodName(p.name);
});

detailsBox.key(["l", "L"], () => {
  const content = detailsBox.getContent();
  const m = content.match(/Name:\s+(\S+)/);
  const name = m ? m[1] : null;
  if (name) startLogsForPodName(name);
});

podList.key(["m", "M"], () => {
  const idx = podList.selected;
  if (idx <= 0) return;
  const p = pods[idx - 1];
  if (!p) return;
  showMetricsForPod(p.name);
});


logBox.key(["q", "escape"], () => {
  stopLogs();
});

detailsBox.key(["q", "escape"], () => {
  detailsBox.hide();
  sidebar.show();
  podList.show();
  detailsBox.top = "70%+1";
  detailsBox.left = "30%";
  detailsBox.width = "70%";
  detailsBox.height = "30%-1";
  podList.focus();
  screen.render();
});

screen.key(["r", "R"], () => {
  refreshPods();
  updateSidebar();
});

screen.key(["tab"], () => {
  if (screen.focused === podList) {
    sidebar.focus();
  } else {
    podList.focus();
  }
});

screen.key(["q"], () => {
  if (podList.hidden || logBox.visible || detailsBox.visible) {
    return;
  }
  process.exit(0);
});

screen.key(["C-c"], () => {
  if (logProcess) try { logProcess.kill(); } catch (e) {}
  process.exit(0);
});

// ---------- Namespace Selector (kubens-like) ----------
const namespaceBox = blessed.list({
  parent: screen,
  top: "center",
  left: "center",
  width: "40%",
  height: "50%",
  label: " Select Namespace ",
  tags: true,
  border: { type: "line" },
  hidden: true,
  keys: true,
  vi: true,
  mouse: true,
  style: {
    fg: "white",
    bg: "black",
    border: { fg: "magenta" },
    selected: { bg: "magenta", fg: "black", bold: true },
    label: { fg: "cyan", bold: true },
  },
  scrollbar: {
    ch: " ",
    track: { bg: "gray" },
    style: { bg: "magenta" },
  },
});

function showNamespaceSelector() {
  setFooter("loading namespaces...");
  const proc = spawn("kubectl", ["get", "ns", "-o", "json"]);
  let out = "";
  proc.stdout.on("data", (d) => (out += d.toString()));
  proc.on("close", () => {
    try {
      const json = JSON.parse(out);
      const namespaces = json.items.map((n) => n.metadata.name);
      namespaceBox.setItems(
        namespaces.map((ns) =>
          ns === currentNamespace
            ? `{bold}{cyan-fg}${ns}{/cyan-fg}{/bold} (current)`
            : ns
        )
      );
      namespaceBox.show();
      namespaceBox.focus();
      screen.render();
      setFooter("select namespace ↑↓ + Enter, q/ESC to cancel");
    } catch (e) {
      setFooter(`error loading namespaces: ${e.message}`);
    }
  });
}

namespaceBox.key(["escape", "q"], () => {
  namespaceBox.hide();
  podList.focus();
  screen.render();
});

namespaceBox.key(["enter"], () => {
  const selected = namespaceBox.getItem(namespaceBox.selected)?.content;
  const ns = selected.replace(/\{[^}]+\}/g, "").replace("(current)", "").trim();
  if (!ns || ns === currentNamespace) {
    namespaceBox.hide();
    podList.focus();
    screen.render();
    return;
  }
  currentNamespace = ns;
  namespaceBox.hide();
  setFooter(`namespace switched to ${ns}`);
  refreshPods();
  updateSidebar();
  podList.focus();
  screen.render();
});

screen.key(["c", "C"], () => {
  if (namespaceBox.visible) return;
  showNamespaceSelector();
});

// ---------- Initialization ----------
function init() {
  setFooter("initializing...");
  exec("kubectl config view --minify --output 'jsonpath={..namespace}'", (err, out) => {
    currentNamespace = (out || "").trim() || "default";
    getCurrentContextInfo(() => {
      refreshPods();
      updateSidebar();
      podList.focus();
      screen.render();
    });
  });
}

// ---------- Context Selector (kubectx-like) ----------
const contextBox = blessed.list({
  parent: screen,
  top: "center",
  left: "center",
  width: "50%",
  height: "60%",
  label: " Select Context ",
  tags: true,
  border: { type: "line" },
  hidden: true,
  keys: true,
  vi: true,
  mouse: true,
  style: {
    fg: "white",
    bg: "black",
    border: { fg: "cyan" },
    selected: { bg: "cyan", fg: "black", bold: true },
    label: { fg: "magenta", bold: true },
  },
  scrollbar: {
    ch: " ",
    track: { bg: "gray" },
    style: { bg: "cyan" },
  },
});

function showContextSelector() {
  setFooter("loading contexts...");
  const proc = spawn("kubectl", ["config", "get-contexts", "-o", "name"]);
  let out = "";
  proc.stdout.on("data", (d) => (out += d.toString()));
  proc.on("close", () => {
    const contexts = out
      .trim()
      .split("\n")
      .filter(Boolean);
    contextBox.setItems(
      contexts.map((ctx) =>
        ctx === currentContext
          ? `{bold}{cyan-fg}${ctx}{/cyan-fg}{/bold} (current)`
          : ctx
      )
    );
    contextBox.show();
    contextBox.focus();
    screen.render();
    setFooter("select context ↑↓ + Enter, q/ESC to cancel");
  });
}

contextBox.key(["escape", "q"], () => {
  contextBox.hide();
  podList.focus();
  screen.render();
});

contextBox.key(["enter"], () => {
  const selected = contextBox.getItem(contextBox.selected)?.content;
  const ctx = selected.replace(/\{[^}]+\}/g, "").replace("(current)", "").trim();
  if (!ctx || ctx === currentContext) {
    contextBox.hide();
    podList.focus();
    screen.render();
    return;
  }
  setFooter(`switching to context ${ctx}...`);
  exec(`kubectl config use-context ${ctx}`, (err) => {
    if (err) {
      setFooter(`{red-fg}Error switching context: ${err.message}{/red-fg}`);
    } else {
      currentContext = ctx;
      contextBox.hide();
      refreshPods();
      updateSidebar();
      podList.focus();
      setFooter(`context switched to ${ctx}`);
    }
    screen.render();
  });
});

screen.key(["x", "X"], () => {
  if (contextBox.visible) return;
  showContextSelector();
});

// ---------- Pod Delete & Rollout ----------
function deleteSelectedPod() {
  const idx = podList.selected;
  if (idx <= 0) return;
  const p = pods[idx - 1];
  if (!p) return;

  const confirmBox = blessed.question({
    parent: screen,
    top: "center",
    left: "center",
    width: "50%",
    height: "20%",
    label: " Confirm Delete ",
    tags: true,
    border: { type: "line" },
    style: {
      fg: "white",
      bg: "black",
      border: { fg: "red" },
      label: { fg: "red", bold: true },
    },
  });

  confirmBox.ask(
    `{red-fg}Are you sure you want to delete pod{/red-fg} {bold}${p.name}{/bold}? (y/n)`,
    (err, answer) => {
      if (answer) {
        setFooter(`deleting pod ${p.name}...`);
        exec(`kubectl delete pod ${p.name} -n ${currentNamespace}`, (error, stdout, stderr) => {
          if (error) {
            setFooter(`{red-fg}Error deleting pod: ${stderr || error.message}{/red-fg}`);
          } else {
            setFooter(`pod ${p.name} deleted`);
            refreshPods();
          }
          screen.render();
        });
      } else {
        setFooter("delete cancelled");
        screen.render();
      }
      confirmBox.hide();
      podList.focus();
    }
  );
}

function rolloutRestartPod() {
  const idx = podList.selected;
  if (idx <= 0) return;
  const p = pods[idx - 1];
  if (!p) return;

  setFooter(`rolling out restart for ${p.name}...`);
  exec(`kubectl rollout restart pod ${p.name} -n ${currentNamespace}`, (error, stdout, stderr) => {
    if (error) {
      setFooter(`{red-fg}Error rollout restart: ${stderr || error.message}{/red-fg}`);
    } else {
      setFooter(`rollout restart triggered for ${p.name}`);
      refreshPods();
    }
    screen.render();
  });
}

podList.key(["d", "D"], () => {
  deleteSelectedPod();
});

podList.key(["o", "O"], () => {
  rolloutRestartPod();
});

// ---------- Pod Exec ----------
const execBox = blessed.box({
  parent: screen,
  top: 1,
  left: "30%",
  width: "70%",
  height: "90%-1",
  label: " Exec (Press Q to go back) ",
  tags: true,
  border: { type: "line" },
  style: {
    fg: "white",
    bg: "black",
    border: { fg: "yellow" },
    label: { fg: "yellow", bold: true },
  },
  scrollable: true,
  alwaysScroll: true,
  hidden: true,
  keys: true,
  vi: true,
  scrollbar: {
    ch: " ",
    track: { bg: "gray" },
    style: { bg: "yellow" },
  },
  padding: { left: 1, right: 1 },
});

const execInput = blessed.textbox({
  parent: screen,
  bottom: 0,
  left: "30%",
  width: "70%",
  height: 3,
  label: " Enter command ",
  tags: true,
  border: { type: "line" },
  style: {
    fg: "white",
    bg: "black",
    border: { fg: "yellow" },
    label: { fg: "yellow", bold: true },
  },
  inputOnFocus: true,
  hidden: true,
});

let execProcess = null;

function startExecForPod(podName) {
  execBox.setContent(`{yellow-fg}Enter a command to execute in pod ${podName}{/yellow-fg}\n`);
  execBox.show();
  execInput.show();
  execInput.clearValue();
  execInput.focus();
  screen.render();

  execInput.once("submit", (cmd) => {
    if (!cmd) {
      execBox.hide();
      execInput.hide();
      detailsBox.show();
      detailsBox.focus();
      screen.render();
      return;
    }

    execBox.insertBottom(`\n$ ${cmd}\n`);
    screen.render();

    // Spawn exec
    execProcess = spawn("kubectl", ["exec", "-n", currentNamespace, podName, "--", "sh", "-c", cmd]);
    
    execProcess.stdout.on("data", (d) => {
      execBox.insertBottom(d.toString());
      execBox.setScrollPerc(100);
      screen.render();
    });
    execProcess.stderr.on("data", (d) => {
      execBox.insertBottom(`{red-fg}${d.toString()}{/red-fg}`);
      execBox.setScrollPerc(100);
      screen.render();
    });
    execProcess.on("close", () => {
      execBox.insertBottom("{gray-fg}\n--- Command finished ---{/gray-fg}\n");
      screen.render();
    });
  });
}

execBox.key(["q", "escape"], () => {
  if (execProcess) {
    try { execProcess.kill(); } catch (e) {}
    execProcess = null;
  }
  execBox.hide();
  execInput.hide();
  detailsBox.show();
  detailsBox.focus();
  screen.render();
});

// ---------- Binding podList for exec ----------
podList.key(["e", "E"], () => {
  const idx = podList.selected;
  if (idx <= 0) return;
  const p = pods[idx - 1];
  if (!p) return;
  startExecForPod(p.name);
});

setInterval(() => {
  refreshPods();
  updateSidebar();
}, 8000);

init();