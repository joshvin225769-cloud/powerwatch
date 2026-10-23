import { redirect } from "next/navigation";

/**
 * The dashboard uses /login as its authentication entry point.
 * Keep that route available while reusing the existing Supabase-backed
 * administrator sign-in page and its admin_users authorization check.
 */
export default function LoginPage() {
  redirect("/admin/login");
}
