# Mini Pod — Kubernetes Terminal Dashboard

**Mini Pod** is a lightweight, interactive terminal dashboard built with **Node.js** and **Blessed**.
It allows you to visualize Kubernetes pods, statuses, and logs directly from the terminal.
Inspired by the simplicity of **k9s**, it is designed for fast and minimalistic usage.

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/carlosalberto/mini-pod.git
cd mini-pod
```

### 2. Grant execution permission

```bash
chmod +x bin/mini-pod.js
```

### 3. Install dependencies

```bash
npm install
```

### 4. Install globally

```bash
npm install -g .
```

### 5. Start the application

```bash
mini-pod
```

---

## Supported Operating Systems

* Linux
* macOS

> Mini Pod runs directly in the terminal and only requires Node.js to be installed.

---

## Dependencies

The project uses the following core dependencies:

* [blessed](https://www.npmjs.com/package/blessed) — Terminal User Interface library
* [child_process](https://nodejs.org/api/child_process.html) — Executes Kubernetes CLI commands

---

## Local Development

To test or modify the project locally before installing globally:

```bash
node bin/mini-pod.js
```

Or to reinstall your local version:

```bash
npm uninstall -g mini-pod
npm install -g .
```

---

## Usage Examples

```bash
# Open the main dashboard
mini-pod

# Display help information (if implemented)
mini-pod --help
```

---

## License

Distributed under the **MIT License**.
You are free to modify, enhance, and distribute this project.

---

Developed by [Carlos Alberto](https://github.com/carlosalberto)
