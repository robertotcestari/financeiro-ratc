"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MIN_PASSWORD_LENGTH,
  generatePassword,
} from "@/lib/core/auth/user-management";
import type { ManagedUser } from "../actions";

interface SetPasswordDialogProps {
  user: ManagedUser | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (userId: string, password: string) => Promise<boolean>;
}

export function SetPasswordDialog({
  user,
  onOpenChange,
  onSubmit,
}: SetPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (!open) setPassword("");
    onOpenChange(open);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const updated = await onSubmit(user.id, password);
      if (updated) setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={Boolean(user)} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Definir senha</DialogTitle>
          <DialogDescription>
            Defina uma senha de e-mail para {user?.name || user?.email}. O
            usuário poderá entrar com e-mail e senha.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="set-password">Nova senha</Label>
            <div className="flex gap-2">
              <Input
                id="set-password"
                type="text"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
                required
                minLength={MIN_PASSWORD_LENGTH}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setPassword(generatePassword())}
              >
                Gerar
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !user}>
              {loading ? "Salvando..." : "Salvar senha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
