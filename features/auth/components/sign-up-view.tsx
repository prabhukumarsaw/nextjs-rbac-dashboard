"use client";

import { AtSignIcon, ChevronLeftIcon, EyeIcon, EyeOffIcon, Loader2, LockIcon, UserIcon } from "lucide-react";
import type React from "react";
import { register } from "@/lib/actions/auth-register";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { FloatingPaths } from "./floating-paths";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useState, useCallback } from "react";

export function SignUpViewPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const [registerData, setRegisterData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });

  // Validation function
  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};

    // Email validation
    if (!registerData.email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerData.email)) {
      errors.email = "Please enter a valid email address";
    }

    // Username validation
    if (!registerData.username) {
      errors.username = "Username is required";
    } else if (registerData.username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(registerData.username)) {
      errors.username = "Username can only contain letters, numbers, and underscores";
    }

    // Password validation
    if (!registerData.password) {
      errors.password = "Password is required";
    } else if (registerData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(registerData.password)) {
      errors.password = "Password must contain at least one uppercase letter, one lowercase letter, and one number";
    }

    // Confirm password validation
    if (!registerData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (registerData.password !== registerData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    // First name validation
    if (registerData.firstName && registerData.firstName.length > 50) {
      errors.firstName = "First name must be less than 50 characters";
    }

    // Last name validation
    if (registerData.lastName && registerData.lastName.length > 50) {
      errors.lastName = "Last name must be less than 50 characters";
    }

    // Terms and conditions validation
    if (!acceptedTerms) {
      errors.terms = "You must accept the terms and conditions";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [registerData, acceptedTerms]);

  const handleInputChange = useCallback((field: string, value: string) => {
    setRegisterData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: "" }));
    }
  }, [formErrors]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    setRegisterLoading(true);

    try {
      const result = await register({
        email: registerData.email.trim(),
        username: registerData.username.trim(),
        password: registerData.password,
        firstName: registerData.firstName.trim() || undefined,
        lastName: registerData.lastName.trim() || undefined,
      });

      if (result.success) {
        toast({
          title: "Registration successful!",
          description: "Your account has been created. Welcome!",
        });
        router.push("/dashboard");
        router.refresh();
      } else {
        toast({
          title: "Registration failed",
          description: result.error || "Failed to create account",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Error",
        description: "An error occurred during registration",
        variant: "destructive",
      });
    } finally {
      setRegisterLoading(false);
    }
  };

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const toggleConfirmPasswordVisibility = useCallback(() => {
    setShowConfirmPassword(prev => !prev);
  }, []);

  const handleTermsChange = useCallback((checked: boolean) => {
    setAcceptedTerms(checked);
    if (formErrors.terms) {
      setFormErrors(prev => ({ ...prev, terms: "" }));
    }
  }, [formErrors.terms]);

  return (
    <main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
      <div className="relative hidden h-full flex-col border-r bg-secondary p-10 lg:flex dark:bg-secondary/20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        
        <div className="z-10 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-xl">
              &ldquo;This Platform has helped me to save time and serve my
              clients faster than ever before.&rdquo;
            </p>
            <footer className="font-mono font-semibold text-sm">
              ~ Ali Hassan
            </footer>
          </blockquote>
        </div>
        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>
      
      <div className="relative flex min-h-screen flex-col justify-center p-4">
        <div
          aria-hidden
          className="-z-10 absolute inset-0 isolate opacity-60 contain-strict"
        >
          <div className="-translate-y-87.5 absolute top-0 right-0 h-320 w-140 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)]" />
          <div className="absolute top-0 right-0 h-320 w-60 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="-translate-y-87.5 absolute top-0 right-0 h-320 w-60 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)]" />
        </div>
        
        <Button asChild className="absolute top-7 left-5" variant="ghost">
          <a href="/">
            <ChevronLeftIcon className="h-4 w-4 mr-2" />
            Home
          </a>
        </Button>
        
        <div className="mx-auto space-y-4 sm:w-sm">
          <div className="flex flex-col space-y-1">
            <h1 className="font-bold text-2xl tracking-wide">
              Sign Up or Join Now!
            </h1>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Button className="w-full" size="lg" type="button" variant="outline">
              <GoogleIcon className="h-4 w-4 mr-2" />
              Google
            </Button>

            <Button className="w-full" size="lg" type="button" variant="outline">
              <GithubIcon className="h-4 w-4 mr-2" />
              Meta
            </Button>
          </div>

          <div className="flex w-full items-center justify-center">
            <div className="h-px w-full bg-border" />
            <span className="px-2 text-muted-foreground text-xs">OR</span>
            <div className="h-px w-full bg-border" />
          </div>

          <form onSubmit={handleRegister} className="space-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="register-firstName" className="text-start text-muted-foreground text-xs cursor-pointer">
                  First Name
                </Label>
                <InputGroup>
                  <InputGroupInput
                    id="register-firstName"
                    placeholder="John"
                    value={registerData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    disabled={registerLoading}
                    maxLength={50}
                  />
                  <InputGroupAddon>
                    <UserIcon className="h-4 w-4" />
                  </InputGroupAddon>
                </InputGroup>
                {formErrors.firstName && (
                  <p className="text-xs text-destructive">{formErrors.firstName}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="register-lastName" className="text-start text-muted-foreground text-xs cursor-pointer">
                  Last Name
                </Label>
                <InputGroup>
                  <InputGroupInput
                    id="register-lastName"
                    placeholder="Doe"
                    value={registerData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    disabled={registerLoading}
                    maxLength={50}
                  />
                  <InputGroupAddon>
                    <UserIcon className="h-4 w-4" />
                  </InputGroupAddon>
                </InputGroup>
                {formErrors.lastName && (
                  <p className="text-xs text-destructive">{formErrors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-email" className="text-start text-muted-foreground text-xs cursor-pointer">
                Email
              </Label>
              <InputGroup>
                <InputGroupInput
                  id="register-email"
                  type="email"
                  placeholder="Enter your email"
                  value={registerData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                  disabled={registerLoading}
                  autoComplete="email"
                />
                <InputGroupAddon>
                  <AtSignIcon className="h-4 w-4" />
                </InputGroupAddon>
              </InputGroup>
              {formErrors.email && (
                <p className="text-xs text-destructive">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-username" className="text-start text-muted-foreground text-xs cursor-pointer">
                Username
              </Label>
              <InputGroup>
                <InputGroupInput
                  id="register-username"
                  placeholder="Enter your username"
                  value={registerData.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  required
                  disabled={registerLoading}
                  autoComplete="username"
                  minLength={3}
                  maxLength={30}
                />
                <InputGroupAddon>
                  <UserIcon className="h-4 w-4" />
                </InputGroupAddon>
              </InputGroup>
              {formErrors.username && (
                <p className="text-xs text-destructive">{formErrors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-password" className="text-start text-muted-foreground text-xs cursor-pointer">
                Password
              </Label>
              <InputGroup>
                <InputGroupInput
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={registerData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  required
                  disabled={registerLoading}
                  autoComplete="new-password"
                  minLength={8}
                />
                <InputGroupAddon>
                  <LockIcon className="h-4 w-4" />
                </InputGroupAddon>
                <InputGroupAddon 
                  align="inline-end" 
                  className="cursor-pointer"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </InputGroupAddon>
              </InputGroup>
              {formErrors.password && (
                <p className="text-xs text-destructive">{formErrors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-confirmPassword" className="text-start text-muted-foreground text-xs cursor-pointer">
                Confirm Password
              </Label>
              <InputGroup>
                <InputGroupInput
                  id="register-confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={registerData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  required
                  disabled={registerLoading}
                  autoComplete="new-password"
                />
                <InputGroupAddon>
                  <LockIcon className="h-4 w-4" />
                </InputGroupAddon>
                <InputGroupAddon 
                  align="inline-end" 
                  className="cursor-pointer"
                  onClick={toggleConfirmPasswordVisibility}
                >
                  {showConfirmPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </InputGroupAddon>
              </InputGroup>
              {formErrors.confirmPassword && (
                <p className="text-xs text-destructive">{formErrors.confirmPassword}</p>
              )}
            </div>

            <div className="flex items-start space-x-2 my-2">
              <Checkbox 
                id="terms-and-conditions" 
                checked={acceptedTerms}
                onCheckedChange={handleTermsChange}
                disabled={registerLoading}
              />
              <Label htmlFor="terms-and-conditions" className="text-sm font-normal cursor-pointer leading-tight">
                I agree to the terms and conditions
              </Label>
            </div>
            {formErrors.terms && (
              <p className="text-xs text-destructive">{formErrors.terms}</p>
            )}

            <Button 
              type="submit" 
              className="w-full mt-4" 
              disabled={registerLoading}
              size="lg"
            >
              {registerLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
          
          <p className="mt-2 text-muted-foreground text-sm text-center">
            Already have an account?{" "}
            <a href="/auth/sign-in" className="underline underline-offset-4 hover:text-primary font-medium">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

const GoogleIcon = (props: React.ComponentProps<"svg">) => (
  <svg
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g>
      <path d="M12.479,14.265v-3.279h11.049c0.108,0.571,0.164,1.247,0.164,1.979c0,2.46-0.672,5.502-2.84,7.669   C18.744,22.829,16.051,24,12.483,24C5.869,24,0.308,18.613,0.308,12S5.869,0,12.483,0c3.659,0,6.265,1.436,8.223,3.307L18.392,5.62   c-1.404-1.317-3.307-2.341-5.913-2.341C7.65,3.279,3.873,7.171,3.873,12s3.777,8.721,8.606,8.721c3.132,0,4.916-1.258,6.059-2.401   c0.927-0.927,1.537-2.251,1.777-4.059L12.479,14.265z" />
    </g>
  </svg>
);

const GithubIcon = (props: React.ComponentProps<"svg">) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
    <path
      d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z"
      fill="currentColor"
    />
  </svg>
);