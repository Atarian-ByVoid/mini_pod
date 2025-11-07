import { exec, spawn } from "child_process";

// --------------------------------------------------
//  Funções de Interação com KUBECTL
// --------------------------------------------------

/**
 * Executa um comando kubectl e tenta parsear a saída como JSON.
 */
export function runJsonCmd(cmdArgs, callback) {
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

/**
 * Obtém os dados de um Pods em um Namespace específico.
 */
export function getPodsForNamespace(namespace, cb) {
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

/**
 * Obtém o 'top' (uso de CPU/Memória) dos Pods em um Namespace.
 */
export function getTopForNamespace(namespace, cb) {
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

/**
 * Obtém informações do contexto atual do Kubernetes.
 */
export function getCurrentContextInfo(cb) {
    exec("kubectl config current-context", (err, stdout) => {
        let currentContext = (stdout || "").trim() || "unknown";
        exec(
            "kubectl config view --minify -o jsonpath='{.clusters[0].name}'",
            (e2, stdout2) => {
                let currentCluster = (stdout2 || "").replace(/'/g, "").trim() || "unknown";
                cb(currentContext, currentCluster);
            }
        );
    });
}