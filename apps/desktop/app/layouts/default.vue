<template>
  <!-- App frame: the kit's window-chrome tone (theme.css tokens), light + dark. -->
  <div class="app-shell">
    <slot />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--mc-bg);
  color: var(--mc-text);
  font-family: var(--mc-font);
  font-size: 13px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}
</style>
