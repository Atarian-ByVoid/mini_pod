import blessed from "blessed";
import { exec, spawn } from "child_process";
import { 
    screen, 
    podList, 
    sidebar, 
    detailsBox, 
    logBox, 
    metricsBox, 
    execBox, 
    execInput 
} from "../ui/widgets.js";
import { 
    globalState, 
    setFooter, 
    refreshPods, 
    updateSidebar 
} from "./updaters.js";
import { 
    namespaceBox, 
    showNamespaceSelector, 
    contextBox, 
    showContextSelector 
} from "../ui/selectors.js";

// --------------------------------------------------
//  Funções de Detalhes
// --------------------------------------------------

function showDetailsFor(index) {
    if (index <= 0) return;
    const p = globalState.pods[index - 1];
    if (!p) return;
    
    setFooter(`fetching describe for ${p.name}...`);

    exec(
        `kubectl describe pod ${p.name} -n ${globalState.currentNamespace}`,
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

// --------------------------------------------------
//  Logs
// --------------------------------------------------

function startLogsForPodName(podName) {
    // stop previous
    if (globalState.logProcess) {
        try { globalState.logProcess.kill(); } catch (e) {}
        globalState.logProcess = null;
    }

    podList.hide();
    detailsBox.hide();
    sidebar.hide();
    logBox.top = 1;
    logBox.left = 0;
    logBox.width = "100%";
    logBox.height = "100%-2";

    logBox.setContent(`{yellow-fg}Attaching logs for ${podName}... (Ctrl+C to stop){/yellow-fg}\n`);
    logBox.show();
    logBox.focus();

    screen.render();

    // spawn logs -f
    globalState.logProcess = spawn("kubectl", ["logs", "-f", podName, "-n", globalState.currentNamespace]);
    globalState.logProcess.stdout.on("data", (d) => {
        logBox.insertBottom(d.toString());
        logBox.setScrollPerc(100);
        screen.render();
    });
    globalState.logProcess.stderr.on("data", (d) => {
        logBox.insertBottom(`{red-fg}${d.toString()}{/red-fg}`);
        logBox.setScrollPerc(100);
        screen.render();
    });
    globalState.logProcess.on("close", () => {
        logBox.insertBottom("{gray-fg}\n--- Logs ended ---{/gray-fg}");
        screen.render();
    });
}

function stopLogs() {
    if (globalState.logProcess) {
        try { globalState.logProcess.kill(); } catch (e) {}
        globalState.logProcess = null;
    }
    logBox.hide();
    detailsBox.show();
    detailsBox.focus();
    screen.render();
}

// --------------------------------------------------
//  Métricas
// --------------------------------------------------

function showMetricsForPod(podName) {
    if (globalState.metricsInterval) stopMetrics();
    detailsBox.hide();
    metricsBox.setContent(`{yellow-fg}Fetching metrics for ${podName}...{/yellow-fg}`);
    metricsBox.show();
    metricsBox.focus();
    screen.render();

    const drawBar = (value, maxLen = 30) => {
        const num = parseInt(value);
        if (isNaN(num)) return `{gray-fg}[ ${" ".repeat(maxLen)} ]{/gray-fg}`;
        const filled = Math.min(Math.floor((num / 100) * maxLen), maxLen);
        const empty = maxLen - filled;
        const barColor = num < 60 ? "green" : num < 80 ? "yellow" : "red";
        return `{${barColor}-fg}[${"█".repeat(filled)}${" ".repeat(empty)}]{/${barColor}-fg}`;
    };

    const updateMetrics = () => {
        const proc = spawn("kubectl", ["top", "pod", podName, "-n", globalState.currentNamespace, "--no-headers"]);
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
    globalState.metricsInterval = setInterval(updateMetrics, 2500);
}

function stopMetrics() {
    if (globalState.metricsInterval) {
        clearInterval(globalState.metricsInterval);
        globalState.metricsInterval = null;
    }
    metricsBox.hide();
    detailsBox.show();
    detailsBox.focus();
    screen.render();
}

// --------------------------------------------------
//  Exec
// --------------------------------------------------

function startExecForPod(podName) {
    detailsBox.hide();
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
        globalState.execProcess = spawn("kubectl", ["exec", "-n", globalState.currentNamespace, podName, "--", "sh", "-c", cmd]);
        
        globalState.execProcess.stdout.on("data", (d) => {
            execBox.insertBottom(d.toString());
            execBox.setScrollPerc(100);
            screen.render();
        });
        globalState.execProcess.stderr.on("data", (d) => {
            execBox.insertBottom(`{red-fg}${d.toString()}{/red-fg}`);
            execBox.setScrollPerc(100);
            screen.render();
        });
        globalState.execProcess.on("close", () => {
            execBox.insertBottom("{gray-fg}\n--- Command finished ---{/gray-fg}\n");
            screen.render();
        });
    });
}

execBox.key(["q", "escape"], () => {
    if (globalState.execProcess) {
        try { globalState.execProcess.kill(); } catch (e) {}
        globalState.execProcess = null;
    }
    execBox.hide();
    execInput.hide();
    detailsBox.show();
    detailsBox.focus();
    screen.render();
});

// --------------------------------------------------
//  Delete & Rollout
// --------------------------------------------------

function deleteSelectedPod() {
    const idx = podList.selected;
    if (idx <= 0) return;
    const p = globalState.pods[idx - 1];
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
                exec(`kubectl delete pod ${p.name} -n ${globalState.currentNamespace}`, (error, stdout, stderr) => {
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
    const p = globalState.pods[idx - 1];
    if (!p) return;

    setFooter(`rolling out restart for ${p.name}...`);
    exec(`kubectl rollout restart pod ${p.name} -n ${globalState.currentNamespace}`, (error, stdout, stderr) => {
        if (error) {
            setFooter(`{red-fg}Error rollout restart: ${stderr || error.message}{/red-fg}`);
        } else {
            setFooter(`rollout restart triggered for ${p.name}`);
            refreshPods();
        }
        screen.render();
    });
}


// --------------------------------------------------
//  Configuração de todos os Bindings de Teclas
// --------------------------------------------------

export function setupKeyBindings() {
    
    // --- Comandos Globais de Navegação ---
    screen.key(["tab"], () => {
        if (screen.focused === podList) {
            sidebar.focus();
        } else {
            podList.focus();
        }
    });

    screen.key(["r", "R"], () => {
        refreshPods();
        updateSidebar();
    });

    screen.key(["q"], () => {
        // Se nenhuma caixa de pop-up estiver visível, sai. 
        if (contextBox.visible || namespaceBox.visible || logBox.visible || detailsBox.visible || metricsBox.visible || execBox.visible) {
             return; // Deixa o handler específico da caixa cuidar do 'q'
        }
        process.exit(0);
    });

    // --- Seletores (Namespaces/Contexts) ---
    screen.key(["c", "C"], () => {
        if (contextBox.visible || namespaceBox.visible) return;
        showNamespaceSelector();
    });

    screen.key(["x", "X"], () => {
        if (contextBox.visible || namespaceBox.visible) return;
        showContextSelector();
    });

    // --- Ações da Lista de Pods ---
    podList.key(["enter"], () => {
        const idx = podList.selected;
        showDetailsFor(idx);
    });

    podList.key(["l", "L"], () => {
        const idx = podList.selected;
        if (idx <= 0) return;
        const p = globalState.pods[idx - 1];
        if (!p) return;
        startLogsForPodName(p.name);
    });

    podList.key(["m", "M"], () => {
        const idx = podList.selected;
        if (idx <= 0) return;
        const p = globalState.pods[idx - 1];
        if (!p) return;
        showMetricsForPod(p.name);
    });

    podList.key(["e", "E"], () => {
        const idx = podList.selected;
        if (idx <= 0) return;
        const p = globalState.pods[idx - 1];
        if (!p) return;
        startExecForPod(p.name);
    });
    
    podList.key(["d", "D"], () => {
        deleteSelectedPod();
    });
    
    podList.key(["o", "O"], () => {
        rolloutRestartPod();
    });

    // --- Ações da Caixa de Detalhes ---
    detailsBox.key(["l", "L"], () => {
        const content = detailsBox.getContent();
        const m = content.match(/Name:\s+(\S+)/);
        const name = m ? m[1] : null;
        if (name) startLogsForPodName(name);
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

    // --- Ações das Caixas de Logs/Metrics/Exec (Voltar) ---
    logBox.key(["q", "escape"], stopLogs);
    metricsBox.key(["q", "escape"], stopMetrics);
}