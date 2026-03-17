"use client"

import { useState } from "react"
import Image from "next/image"
import { Loader2, ShieldCheck, ShieldAlert, Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"

type SetupStep = "idle" | "password" | "qr"

export function SecuritySettings() {
  const { data: session, refetch } = authClient.useSession()
  const is2FAEnabled = !!session?.user?.twoFactorEnabled

  const [step, setStep] = useState<SetupStep>("idle")
  const [loading, setLoading] = useState(false)
  const [enablePassword, setEnablePassword] = useState("")
  const [disablePassword, setDisablePassword] = useState("")
  const [totpUri, setTotpUri] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [verifyCode, setVerifyCode] = useState("")

  async function handleStartEnable() {
    if (!enablePassword) return
    setLoading(true)
    try {
      const res = await authClient.twoFactor.enable({ password: enablePassword })
      if (res.error) {
        toast.error(res.error.message || "Failed to start 2FA setup")
        return
      }
      if (res.data) {
        setTotpUri(res.data.totpURI)
        setBackupCodes(res.data.backupCodes || [])
        setStep("qr")
        setEnablePassword("")
      }
    } catch {
      toast.error("Failed to start 2FA setup")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    if (verifyCode.length < 6) return
    setLoading(true)
    try {
      const res = await authClient.twoFactor.verifyTotp({ code: verifyCode })
      if (res.error) {
        toast.error(res.error.message || "Invalid code")
        return
      }
      toast.success("Two-factor authentication enabled")
      setStep("idle")
      setVerifyCode("")
      setTotpUri("")
      setBackupCodes([])
      await refetch()
    } catch {
      toast.error("Invalid code")
    } finally {
      setLoading(false)
    }
  }

  async function handleDisable() {
    if (!disablePassword) return
    setLoading(true)
    try {
      const res = await authClient.twoFactor.disable({ password: disablePassword })
      if (res.error) {
        toast.error(res.error.message || "Failed to disable 2FA")
        return
      }
      toast.success("Two-factor authentication disabled")
      setDisablePassword("")
      await refetch()
    } catch {
      toast.error("Failed to disable 2FA")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {is2FAEnabled
            ? <ShieldCheck className="h-5 w-5 text-emerald-500" />
            : <ShieldAlert className="h-5 w-5 text-amber-500" />}
          <CardTitle>Two-Factor Authentication</CardTitle>
        </div>
        <CardDescription>
          Add an extra layer of security to your account using TOTP (Google Authenticator, Authy).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* ── Idle: show status + action ── */}
        {step === "idle" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <span className={`text-sm ${is2FAEnabled ? "text-emerald-600" : "text-muted-foreground"}`}>
                {is2FAEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            {is2FAEnabled ? (
              <div className="space-y-2">
                <Label htmlFor="disable-password">Enter password to disable 2FA</Label>
                <div className="flex gap-2">
                  <Input
                    id="disable-password"
                    type="password"
                    placeholder="Your password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    autoComplete="current-password"
                    className="max-w-xs"
                  />
                  <Button
                    variant="destructive"
                    onClick={handleDisable}
                    disabled={loading || !disablePassword}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Disable 2FA
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setStep("password")}>
                Enable 2FA
              </Button>
            )}
          </div>
        )}

        {/* ── Password step: collect password before calling enable ── */}
        {step === "password" && (
          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Enter your current password to generate a 2FA secret.
            </p>
            <div className="space-y-2">
              <Label htmlFor="enable-password">Current Password</Label>
              <Input
                id="enable-password"
                type="password"
                placeholder="Your password"
                value={enablePassword}
                onChange={(e) => setEnablePassword(e.target.value)}
                autoComplete="current-password"
                className="max-w-xs"
                onKeyDown={(e) => e.key === "Enter" && handleStartEnable()}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleStartEnable} disabled={loading || !enablePassword}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
              <Button variant="ghost" onClick={() => { setStep("idle"); setEnablePassword("") }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── QR step: scan + verify ── */}
        {step === "qr" && totpUri && (
          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <h3 className="font-medium">Scan with your authenticator app</h3>
            <p className="text-sm text-muted-foreground">
              Use Google Authenticator, Authy, or any TOTP app to scan this QR code.
            </p>

            <div className="flex flex-col items-center justify-center rounded-lg bg-white p-4 w-fit mx-auto">
              <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(totpUri)}`}
                alt="QR Code for two-factor authentication setup"
                width={160}
                height={160}
                unoptimized
              />
            </div>

            <div className="flex items-center gap-2 justify-center">
              <code className="bg-muted px-2 py-1 rounded text-xs break-all max-w-xs">{totpUri}</code>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                aria-label="Copy TOTP URI"
                onClick={() => { navigator.clipboard.writeText(totpUri); toast.success("URI copied") }}
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="space-y-2 max-w-sm">
              <Label htmlFor="totp-code">Enter the 6-digit code to confirm</Label>
              <div className="flex gap-2">
                <Input
                  id="totp-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                />
                <Button onClick={handleVerify} disabled={loading || verifyCode.length < 6}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify
                </Button>
              </div>
            </div>

            {backupCodes.length > 0 && (
              <div className="space-y-2">
                <Label>Backup Codes</Label>
                <p className="text-xs text-muted-foreground">
                  Save these codes somewhere safe — they let you log in if you lose your device.
                </p>
                <div className="grid grid-cols-2 gap-1 rounded bg-muted p-2 font-mono text-xs">
                  {backupCodes.map((code, i) => (
                    <span key={i}>{code}</span>
                  ))}
                </div>
              </div>
            )}

            <Button variant="ghost" size="sm" onClick={() => { setStep("idle"); setTotpUri(""); setBackupCodes([]); setVerifyCode("") }}>
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
