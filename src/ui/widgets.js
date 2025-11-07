import blessed from "blessed";

// --------------------------------------------------
//  Configuração da Tela
// --------------------------------------------------

export const screen = blessed.screen({
    smartCSR: true,
    title: "Mini Pod — 🐳",
    fullUnicode: true,
    dockBorders: true,
    style: { bg: "black", fg: "white" },
});

// --------------------------------------------------
//  Elementos Estáticos
// --------------------------------------------------

export const header = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: "100%",
    height: 1,
    tags: true,
    content:
      " {magenta-fg}MiniPod{/magenta-fg} 🐳 ·  Theme: {cyan-fg}Dark Magenta/Cyan{/cyan-fg}  ·  Controls: " +
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

export const sidebar = blessed.box({
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

export const footer = blessed.box({
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

// --------------------------------------------------
//  Elementos de Listagem e Detalhes
// --------------------------------------------------

export const podList = blessed.list({
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

export const detailsBox = blessed.box({
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

// --------------------------------------------------
//  Elementos de Ações Específicas (Logs, Metrics, Exec)
// --------------------------------------------------

export const logBox = blessed.box({
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

export const metricsBox = blessed.box({
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

export const execBox = blessed.box({
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

export const execInput = blessed.textbox({
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