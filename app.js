  // --- PLAYGROUND SETUP (Editor & Output) ---
  const isHTML = (s.language || '').toLowerCase() === 'html';
  const langStr = (s.language || '').toLowerCase();
  
  playgroundFiles = {
      html: localStorage.getItem('code_' + id + '_html') !== null ? localStorage.getItem('code_' + id + '_html') : '<h1>Hello, World!</h1>\n<div class="box">Let\'s code in HTML, CSS & JS!</div>\n<button onclick="greet()">Click Me</button>',
      css: localStorage.getItem('code_' + id + '_css') !== null ? localStorage.getItem('code_' + id + '_css') : 'body {\n  font-family: sans-serif;\n  padding: 20px;\n}\n.box {\n  color: white;\n  background: #059669;\n  padding: 15px;\n  border-radius: 8px;\n  margin-bottom: 15px;\n}',
      js: localStorage.getItem('code_' + id + '_js') !== null ? localStorage.getItem('code_' + id + '_js') : 'function greet() {\n  alert("Awesome! JavaScript is working.");\n}'
  };
  currentFileExt = 'html';

  const defaultCodes = {
      'python': 'a = int(input("Enter first number: "))\nb = int(input("Enter second number: "))\ntotal = a + b\nprint("Sum =", total)',
      'javascript': 'console.log("Hello, World!");',
      'c': '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
      'c++': '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}'
  };
  
  const editorArea = el('textarea', { id: 'code-editor', spellcheck: false, autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', wrap: 'off' });
  
  // सेव किए गए कोड को निकालना (अगर बॉक्स खाली भी छोड़ा है, तो खाली ही लोड होगा, डिफ़ॉल्ट नहीं)
  const savedCode = localStorage.getItem('code_' + id + '_' + langStr);
  editorArea.value = isHTML ? playgroundFiles.html : (savedCode !== null ? savedCode : (defaultCodes[langStr] || '// Write your code here'));
  
  const highlighter = el('pre', { id: 'code-highlighter' });
  const lineNumbers = el('div', { id: 'line-numbers', className: 'line-numbers' });

  editorArea.addEventListener('input', e => {
      const val = e.target.value;
      if(isHTML) playgroundFiles[currentFileExt] = val;
      const key = 'code_' + id + '_' + (isHTML ? currentFileExt : langStr);
      localStorage.setItem(key, val);
      syncEditorLogic();
  });
  
  editorArea.addEventListener('scroll', syncEditorScroll);
  
  editorArea.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
          e.preventDefault();
          const start = editorArea.selectionStart;
          const end = editorArea.selectionEnd;
          editorArea.value = editorArea.value.substring(0, start) + "    " + editorArea.value.substring(end);
          editorArea.selectionStart = editorArea.selectionEnd = start + 4;
          
          if(isHTML) playgroundFiles[currentFileExt] = editorArea.value;
          const key = 'code_' + id + '_' + (isHTML ? currentFileExt : langStr);
          localStorage.setItem(key, editorArea.value);
          
          syncEditorLogic();
      }
  });

  let fileTabsBar = null;
  if (isHTML) {
      const mkTab = (ext, label) => {
          const btn = el('button', { className: 'file-tab' + (ext === 'html' ? ' active' : '') }, label);
          btn.onclick = () => {
              document.querySelectorAll('.file-tab').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              currentFileExt = ext;
              editorArea.value = playgroundFiles[ext];
              syncEditorLogic();
          };
          return btn;
      };
      fileTabsBar = el('div', { className: 'file-tabs' }, mkTab('html', 'index.html'), mkTab('css', 'style.css'), mkTab('js', 'script.js'));
  }

  const codeAreaWrapper = el('div', { className: 'code-area-wrapper' }, highlighter, editorArea);
  const editorContainer = el('div', { className: 'editor-container' + (isHTML ? ' with-tabs' : '') }, lineNumbers, codeAreaWrapper);

  const editorWrap = el('div', { style: 'display:flex; flex-direction:column; height:100%;' });
  if (fileTabsBar) editorWrap.append(fileTabsBar);
  editorWrap.append(editorContainer);

  const editorView = el('div', { id: 'editor-view', style: 'display:none;' }, editorWrap);
  const outputView = el('div', { id: 'output-view', style: 'display:none;' }, el('pre', { id: 'output-console' }));
  
  const playgroundView = el('div', { id: 'playground-view', style: 'display:none;' }, editorView, outputView);
  
  app.lang = lang;
  app.replaceChildren(notesView, playgroundView);
  
  setTimeout(syncEditorLogic, 10);
  updateHeader(false, currentSkill);
}
