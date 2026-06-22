<script setup lang="ts">
import { computed } from "vue";
import { formatValueForCell, selectTableColumns } from "@/utils/resultFormatting";

const props = defineProps<{
  rows: unknown[];
}>();

const objectRows = computed(() =>
  props.rows.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object"),
);

const columns = computed(() => selectTableColumns(objectRows.value));

const visibleRows = computed(() => objectRows.value.slice(0, 50));
</script>

<template>
  <div v-if="columns.length" class="table-shell">
    <table>
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key">{{ column.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIndex) in visibleRows" :key="rowIndex">
          <td v-for="column in columns" :key="column.key">
            {{ formatValueForCell(column.getter(row as Record<string, unknown>)) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-shell {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--white);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.84rem;
}

th,
td {
  padding: 9px 12px;
  text-align: left;
  border-bottom: 1px solid var(--line);
  white-space: nowrap;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
}

th {
  font-family: var(--display-font);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-soft);
  background: rgba(13, 45, 82, 0.04);
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr:hover {
  background: var(--accent-soft);
}
</style>
