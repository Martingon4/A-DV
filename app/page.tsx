import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
export default async function Page() {
  if (!(await auth())?.user) redirect("/login");
  return <Dashboard/>;
}
