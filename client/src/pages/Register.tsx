import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus, Users, CheckCircle2 } from "lucide-react";

const DEPARTMENTS = [
  "Sales",
  "Marketing",
  "Engineering",
  "Operations",
  "Finance",
  "HR",
  "Procurement",
  "Business Development",
  "Management",
  "Other",
];

export default function Register() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email || !password || !department) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    registerMutation.mutate({ name: name.trim(), email, password, department });
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-md border-slate-700 bg-slate-800/60 backdrop-blur shadow-2xl text-center p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-600/20 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-400" />
            </div>
            <h2 className="text-white text-xl font-semibold">Registration Successful</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Your account has been created and is <strong className="text-slate-300">pending admin approval</strong>.
              You will be able to log in once the administrator activates your account.
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="mt-2 bg-blue-600 hover:bg-blue-500 text-white"
            >
              Back to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg mb-2">
            <Users className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Contact Collection</h1>
          <p className="text-slate-400 text-sm">RTPL — Team Portal</p>
        </div>

        <Card className="border-slate-700 bg-slate-800/60 backdrop-blur shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">Create Account</CardTitle>
            <CardDescription className="text-slate-400">
              Register to request access. An admin will approve your account.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" className="border-red-800 bg-red-950/50">
                  <AlertDescription className="text-red-300 text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-slate-300 text-sm">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                  disabled={registerMutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-300 text-sm">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@reciclartpl.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                  disabled={registerMutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-slate-300 text-sm">Department</Label>
                <Select
                  value={department}
                  onValueChange={setDepartment}
                  disabled={registerMutation.isPending}
                >
                  <SelectTrigger
                    id="department"
                    className="bg-slate-700/60 border-slate-600 text-white focus:border-blue-500 data-[placeholder]:text-slate-500"
                  >
                    <SelectValue placeholder="Select your department" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem
                        key={dept}
                        value={dept}
                        className="text-slate-200 focus:bg-slate-700 focus:text-white"
                      >
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-300 text-sm">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                  disabled={registerMutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-slate-300 text-sm">Confirm Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className="bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                  disabled={registerMutation.isPending}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium active:scale-[0.97] transition-transform"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account…</>
                ) : (
                  <><UserPlus className="w-4 h-4 mr-2" /> Register</>
                )}
              </Button>

              <p className="text-slate-400 text-sm text-center">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                >
                  Sign in
                </button>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
