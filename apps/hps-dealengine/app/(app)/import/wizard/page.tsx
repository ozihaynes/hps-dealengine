"use client";

import { useRouter } from "next/navigation";
import { ImportWizard } from "@/components/import";

export default function ImportWizardPage() {
  const router = useRouter();

  const handleComplete = (jobId: string) => {
    router.push(`/import?jobId=${jobId}`);
  };

  const handleCancel = () => {
    router.push("/deals");
  };

  return (
    <div className="min-h-screen p-6 sm:p-8">
      <ImportWizard
        sourceRoute="import"
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </div>
  );
}
