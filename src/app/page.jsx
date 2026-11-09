import { redirect } from 'next/navigation';

// /connexion is the single entry point of the app.
export default function RootPage() {
  redirect('/connexion');
}
