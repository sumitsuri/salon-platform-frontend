import { redirect } from "next/navigation";

export default function StaffAttendanceRedirect() {
  redirect("/employee/time");
}
