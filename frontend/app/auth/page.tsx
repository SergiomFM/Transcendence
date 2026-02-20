"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { isRequestError } from "@/lib/backend";
import { Users } from "@/lib/backend/users";
import { FcGoogle } from "react-icons/fc";

export default function AuthPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, refreshUser } = useAuth();

  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 2FA modal state
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);

  // Login fields
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [alias, setAlias] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const oauthMessage = searchParams.get("oauthMessage");
    if (oauthMessage) {
      setError(oauthMessage);
    }
    if (searchParams.get("2fa") === "true") {
      setShow2FAModal(true);
    }
  }, [searchParams]);

  const handle2FAVerify = async () => {
    const token = useRecoveryCode ? recoveryCode.trim() : otpValue;

    if (!useRecoveryCode && otpValue.length !== 6) {
      setOtpError(t("settings.tokenRequired"));
      return;
    }
    if (useRecoveryCode && !recoveryCode.trim()) {
      setOtpError(t("settings.tokenRequired"));
      return;
    }

    setOtpError("");
    setIsVerifying2FA(true);
    try {
      await Users.verify2FA(token);
      await refreshUser();
      router.push("/");
    } catch (err) {
      if (isRequestError(err)) {
        const data = err.data as { error?: string } | undefined;
        setOtpError(data?.error || t("auth.invalidCredentials"));
      } else {
        setOtpError(t("auth.invalidCredentials"));
      }
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!identifier) {
      setError(t("auth.emailRequired"));
      return;
    }
    if (!loginPassword) {
      setError(t("auth.passwordRequired"));
      return;
    }

    setIsLoading(true);
    try {
      await login(identifier, loginPassword);
      router.push("/");
    } catch (err) {
      if (err instanceof Error && err.message === "2FA_REQUIRED") {
        setShow2FAModal(true);
        setOtpValue("");
        setRecoveryCode("");
        setUseRecoveryCode(false);
        setOtpError("");
      } else if (isRequestError(err)) {
        const data = err.data as { error?: string } | undefined;
        setError(data?.error || t("auth.invalidCredentials"));
      } else {
        setError(t("auth.invalidCredentials"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username) {
      setError(t("auth.usernameRequired"));
      return;
    }
    if (!email) {
      setError(t("auth.emailRequired"));
      return;
    }
    if (!signupPassword) {
      setError(t("auth.passwordRequired"));
      return;
    }
    if (signupPassword !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setIsLoading(true);
    try {
      await register(username, email, signupPassword, alias || username);
      router.push("/");
    } catch (err) {
      if (isRequestError(err)) {
        const data = err.data as { error?: string } | undefined;
        setError(data?.error || t("common.error"));
      } else {
        setError(t("common.error"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex rounded-lg border p-1 mb-2">
            <button
              type="button"
              onClick={() => {
                setIsSignup(false);
                setError("");
              }}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                !isSignup
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("auth.switchToLogin")}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignup(true);
                setError("");
              }}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isSignup
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("auth.switchToSignup")}
            </button>
          </div>
          <CardTitle className="text-2xl font-bold">
            {isSignup ? t("auth.signupTitle") : t("auth.loginTitle")}
          </CardTitle>
          <CardDescription>
            {isSignup ? t("auth.signupSubtitle") : t("auth.loginSubtitle")}
          </CardDescription>
        </CardHeader>

        {isSignup ? (
          <form onSubmit={handleSignupSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">{t("common.username")}</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={t("auth.placeholderUsername")}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("common.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth.placeholderEmail")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alias">{t("common.alias")}</Label>
                <Input
                  id="alias"
                  type="text"
                  placeholder={t("auth.placeholderAlias")}
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">{t("common.password")}</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  {t("common.confirmPassword")}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3 pt-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t("common.loading") : t("common.signup")}
              </Button>
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    {t("auth.orContinueWith")}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  window.location.href = Users.googleOAuthUrl();
                }}
                disabled={isLoading}
              >
                <FcGoogle className="mr-2 h-4 w-4" />
                {t("auth.loginWithGoogle")}
              </Button>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="identifier">
                  {t("common.email")} / {t("common.username")}
                </Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder={t("auth.placeholderEmail")}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">{t("common.password")}</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3 pt-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t("common.loading") : t("common.login")}
              </Button>
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    {t("auth.orContinueWith")}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  window.location.href = Users.googleOAuthUrl();
                }}
                disabled={isLoading}
              >
                <FcGoogle className="mr-2 h-4 w-4" />
                {t("auth.loginWithGoogle")}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>

      <Dialog open={show2FAModal} onOpenChange={(open) => {
        setShow2FAModal(open);
        if (!open) {
          setOtpValue("");
          setRecoveryCode("");
          setUseRecoveryCode(false);
          setOtpError("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("settings.twoFA")}</DialogTitle>
            <DialogDescription>
              {useRecoveryCode ? t("settings.enterRecoveryCode") : t("settings.enterCode")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {otpError && (
              <div className="w-full rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {otpError}
              </div>
            )}
            {useRecoveryCode ? (
              <div className="w-full space-y-2">
                <Label htmlFor="recovery-code">{t("settings.recoveryCode")}</Label>
                <Input
                  id="recovery-code"
                  type="text"
                  placeholder={t("auth.placeholderRecoveryCode")}
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  disabled={isVerifying2FA}
                />
              </div>
            ) : (
              <InputOTP
                maxLength={6}
                value={otpValue}
                onChange={(value) => setOtpValue(value)}
                disabled={isVerifying2FA}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            )}
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button
              className="w-full"
              onClick={handle2FAVerify}
              disabled={isVerifying2FA || (!useRecoveryCode && otpValue.length !== 6) || (useRecoveryCode && !recoveryCode.trim())}
            >
              {isVerifying2FA ? t("common.loading") : t("settings.verify")}
            </Button>
            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={() => {
                setUseRecoveryCode(!useRecoveryCode);
                setOtpError("");
              }}
              disabled={isVerifying2FA}
            >
              {useRecoveryCode ? t("settings.useAuthCode") : t("settings.useRecoveryCode")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
