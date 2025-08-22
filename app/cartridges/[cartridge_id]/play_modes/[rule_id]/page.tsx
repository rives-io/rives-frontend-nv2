import RulesEditor from "@/app/components/RulesEditor";

export default async function EditRule({
  params,
}: {
  params: Promise<{ cartridge_id: string; rule_id: string }>;
}) {
  const { cartridge_id, rule_id } = await params;
  return (
    <main>
      <RulesEditor cartridge_id={cartridge_id} rule_id={rule_id}></RulesEditor>
    </main>
  );
}
