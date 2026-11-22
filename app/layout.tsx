import "./globals.css";
export const metadata = { title: "Donaciones donde hacen falta", description: "Coordina donaciones y atiende necesidades con un reparto transparente." };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>;
}
