import { exec, spawn } from "child_process";
import { 
    podList, 
    sidebar, 
    footer, 
    screen 
} from "../ui/widgets.js";
import { 
    getPodsForNamespace, 
    getTopForNamespace, 
    getCurrentContextInfo as apiGetCurrentContextInfo 
} from "../state/k8s-api.js";

// --------------------------------------------------
// ---------- Estado Global (Centralizado) ----------
// --------------------------------------------------
export const globalState = {
    pods: [],
    currentNamespace: "default",
    logProcess: null,
    currentContext: "unknown",
    currentCluster: "unknown",
    metricsInterval: null,
    podList: podList,
    
    getCurrentContextInfo: (cb) => {
        apiGetCurrentContextInfo((ctx, cluster) => {
            globalState.currentContext = ctx;
            globalState.currentCluster = cluster;
            cb && cb();
        });
    }
};

// --------------------------------------------------
//  Funções Utilitárias de UI
// --------------------------------------------------

export function setFooter(text) {
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

// --------------------------------------------------
//  Funções de Atualização da UI
// --------------------------------------------------

export function initAppState() {
    setFooter("initializing...");
    // Configura listeners de exit
    screen.key(["C-c"], () => {
        if (globalState.logProcess) try { globalState.logProcess.kill(); } catch (e) {}
        process.exit(0);
    });
}

export function updateSidebar() {
    globalState.getCurrentContextInfo(() => {
        const header = `{bold}{magenta-fg}Context:{/magenta-fg}{/bold} ${globalState.currentContext}\n{bold}{cyan-fg}Cluster:{/cyan-fg}{/bold} ${globalState.currentCluster}\n{bold}Namespace:{/bold} ${globalState.currentNamespace}\n\n`;
        getTopForNamespace(globalState.currentNamespace, (err, top) => {
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

export function refreshPods() {
    setFooter("refreshing pods...");
    getPodsForNamespace(globalState.currentNamespace, (err, list) => {
        if (err) {
            podList.setItems([`{red-fg}Error fetching pods: ${err.message}{/red-fg}`]);
            setFooter("error");
            screen.render();
            return;
        }
        globalState.pods = list;

        const padColor = (coloredText, totalLen) => {
            const clean = coloredText.replace(/\{[^}]+\}/g, "");
            const padSize = Math.max(totalLen - clean.length, 0);
            return coloredText + " ".repeat(padSize);
        };

        const headerLine = `{bold}{cyan-fg}${pad("POD", 48)}${pad("STATUS", 14)}RESTARTS{/cyan-fg}{/bold}`;

        const items = [headerLine].concat(
            globalState.pods.map((p) => {
                const name = pad(p.name, 48);
                const statusColored = colorizeStatus(p.status);
                const statusPadded = padColor(statusColored, 14);
                const rest = p.restarts.toString().padStart(4, " ");
                return `${name}${statusPadded}${rest}`;
            })
        );

        podList.setItems(items);
        setFooter(`pods: ${globalState.pods.length}`);
        screen.render();
    });
}