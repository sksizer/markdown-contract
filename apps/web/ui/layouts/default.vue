<script setup lang="ts">
// Thin app-shell layout: a header band + a centered content column.
</script>

<template>
  <div class="shell">
    <header class="shell__header">
      <div class="shell__bar">
        <div class="shell__brand">
          <span class="shell__logo">md</span>
          <div>
            <h1 class="shell__title">markdown-contract</h1>
            <p class="shell__subtitle">local vault dashboard</p>
          </div>
        </div>
        <span class="shell__tag">daemon</span>
      </div>
    </header>

    <main class="shell__main">
      <slot />
    </main>

    <footer class="shell__footer">
      markdown-contract daemon · localhost only · the daemon reads your vaults, it never edits them
    </footer>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.shell__header {
  background: var(--mc-surface);
  border-bottom: 1px solid var(--mc-border);
}
.shell__bar {
  max-width: 1040px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.shell__brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.shell__logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--mc-text);
  color: #fff;
  font-family: var(--mc-mono);
  font-weight: 700;
}
.shell__title {
  margin: 0;
  font-size: 1.1rem;
}
.shell__subtitle {
  margin: 0;
  font-size: 0.8rem;
  color: var(--mc-text-muted);
}
.shell__tag {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--mc-warn);
  background: var(--mc-warn-bg);
  padding: 4px 10px;
  border-radius: 999px;
}
.shell__main {
  flex: 1;
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  padding: 28px 24px;
}
.shell__footer {
  text-align: center;
  padding: 16px;
  font-size: 0.78rem;
  color: var(--mc-text-muted);
  border-top: 1px solid var(--mc-border);
}
</style>
