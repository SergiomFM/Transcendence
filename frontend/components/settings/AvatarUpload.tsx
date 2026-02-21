"use client";

import { useState, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useTranslations } from "next-intl";
import { Camera, Trash2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Users } from "@/lib/backend/users";
import { isRequestError } from "@/lib/backend";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  maxSizeBytes: number = 1024 * 1024
): Promise<string> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Scale down if the cropped area is very large
  const maxDim = 512;
  if (pixelCrop.width > maxDim || pixelCrop.height > maxDim) {
    const scale = maxDim / Math.max(pixelCrop.width, pixelCrop.height);
    const newW = Math.round(pixelCrop.width * scale);
    const newH = Math.round(pixelCrop.height * scale);
    const smallCanvas = document.createElement("canvas");
    smallCanvas.width = newW;
    smallCanvas.height = newH;
    const smallCtx = smallCanvas.getContext("2d");
    if (!smallCtx) throw new Error("Canvas context not available");
    smallCtx.drawImage(canvas, 0, 0, newW, newH);
    canvas.width = newW;
    canvas.height = newH;
    ctx.drawImage(smallCanvas, 0, 0);
  }

  // Try webp at decreasing quality until under maxSizeBytes
  let quality = 0.8;
  let dataUrl = canvas.toDataURL("image/webp", quality);

  while (dataUrl.length > maxSizeBytes * 1.37 && quality > 0.1) {
    // 1.37 accounts for base64 overhead (~37%)
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/webp", quality);
  }

  return dataUrl;
}

export const AvatarUploadSection = () => {
  const t = useTranslations();
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(t("settings.avatarInvalidType"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setDialogOpen(true);
      setError("");
      setSuccess("");
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsUploading(true);
    setError("");
    try {
      const croppedBase64 = await getCroppedImg(imageSrc, croppedAreaPixels);
      await Users.uploadAvatar(croppedBase64);
      await refreshUser();
      setSuccess(t("settings.avatarUpdated"));
      setDialogOpen(false);
      setImageSrc(null);
    } catch (err) {
      if (isRequestError(err)) {
        const data = err.data as { error?: string } | undefined;
        setError(data?.error || t("common.error"));
      } else {
        setError(t("common.error"));
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsUploading(true);
    setError("");
    setSuccess("");
    try {
      await Users.deleteAvatar();
      await refreshUser();
      setSuccess(t("settings.avatarRemoved"));
    } catch (err) {
      if (isRequestError(err)) {
        const data = err.data as { error?: string } | undefined;
        setError(data?.error || t("common.error"));
      } else {
        setError(t("common.error"));
      }
    } finally {
      setIsUploading(false);
    }
  };

  const displayName = user?.alias || user?.username || "?";

  return (
    <>
      <div className="flex items-center gap-6">
        <div className="relative group">
          <Avatar className="h-20 w-20">
            {user?.avatar ? (
              <AvatarImage src={user.avatar} alt={displayName} />
            ) : null}
            <AvatarFallback className="text-lg">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            aria-label={t("settings.avatarChange")}
          >
            <Camera className="h-6 w-6 text-white" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Camera className="mr-2 h-4 w-4" />
              {t("settings.avatarUpload")}
            </Button>
            {user?.avatar && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={isUploading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("settings.avatarRemove")}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("settings.avatarHint")}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {error && (
        <div className="mt-3 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-3 rounded-md bg-green-500/15 p-3 text-sm text-green-600 dark:text-green-400">
          {success}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("settings.avatarCropTitle")}</DialogTitle>
            <DialogDescription>{t("settings.avatarCropDesc")}</DialogDescription>
          </DialogHeader>

          {imageSrc && (
            <div className="space-y-4">
              <div className="relative h-72 w-full">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              <div className="flex items-center gap-3 px-1">
                <span className="text-xs text-muted-foreground">
                  {t("settings.avatarZoom")}
                </span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isUploading}
            >
              {t("common.close")}
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? t("common.loading") : t("settings.avatarSave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
