"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Settings } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Players } from "@/lib/backend/players";
import { isRequestError } from "@/lib/backend";
import type { PlayerProfile } from "@/lib/backend/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const UserProfilePage = () => {
  const t = useTranslations();
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await Players.getByUserId(userId);
        setProfile(res.data);
      } catch (err) {
        if (isRequestError(err) && err.status === 404) {
          setError(t("profile.notFound"));
        } else {
          setError(t("common.error"));
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) fetchProfile();
  }, [userId, t]);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <p className="text-destructive">{error || t("profile.notFound")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const avatarUrl = isOwnProfile ? currentUser?.avatar : profile.avatar_url;
  const initials = profile.display_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-start justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl space-y-6 animate-fade-up">
        <Card className="border-glow">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              <Avatar className="h-20 w-20 shrink-0 ring-2 ring-neon-muted shadow-[0_0_20px_var(--neon-muted)]">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={profile.display_name} />
                ) : null}
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-center sm:text-left w-full">
                <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold truncate text-glow">
                      {profile.display_name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {t("profile.memberSince")}{" "}
                      {new Date(profile.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {isOwnProfile && (
                    <Link href="/settings" className="shrink-0">
                      <Button variant="outline" size="sm">
                        <Settings className="mr-2 h-4 w-4" />
                        {t("profile.editProfile")}
                      </Button>
                    </Link>
                  )}
                </div>
                {profile.bio && (
                  <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
          <Card className="border-neon-muted/30 hover:border-glow transition-all text-center">
            <CardHeader className="p-3 sm:p-6 pb-1 sm:pb-2">
              <CardTitle className="text-lg sm:text-xl font-medium text-muted-foreground">
                {t("profile.wins")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <p className="text-3xl sm:text-4xl font-bold text-neon">{profile.wins ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="border-neon-muted/30 hover:border-glow transition-all text-center">
            <CardHeader className="p-3 sm:p-6 pb-1 sm:pb-2">
              <CardTitle className="text-lg sm:text-xl font-medium text-muted-foreground">
                {t("profile.losses")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <p className="text-3xl sm:text-4xl font-bold text-neon">{profile.losses ?? 0}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
