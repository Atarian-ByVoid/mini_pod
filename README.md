# 🐳 Mini Pod — Kubernetes Terminal Dashboard

Uma ferramenta leve e interativa feita em **Node.js + Blessed** para visualizar pods, status e logs diretamente no terminal.  
Inspirado na simplicidade do **k9s**, mas projetado para uso rápido e minimalista.

---

## 🚀 Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/carlosalberto/mini-pod.git
cd mini-pod
```

### 2. Dê permissão de execução
```bash
chmod +x bin/mini-pod.js
```
### 3. Instale globalmente
```bash
npm install -g .
```
### 4. Instale globalmente
```bash
npm install -g .
```
### 5. Inicie o projeto
```bash
mini-pod
```

---

## ⚙️ Sistemas operacionais compatíveis
- 🐧 **Linux**
- 🍎 **macOS**

> 💡 O Mini Pod é executado diretamente no terminal e requer apenas o Node.js instalado.

---

## 🧰 Dependências
O projeto utiliza:
- [blessed](https://www.npmjs.com/package/blessed) → interface TUI no terminal  
- [child_process](https://nodejs.org/api/child_process.html) → execução de comandos do Kubernetes

---

## 🧩 Desenvolvimento local

Se quiser testar alterações antes de instalar globalmente:

```bash
node bin/mini-pod.js
```

Ou reinstalar a versão local:

```bash
npm uninstall -g mini-pod
npm install -g .
```

---

## 🪄 Exemplos de uso

```bash
# Abre o painel principal
mini-pod

# Mostra ajuda (caso implementado)
mini-pod --help
```

---

## 📄 Licença
Distribuído sob a licença **MIT**.  
Sinta-se livre para modificar, aprimorar e compartilhar! ✨

---

Feito por [Carlos Alberto](https://github.com/carlosalberto)
