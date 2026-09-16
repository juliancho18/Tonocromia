import { sql, ensureSchema } from "../lib/db";

const LABELS = Array.from({ length: 17 }, (_, i) => `Fragmento ${i + 1}`);

async function main() {
  await ensureSchema();
  for (let i = 0; i < LABELS.length; i++) {
    await sql`
      insert into fragments (id, label, order_index, active)
      values (${`f${i + 1}`}, ${LABELS[i]}, ${i}, false)
      on conflict (id) do nothing
    `;
  }
  console.log("Seeded", LABELS.length, "fragments");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
