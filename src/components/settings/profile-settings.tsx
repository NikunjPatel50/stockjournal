"use client";

import { useEffect, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useSettings } from "@/components/settings/settings-provider";
import {
  SettingsPanel,
  SettingsPanelFooter,
  SettingsPanelHero,
  SettingsPanelIntro,
  SettingsSection,
} from "@/components/settings/settings-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  CURRENCY_OPTIONS,
  initialsFromName,
  type CurrencyCode,
} from "@/lib/settings";

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required"),
  handle: z.string().trim(),
  currency: z.enum(["USD", "EUR", "GBP", "INR", "CAD"]),
});

type ProfileInput = z.input<typeof profileSchema>;
type ProfileValues = z.output<typeof profileSchema>;

function Field({
  id,
  label,
  hint,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint ? (
        <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function ProfileSettings() {
  const { settings, updateSettings } = useSettings();

  const form = useForm<ProfileInput, unknown, ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: settings.profile.fullName,
      handle: settings.profile.handle,
      currency: settings.profile.currency,
    },
  });

  useEffect(() => {
    form.reset({
      fullName: settings.profile.fullName,
      handle: settings.profile.handle,
      currency: settings.profile.currency,
    });
  }, [settings.profile.fullName, settings.profile.handle, settings.profile.currency, form]);

  const watchedName = form.watch("fullName");
  const watchedHandle = form.watch("handle");
  const watchedCurrency = form.watch("currency");
  const initials = initialsFromName(watchedName || settings.profile.fullName);

  const currencyLabel =
    CURRENCY_OPTIONS.find((c) => c.code === watchedCurrency)?.label ??
    watchedCurrency;

  function onSubmit(values: ProfileValues) {
    updateSettings((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        ...values,
        initials: initialsFromName(values.fullName),
      },
    }));
    toast.success("Profile settings saved");
  }

  return (
    <SettingsPanel>
      <SettingsPanelIntro
        title="Profile & account"
        description="Trader identity and baseline account preferences used across the workspace."
      />

      <SettingsPanelHero
        initials={initials}
        title={watchedName || settings.profile.fullName}
        subtitle={watchedHandle || settings.profile.handle}
      />

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <SettingsSection
          title="Identity"
          description="Shown in the header and on exported reports."
        >
          <div className="grid max-w-2xl gap-5 sm:grid-cols-2">
            <Field id="fullName" label="Full name">
              <Input
                id="fullName"
                className="h-9 border-border bg-background"
                {...form.register("fullName")}
              />
            </Field>
            <Field
              id="handle"
              label="Display title"
              hint="e.g. Swing trader, Day trader"
            >
              <Input
                id="handle"
                placeholder="Swing trader"
                className="h-9 border-border bg-background"
                {...form.register("handle")}
              />
            </Field>
          </div>
        </SettingsSection>

        <Separator className="bg-border" />

        <SettingsSection
          title="Account defaults"
          description="Default currency for prices, P&amp;L, and reports."
        >
          <div className="grid max-w-2xl gap-5 sm:grid-cols-2">
            <Field label="Default currency">
              <Select
                value={watchedCurrency}
                onValueChange={(v) =>
                  v && form.setValue("currency", v as CurrencyCode)
                }
              >
                <SelectTrigger className="h-9 w-full border-border bg-background font-normal">
                  <span className="text-sm">{currencyLabel}</span>
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </SettingsSection>

        <SettingsPanelFooter hint="Avatar initials update automatically from your full name.">
          <Button type="submit" size="sm" className="h-9 px-4">
            Save profile
          </Button>
        </SettingsPanelFooter>
      </form>
    </SettingsPanel>
  );
}
