import CustomRulesForm from "@/components/CustomRulesForm";

export default function CustomRulesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">Custom rules</h2>
        <p className="text-sm text-slate-600">
          Add manual compliance rules based on your internal experience or known GMC patterns.
        </p>
      </div>
      <CustomRulesForm />
    </div>
  );
}
