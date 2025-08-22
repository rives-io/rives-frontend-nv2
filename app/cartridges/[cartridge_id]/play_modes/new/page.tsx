import RulesEditor from "@/app/components/RulesEditor";

export default async function NewRule({
  params,
}: {
  params: Promise<{ cartridge_id: string }>;
}) {
  const { cartridge_id } = await params;
  return (
    <main>
      <RulesEditor cartridge_id={cartridge_id}></RulesEditor>
    </main>
  );
}
