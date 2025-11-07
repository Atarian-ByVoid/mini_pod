import blessed from "blessed";
import { spawn, exec } from "child_process";
import { screen, podList, footer } from "./widgets.js";
import { globalState, setFooter, refreshPods, updateSidebar } from "../core/updaters.js";

// --------------------------------------------------
//  Seletor de Namespace
// --------------------------------------------------

export const namespaceBox = blessed.list({
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

export function showNamespaceSelector() {
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
                    ns === globalState.currentNamespace
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
    screen.render();
    podList.focus();
    screen.render();
});

namespaceBox.key(["enter"], () => {
    const selected = namespaceBox.getItem(namespaceBox.selected)?.content;
    const ns = selected.replace(/\{[^}]+\}/g, "").replace("(current)", "").trim();
    if (!ns || ns === globalState.currentNamespace) {
        namespaceBox.hide();
        podList.focus();
        screen.render();
        return;
    }
    globalState.currentNamespace = ns;
    namespaceBox.hide();
    setFooter(`namespace switched to ${ns}`);
    refreshPods();
    updateSidebar();
    podList.focus();
    screen.render();
});


// --------------------------------------------------
//  Seletor de Contexto
// --------------------------------------------------

export const contextBox = blessed.list({
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

export function showContextSelector() {
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
                ctx === globalState.currentContext
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
    if (!ctx || ctx === globalState.currentContext) {
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
            globalState.currentContext = ctx;
            contextBox.hide();
            refreshPods();
            updateSidebar();
            podList.focus();
            setFooter(`context switched to ${ctx}`);
        }
        screen.render();
    });
});