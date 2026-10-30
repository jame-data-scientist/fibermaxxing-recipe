import { signOutAdmin } from "@/app/actions/admin-auth";

export function SignOutButton() {
  return (
    <form action={signOutAdmin}>
      <button
        type="submit"
        className="text-[12px] text-moss underline decoration-line-strong underline-offset-4 hover:text-ink"
      >
        Lock admin
      </button>
    </form>
  );
}
