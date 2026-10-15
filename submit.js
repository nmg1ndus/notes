/* ---------- Vyut Code-a-Thon Submission & Anti-Paste Module ---------- */

// 1. कम्पटीशन मोड में कोड एडिटर के अंदर Paste और Drag-Drop रोकना
document.addEventListener('paste', function(e) {
  if (e.target && e.target.id === 'code-editor' && currentSkill && currentSkill.submit) {
    e.preventDefault();
    toast('Pasting is not allowed in competition!');
  }
}, true);

document.addEventListener('drop', function(e) {
  if (e.target && e.target.id === 'code-editor' && currentSkill && currentSkill.submit) {
    e.preventDefault();
    toast('Drag & Drop is disabled!');
  }
}, true);

document.addEventListener('beforeinput', function(e) {
  if (e.target && e.target.id === 'code-editor' && currentSkill && currentSkill.submit) {
    if (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop') {
      e.preventDefault();
      toast('Pasting is not allowed in competition!');
    }
  }
}, true);

// 2. हेडर में Run/Code बटन के साथ 'Submit' बटन जोड़ना
const _origUpdateHeader = updateHeader;
updateHeader = function(isIndex, s = null) {
  _origUpdateHeader(isIndex, s);

  if (!isIndex && s && s.submit && (currentAppState === 'EDITOR' || currentAppState === 'OUTPUT')) {
    const right = document.getElementById('header-right');
    if (right) {
      right.style.display = 'flex';
      right.style.gap = '8px';
      const sendIcon = icon('M22 2L11 13', 'M22 2l-7 20-4-9-9-4 20-7z');
      const submitBtn = el('button', {
        className: 'action-btn submit-top-btn',
        onclick: openSubmitSheet
      }, sendIcon, el('span', {}, 'Submit'));
      right.append(submitBtn);
    }
  }
};

// 3. डेडलाइन (Last Date & Time) चेक करने का फंक्शन
function isDeadlinePassed(deadlineStr) {
  if (!deadlineStr) return false;
  const deadlineDate = new Date(deadlineStr);
  return !isNaN(deadlineDate) && new Date() > deadlineDate;
}

function formatDeadline(deadlineStr) {
  if (!deadlineStr) return '';
  const d = new Date(deadlineStr);
  if (isNaN(d)) return deadlineStr;
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

// 4. सबमिशन बॉटम-शीट खोलना
function openSubmitSheet() {
  if (!currentSkill || !currentSkill.submit) return;

  // डेडलाइन चेक करें
  if (isDeadlinePassed(currentSkill.deadline)) {
    showError('Submission Closed!\nThe last date and time to submit was:\n' + formatDeadline(currentSkill.deadline));
    return;
  }

  const editor = document.getElementById('code-editor');
  const code = editor ? editor.value.trim() : '';
  if (!code || code === '// Write your code here') {
    toast('Please write your program before submitting!');
    return;
  }

  sheet.classList.remove('short');
  sheet.classList.add('tall-sheet');
  document.getElementById('sheet-title').innerHTML = 'Submit Project (.py)';

  const deadlineBanner = currentSkill.deadline
    ? el('div', { className: 'deadline-note' }, '⏰ Last Date: ' + formatDeadline(currentSkill.deadline))
    : null;

  const mkInput = (placeholder, id, required = true) => el('input', {
    type: 'text',
    id: id,
    className: 'submit-field',
    placeholder: placeholder + (required ? ' *' : ' (Optional)'),
    autocomplete: 'off'
  });

  const teamInput = mkInput('Team Name (e.g. Alpha_Coders)', 'sub-team', true);
  const s1Input = mkInput('Student 1 Name (Team Leader)', 'sub-s1', true);
  const s2Input = mkInput('Student 2 Name', 'sub-s2', true);
  const s3Input = mkInput('Student 3 Name', 'sub-s3', true);
  const s4Input = mkInput('Student 4 Name', 'sub-s4', true);
  const s5Input = mkInput('Student 5 Name', 'sub-s5', true);
  const s6Input = mkInput('Student 6 Name', 'sub-s6', true);

  const submitBtn = el('button', {
    type: 'button',
    className: 'input-prompt-btn',
    onclick: async () => {
      if (isDeadlinePassed(currentSkill.deadline)) {
        closeSheet();
        showError('Submission time just expired!');
        return;
      }

      const teamName = teamInput.value.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const s1 = s1Input.value.trim();
      const s2 = s2Input.value.trim();
      const s3 = s3Input.value.trim();
      const s4 = s4Input.value.trim();
      const s5 = s5Input.value.trim();
      const s6 = s6Input.value.trim();

      if (!teamName || !s1) {
        toast('Please enter Team Name and at least Student 1 name!');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Uploading ' + teamName + '.py ...';

      try {
        const res = await fetch(currentSkill.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ teamName, s1, s2, s3, s4, s5, s6, code })
        });
        const result = await res.json();

        if (result.status === 'success') {
          sheet.classList.remove('tall-sheet');
          closeSheet();
          toast('🎉 ' + teamName + '.py Submitted Successfully!');
        } else {
          throw new Error(result.message || 'Submission error');
        }
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Project';
        toast('Error: Could not submit. Check internet connection.');
      }
    }
  }, 'Submit Project');

  const formWrap = el('div', { className: 'submit-form' },
    deadlineBanner,
    teamInput, s1Input, s2Input, s3Input, s4Input, s5Input, s6Input,
    submitBtn
  );

  sheetBody.replaceChildren(formWrap);
  backdrop.hidden = false;
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
  
