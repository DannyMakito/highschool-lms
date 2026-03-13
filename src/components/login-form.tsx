import { useState, type ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GraduationCap } from "lucide-react"
import {
  FieldGroup,
} from "@/components/ui/field"
import { useAuth } from "@/context/AuthContext"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

export function LoginForm({
  className,
  ...props
}: ComponentProps<"div">) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pin) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email, pin);

      if (result.success) {
        toast.success("Welcome back!");
        setIsLoading(false);
        navigate("/", { replace: true });
      } else {
        toast.error(result.message || "Invalid credentials");
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred: " + (error.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0 border-2 shadow-xl hover:shadow-2xl transition-all duration-500">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-10 flex flex-col justify-center" onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center mb-8">
                <div className="bg-primary/10 p-3 rounded-2xl mb-2">
                  <img src="/images/afrinexel.png" alt="Logo" className="h-10 w-auto" />
                </div>
                <h1 className="text-3xl font-black tracking-tight">Portal Login</h1>
                <p className="text-muted-foreground font-medium text-sm">
                  Enter your school credentials to continue
                </p>
              </div>

              <div className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-xs font-black uppercase tracking-wider text-muted-foreground">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@school.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 border-2 focus-visible:ring-primary font-medium"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pin" className="text-xs font-black uppercase tracking-wider text-muted-foreground">Security PIN</Label>
                    <a href="#" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Forgot PIN?</a>
                  </div>
                  <Input
                    id="pin"
                    type="password"
                    maxLength={6}
                    placeholder="••••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="h-12 border-2 focus-visible:ring-primary font-black tracking-[0.5em] text-center text-lg"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-14 text-lg font-black rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all mt-4"
                  disabled={isLoading}
                >
                  {isLoading ? "Authenticating..." : "Sign In to Dashboard"}
                </Button>
              </div>

              <div className="relative text-center text-sm mt-8">
                <span className="relative z-10 bg-white px-2 text-muted-foreground font-bold text-[10px] uppercase tracking-widest">
                  Secure Access Guaranteed
                </span>
                <div className="absolute left-0 top-1/2 h-px w-full bg-muted" />
              </div>
            </FieldGroup>
          </form>
          <div className="bg-primary relative hidden md:block overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-indigo-900/90 z-10" />
            <img
              src="/images/afrinexel.png"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover opacity-20 scale-150 blur-sm"
            />
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-12 text-center text-white">
              <GraduationCap className="h-24 w-24 mb-6 opacity-80" />
              <h2 className="text-4xl font-black mb-4 leading-tight">Empowering the Next Generation</h2>
              <p className="text-primary-foreground/80 font-medium text-lg italic">"Education is the most powerful weapon which you can use to change the world."</p>
              <div className="mt-12 flex gap-4">
                <div className="h-1 w-8 bg-white/20 rounded-full" />
                <div className="h-1 w-12 bg-white rounded-full" />
                <div className="h-1 w-8 bg-white/20 rounded-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="px-6 text-center text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
        Afrinexel Learning Management System &copy; 2026
      </div>
    </div>
  )
}

