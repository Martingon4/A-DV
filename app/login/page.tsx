import { signIn } from "@/lib/auth";
export default function Login() {
  return <main className="login"><div className="brandmark">d.</div><p className="eyebrow">RED COMUNITARIA</p>
    <h1>Donaciones donde<br/>hacen falta.</h1><p>Conecta cada donación con una necesidad.<br/>Coordina, reparte y acompaña cada entrega.</p>
    <form action={async () => { "use server"; await signIn("google", { redirectTo: "/" }); }}>
      <button>Continuar con Google</button></form>
    {process.env.DEMO_AUTH === "true" && process.env.NODE_ENV !== "production" && <div className="demo-login"><p>Demostración local · datos ficticios</p>
      <form action={async () => { "use server"; await signIn("credentials", { profile:"coordinator", redirectTo:"/" }); }}><button>Entrar como coordinación</button></form>
      <form action={async () => { "use server"; await signIn("credentials", { profile:"center", redirectTo:"/" }); }}><button className="secondary">Entrar como Centro Esperanza</button></form>
    </div>}</main>;
}
