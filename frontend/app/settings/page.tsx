"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, Copy, Lock, Shield } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Users } from "@/lib/backend/users";
import { isRequestError } from "@/lib/backend";
import { AvatarUploadSection } from "@/components/settings/AvatarUpload";
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

const ChangePasswordSection = () => {
  const t = useTranslations();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword) {
      setError(t("settings.currentPasswordRequired"));
      return;
    }
    if (!newPassword) {
      setError(t("auth.passwordRequired"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setIsLoading(true);
    try {
      await Users.changePassword(currentPassword, newPassword);
      setSuccess(t("settings.passwordChanged"));
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-neon" />
          <CardTitle>{t("settings.changePassword")}</CardTitle>
        </div>
        <CardDescription>{t("settings.changePasswordDesc")}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-600 dark:text-green-400">
              {success}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">
              {t("settings.currentPassword")}
            </Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t("settings.newPassword")}</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword">
              {t("common.confirmPassword")}
            </Label>
            <Input
              id="confirmNewPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t("common.loading") : t("settings.changePassword")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

type TwoFAStep = "idle" | "setup" | "done" | "disabling";

const TwoFASection = () => {
  const t = useTranslations();
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState<TwoFAStep>("idle");
  const [qrCode, setQrCode] = useState("");
  const [token, setToken] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const is2FAEnabled = !!user?.two_factor_enabled;

  const handleSetup = async () => {
    setError("");
    setIsLoading(true);
    try {
      const res = await Users.setup2FA();
      setQrCode(res.data.qr);
      setStep("setup");
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

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token) {
      setError(t("settings.tokenRequired"));
      return;
    }
    setIsLoading(true);
    try {
      const res = await Users.confirm2FA(token);
      setRecoveryCodes(res.data.recovery_codes);
      setStep("done");
      await refreshUser();
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

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token) {
      setError(t("settings.tokenRequired"));
      return;
    }
    setIsLoading(true);
    try {
      await Users.disable2FA(token);
      setStep("idle");
      setToken("");
      await refreshUser();
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

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-neon" />
          <CardTitle>{t("settings.twoFA")}</CardTitle>
        </div>
        <CardDescription>{t("settings.twoFADesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {is2FAEnabled && step === "idle" && (
          <div className="flex items-center gap-2 rounded-md bg-green-500/15 p-3 text-sm text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            {t("settings.twoFAEnabled")}
          </div>
        )}

        {!is2FAEnabled && step === "idle" && (
          <p className="text-sm text-muted-foreground">
            {t("settings.twoFADisabled")}
          </p>
        )}

        {step === "setup" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("settings.scanQR")}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCode}
              alt={t("settings.qrCodeAlt")}
              className="rounded-md border mx-auto"
            />
            <form onSubmit={handleConfirm} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="totp-token">{t("settings.enterCode")}</Label>
                <Input
                  id="totp-token"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t("common.loading") : t("settings.verify")}
              </Button>
            </form>
          </div>
        )}

        {step === "disabling" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("settings.disable2FADesc")}
            </p>
            <form onSubmit={handleDisable} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="totp-disable-token">
                  {t("settings.enterCode")}
                </Label>
                <Input
                  id="totp-disable-token"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="destructive" disabled={isLoading}>
                  {isLoading ? t("common.loading") : t("settings.disable2FA")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep("idle");
                    setToken("");
                    setError("");
                  }}
                  disabled={isLoading}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </form>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-md bg-green-500/15 p-3 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              {t("settings.twoFAActivated")}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t("settings.recoveryCodes")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("settings.recoveryCodesDesc")}
              </p>
              <div className="rounded-md border bg-muted p-3 font-mono text-sm grid grid-cols-2 gap-1">
                {recoveryCodes.map((code) => (
                  <span key={code}>{code}</span>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyCodes}>
                <Copy className="mr-2 h-4 w-4" />
                {copied ? t("settings.copied") : t("settings.copyCodes")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {!is2FAEnabled && step === "idle" && (
        <CardFooter className="pt-4">
          <Button onClick={handleSetup} disabled={isLoading}>
            {isLoading ? t("common.loading") : t("settings.enable2FA")}
          </Button>
        </CardFooter>
      )}

      {is2FAEnabled && step === "idle" && (
        <CardFooter className="pt-4">
          <Button
            variant="destructive"
            onClick={() => {
              setStep("disabling");
              setToken("");
              setError("");
            }}
            disabled={isLoading}
          >
            {t("settings.disable2FA")}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

const SettingsPage = () => {
  const t = useTranslations();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              {t("settings.notAuthenticated")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-6 animate-fade-up">
        <div>
          <h1 className="text-3xl font-bold text-glow">{t("settings.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("settings.subtitle")}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.avatar")}</CardTitle>
            <CardDescription>{t("settings.avatarDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <AvatarUploadSection />
          </CardContent>
        </Card>
        {!user.google_id && <ChangePasswordSection />}
        <TwoFASection />
      </div>
    </div>
  );
};

export default SettingsPage;
