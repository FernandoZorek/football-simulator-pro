<!-- src/components/MatchPlaceholder.vue -->
<script setup lang="ts">
</script>

<template>
  <div class="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800/50 border border-slate-700 w-[90px] opacity-40 border-dashed">
    <div class="flex justify-center py-1">
      <div class="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-sm">?</div>
    </div>

    <div class="text-center text-[14px] font-mono my-1 text-slate-500">
      – x –
    </div>

    <div class="flex justify-center py-1">
      <div class="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-sm">?</div>
    </div>
  </div>
</template>

<style scoped>
.match-placeholder {
  min-height: 122px;
}
</style>