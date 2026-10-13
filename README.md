# Vyut Notes

Vyut Notes is a modern, static, single-page application (SPA) designed as a smart learning platform for notes across all subjects (e.g., Computer Science, Physics, Theory, Programming). It supports reading structured notes and — where applicable — writing and executing code directly within the browser. It features a completely serverless architecture and a lightweight, responsive UI suitable for textbooks, tutorials, and interactive code playgrounds.

## Features
 
*   **Integrated Playground (IDE):** 
    *   **Local Execution:** Run HTML/CSS/JS and Python (via Skulpt) natively in the browser without any backend API.
    *   **Multi-Language Support:** Execute compiled languages like C, C++, and Java via the Piston API fallback.
    *   **Interactive Prompts:** Custom bottom-sheet UI for Python's `input()` function that blocks browser autofill.
*   **Modern UI/UX:** Clean, card-based interface with automatic system-preference Dark/Light mode and smooth bottom-sheet modals.
*   **Advanced Code Editor:** Includes syntax highlighting, line numbers, tab-spacing support, and Fira Code font ligatures.
*   **Rich Text Formatting:** Custom markdown-like parser supporting **bold**, *italic*, __underline__, `inline code`, and fully structured | tables |.
    - New lines inside JSON content can be represented using `/n` or `\n` (both are accepted and will be rendered as line breaks in the viewer).
    - Automatic question numbering has been disabled. Questions listed in the JSON will be displayed verbatim (use explicit numbering inside the text if you want numbers to appear).
*   **Bilingual Support:** Easily toggle between English and Hindi notes globally.
*   **Zero Configuration Hosting:** 100% static files. Perfectly optimized for GitHub Pages with no external server routing needed.

## Project Structure

The project dynamically scans folders. Each folder represents a chapter and contains its respective metadata and bilingual note files.

```text
/
├── index.html           # Main entry point
├── style.css            # Stylesheet (UI, Dark Mode, Code Editor)
├── app.js               # Core logic (Routing, Editor, Skulpt Engine)
├── chapters.json        # Fallback list of chapters (if GitHub API limits are reached)
├── logo.png             # Root logo used in headers (shown for non-programming/theory chapters)
├── banner.jpg           # Banner image used for social media sharing and previews
└── folder_name/         # Example Chapter Folder (e.g., /python_basics)
    ├── skill.json       # Metadata (Title, Class, Programming config)
    ├── english.json     # English notes content
    └── hindi.json       # Hindi notes content
```

## How to Add a New Chapter

1. Create a Folder
Create a new folder in the root directory. The folder name will be the URL hash (e.g., creating a folder named `networking` will be accessible at `domain.com/#/networking`).
> ⚠️ Note: Do not use reserved names like `index.html`, `style.css`, `app.js`, `chapters.json`, `logo.png`, or `banner.jpg` for folder names.

2. Add `skill.json`
Inside your new folder, create a `skill.json` file for metadata.

```json
{
  "title": {
    "en": "Python Basics",
    "hi": "पायथन बेसिक्स"
  },
  "description": {
    "en": "Learn the basics of Python programming.",
    "hi": "पायथन प्रोग्रामिंग के बेसिक्स सीखें।"
  },
  "class": "8",
  "programming": true,
  "language": "python",
  "execution": "interpreter"
}
```

Non-programming (Theory) chapter rule:
- For subjects like Physics or other theory-only chapters, set `"programming": false` in `skill.json`. When `programming` is `false`, the chapter header will show the project logo (from `logo.png`) instead of the compiler/execution slider and IDE controls.

Example `skill.json` for a Physics / Theory chapter:

```json
{
  "title": { "en": "Newtonian Mechanics", "hi": "न्यूटनियन यांत्रिकी" },
  "description": { "en": "Introductory physics theory notes.", "hi": "प्रारम्भिक भौतिकी के नोट्स।" },
  "class": "11",
  "programming": false,
  "language": "none"
}
```

3. Add Content (`english.json` & `hindi.json`)
Create the content files using this structure:

```json
{
  "summary": "This is a brief summary of the chapter.",
  "sections": [
    {
      "heading": "Introduction",
      "text": "You can use **bold**, *italic*, and __underline__ here. Use /n or \\n for new lines inside JSON strings.",
      "points": ["Point 1", "Point 2"],
      "tip": "This is an important highlight box."
    }
  ],
  "questions": [
    {
      "q": "Write a program to print Hello World.",
      "answer": "Use the `print()` function.",
      "code": "print('Hello, World!')",
      "algorithm": ["Start", "Print Hello World", "Stop"]
    }
  ]
}
```

Notes on formatting:
- Use `/n` or `\\n` inside JSON strings to indicate a line break; the renderer accepts both and will render a new line in the viewer.
- Questions will be rendered as provided in the JSON. Automatic numbering for questions is disabled — add explicit numbering in the question text if you require numbered questions.

## Deployment
* This project is built for GitHub Pages.
* Simply push the code to your GitHub repository and enable GitHub Pages from the repository settings (deploying from the `main` branch or `/root` directory).
* Since routing is handled entirely via JavaScript Hash URLs (`/#/chapter-name`), no backend configuration or URL rewrites are required!
