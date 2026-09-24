import SectionHeading from "@/components/SectionHeading";
import RegistrationForm from "@/components/RegistrationForm";

export const metadata = { title: "Register | NIFT Jodhpur Converge 2026" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <SectionHeading
        eyebrow="NIFT Jodhpur Selection Process"
        title="Register Your Interest"
        description="Fill in your details and choose 2 Major Events + 1 Minor Event to enter the NIFT Jodhpur selection process for CONVERGE 2026."
      />
      <div className="mt-10">
        <RegistrationForm />
      </div>
    </div>
  );
}
