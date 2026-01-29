import { showOverlay, hideOverlay } from '/index.js';

export async function loadLogin() {
  const response = await fetch('/assets/subpages/login/login.html');
  const html = await response.text();
  await showOverlay('login', html);
  document.getElementById('js_back_btn').addEventListener('click', hideOverlay);
}
