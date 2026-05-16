import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Building2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Leadlink" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoading(false); return toast.error(error.message); }
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", data.user!.id).eq("role", "admin").maybeSingle();
    setLoading(false);
    toast.success("Bem-vindo!");
    navigate({ to: roleRow ? "/admin" : "/dashboard" });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: name },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Verifique seu e-mail.");
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-background">
      <div className="relative hidden lg:block overflow-hidden gradient-navy">
        <div className="absolute inset-0 opacity-50 mix-blend-overlay"
          style={{ backgroundImage: "url(https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80)", backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute inset-0 bg-gradient-to-tr from-navy/90 via-navy/40 to-transparent" />
        <div className="relative h-full flex flex-col justify-between p-12 text-navy-foreground">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl gradient-gold flex items-center justify-center"><Building2 className="h-5 w-5 text-navy" /></div>
            <span className="text-xl font-bold">Leadlink</span>
          </div>
          <div className="max-w-md space-y-4">
            <div className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-gold/20 text-gold border border-gold/30">Plataforma Premium</div>
            <h2 className="text-4xl font-bold leading-tight">Transforme leads em <span className="text-gold">vendas</span> com inteligência.</h2>
            <p className="text-navy-foreground/70">Capture, qualifique e converta leads imobiliários com automações em uma única plataforma.</p>
          </div>
          <div className="text-xs text-navy-foreground/50">© 2026 Leadlink</div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl gradient-gold flex items-center justify-center"><Building2 className="h-5 w-5 text-navy" /></div>
            <span className="text-xl font-bold">Leadlink</span>
          </div>

          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-6">
              <div>
                <h1 className="text-2xl font-bold">Bem-vindo de volta</h1>
                <p className="text-muted-foreground text-sm">Acesse sua conta Leadlink.</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Senha</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                <Button type="submit" disabled={loading} className="w-full h-11 bg-gold text-navy hover:bg-gold/90 font-semibold">
                  {loading ? "Entrando…" : <>Entrar <ArrowRight className="ml-1 h-4 w-4" /></>}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-6">
              <div>
                <h1 className="text-2xl font-bold">Crie sua conta grátis</h1>
                <p className="text-muted-foreground text-sm">Comece com o plano gratuito.</p>
              </div>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2"><Label>Nome completo</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
                <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Senha</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
                <Button type="submit" disabled={loading} className="w-full h-11 bg-navy text-navy-foreground hover:bg-navy/90 font-semibold">
                  {loading ? "Criando…" : "Criar conta grátis"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
