import {
  getActiveAppModule,
  saveActiveAppModule,
  clearActiveAppModule,
} from "./shared/storage.js";

const root = document.querySelector("#appRoot");
const moduleChooserTemplate = document.querySelector("#moduleChooserTemplate");
const steeringTemplate = document.querySelector("#steeringTemplate");
const kspTemplate = document.querySelector("#kspTemplate");

const MODULES = new Set(["steering", "ksp"]);

function renderTemplate(template) {
  root.replaceChildren(template.content.cloneNode(true));
}

async function renderModule(moduleId) {
  if (moduleId === "steering") {
    renderTemplate(steeringTemplate);
    const { mountSteering } = await import("./modules/steering.js");
    mountSteering();
    return;
  }

  if (moduleId === "ksp") {
    renderTemplate(kspTemplate);
    const { mountKsp } = await import("./modules/ksp.js");
    mountKsp();
    return;
  }

  renderModuleChooser();
}

function renderModuleChooser() {
  renderTemplate(moduleChooserTemplate);
}

function openModule(moduleId) {
  if (!MODULES.has(moduleId)) {
    renderModuleChooser();
    return;
  }

  saveActiveAppModule(moduleId);
  window.location.reload();
}

function showModules() {
  clearActiveAppModule();
  window.location.reload();
}

root.addEventListener("click", (event) => {
  const moduleButton = event.target.closest("[data-module]");
  if (moduleButton) {
    openModule(moduleButton.dataset.module);
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (actionButton?.dataset.action === "show-modules") {
    showModules();
  }
});

const activeModule = getActiveAppModule();

if (MODULES.has(activeModule)) {
  renderModule(activeModule);
} else {
  renderModuleChooser();
}
