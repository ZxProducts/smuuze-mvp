import { redirect } from "next/navigation"

export default function Home() {
  redirect("/time-tracker")
  return null
}

