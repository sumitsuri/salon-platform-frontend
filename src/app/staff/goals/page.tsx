import { redirect } from "next/navigation";

export default function StaffGoalsRedirect() {
  redirect("/staff/progress");
}
