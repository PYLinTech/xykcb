import { showOverlay, hideOverlay } from '/index.js';

const welcomeVersion = 260209;

export function initWelcome() {
  const localWelcomeVersion = localStorage.getItem('localWelcomeVersion');
  if (!localWelcomeVersion || Number(localWelcomeVersion) < welcomeVersion) {
    loadWelcome();
  }
}

async function loadWelcome() {
  const response = await fetch('/assets/subpages/welcome/welcome.html');
  const html = await response.text();
  await showOverlay('welcome', html);
  bindEvents();
}

function bindEvents() {
  document.getElementById('js_agree_btn').addEventListener('click', agree);
  document.getElementById('js_disagree_btn').addEventListener('click', disagree);
}

function agree() {
  localStorage.setItem('localWelcomeVersion', welcomeVersion);
  hideOverlay();
}

function disagree() {
  console.log('xykcb:exit');
  window.location.href = 'https://www.pylin.cn';
}
