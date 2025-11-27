### Option B – Treat diagrams as `.mmd` diagrams (more “pure”)

- Use `.mmd` files
- No code fences
- Preview with **Mermaid OSS** (via Command Palette: “Mermaid: Preview”)

---

## Why you still see “Syntax error in text”

Because up to now, you’ve been:

- Editing a `.mmd` file
- Using the **Markdown** preview (👁️) which expects **Markdown**, not raw Mermaid
- It tries to parse it as markdown text, fails, and tells you “syntax error”

Once you:

- Either use `.md` + fences with the 👁️ eye, or
- Use `.mmd` + _Mermaid Preview_ command,

that error should vanish.

---

### If you’d like, I can

- Convert **all Akin diagrams** into ready-to-paste **Markdown files** with `mermaid` fences, so they work 100% with your current 👁️ setup  
  **or**
- Assume you’ll use `.mmd` + Mermaid OSS, and keep giving you raw Mermaid (no fences).

Tell me which you prefer:

- **MD** → Markdown + fences, use 👁️
- **MMD** → Pure Mermaid files, use Mermaid Preview command

Reply with **MD** or **MMD**, and I’ll reformat all the Akin diagrams to match that workflow so you don’t have to fight the tools anymore.
