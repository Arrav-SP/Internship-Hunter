import Link from "next/link";
import { signOut } from "../login/actions";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <nav className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-3 text-sm font-medium">
          <Link href="/">Dashboard</Link>
          <Link href="/opportunities">Opportunities</Link>
          <Link href="/contacts">Contacts</Link>
          <Link href="/profile">Profile</Link>
          <form action={signOut} className="ml-auto">
            <button type="submit" className="text-muted-foreground hover:text-foreground">Sign out</button>
          </form>
        </div>
      </nav>
      {children}
    </>
  );
}
