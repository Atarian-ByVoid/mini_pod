#!/usr/bin/env node

// --------------------------------------------------
// 🐳 Módulos e Configuração Inicial (Mini Pod)
// --------------------------------------------------

import { exec } from "child_process";
import { screen } from "./src/ui/widgets.js";
import {
    initAppState,
    refreshPods,
    updateSidebar,
    globalState
} from "./src/core/updaters.js";
import { setupKeyBindings } from "./src/core/bindings.js";

// --------------------------------------------------
//  Inicialização e Loop de Atualização
// --------------------------------------------------

function init() {
    initAppState();
    
    exec("kubectl config view --minify --output 'jsonpath={..namespace}'", (err, out) => {
        globalState.currentNamespace = (out || "").trim() || "default";
        
        setupKeyBindings();
        
        globalState.getCurrentContextInfo(() => {
            refreshPods();
            updateSidebar();
            globalState.podList.focus();
            screen.render();
        });
    });

    setInterval(() => {
        refreshPods();
        updateSidebar();
    }, 8000);
}

init();