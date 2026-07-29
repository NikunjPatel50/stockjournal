"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/components/settings/settings-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TAG_COLORS } from "@/lib/settings";

export function CustomizationSettings() {
  const { settings, updateSettings } = useSettings();
  const [strategyInput, setStrategyInput] = useState("");
  const [editingStrategy, setEditingStrategy] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [tagColor, setTagColor] = useState(TAG_COLORS[0]);

  function addStrategy() {
    const value = strategyInput.trim();
    if (!value) return;
    if (
      settings.customization.strategies.some(
        (s) => s.toLowerCase() === value.toLowerCase()
      )
    ) {
      toast.error("Strategy already exists");
      return;
    }
    updateSettings((prev) => ({
      ...prev,
      customization: {
        ...prev.customization,
        strategies: [...prev.customization.strategies, value],
      },
    }));
    setStrategyInput("");
    toast.success("Strategy added");
  }

  function saveEditStrategy(original: string) {
    const value = strategyInput.trim();
    if (!value) return;
    updateSettings((prev) => ({
      ...prev,
      customization: {
        ...prev.customization,
        strategies: prev.customization.strategies.map((s) =>
          s === original ? value : s
        ),
      },
    }));
    setEditingStrategy(null);
    setStrategyInput("");
    toast.success("Strategy updated");
  }

  function removeStrategy(name: string) {
    updateSettings((prev) => ({
      ...prev,
      customization: {
        ...prev.customization,
        strategies: prev.customization.strategies.filter((s) => s !== name),
      },
    }));
    toast.success("Strategy removed");
  }

  function addTag() {
    const label = tagInput.trim();
    if (!label) return;
    if (
      settings.customization.tags.some(
        (t) => t.label.toLowerCase() === label.toLowerCase()
      )
    ) {
      toast.error("Tag already exists");
      return;
    }
    updateSettings((prev) => ({
      ...prev,
      customization: {
        ...prev.customization,
        tags: [
          ...prev.customization.tags,
          { id: crypto.randomUUID(), label, color: tagColor },
        ],
      },
    }));
    setTagInput("");
    toast.success("Tag added");
  }

  function removeTag(id: string) {
    updateSettings((prev) => ({
      ...prev,
      customization: {
        ...prev.customization,
        tags: prev.customization.tags.filter((t) => t.id !== id),
      },
    }));
    toast.success("Tag removed");
  }

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Strategies List</CardTitle>
          <CardDescription>
            Manage setup options used across Journal and filters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={strategyInput}
              onChange={(e) => setStrategyInput(e.target.value)}
              placeholder={
                editingStrategy
                  ? `Rename "${editingStrategy}"`
                  : "Add strategy (e.g. VWAP Reversal)"
              }
            />
            {editingStrategy ? (
              <>
                <Button
                  type="button"
                  onClick={() => saveEditStrategy(editingStrategy)}
                  className="bg-emerald-600 hover:bg-emerald-600/90"
                >
                  Save
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingStrategy(null);
                    setStrategyInput("");
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={addStrategy}
                className="gap-1 bg-emerald-600 hover:bg-emerald-600/90"
              >
                <Plus className="size-4" />
                Add
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {settings.customization.strategies.map((strategy) => (
              <div
                key={strategy}
                className="flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-sm"
              >
                <span>{strategy}</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setEditingStrategy(strategy);
                    setStrategyInput(strategy);
                  }}
                  aria-label={`Edit ${strategy}`}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-rose-500"
                  onClick={() => removeStrategy(strategy)}
                  aria-label={`Remove ${strategy}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Custom Tag Manager</CardTitle>
          <CardDescription>
            Pill tags for psychology, catalysts, and setup notes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tag color</Label>
            <div className="flex flex-wrap gap-2">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setTagColor(color)}
                  className={`size-7 rounded-full border-2 ${
                    tagColor === color
                      ? "border-foreground"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add tag (e.g. Earnings Play)"
            />
            <Button
              type="button"
              onClick={addTag}
              className="gap-1 bg-emerald-600 hover:bg-emerald-600/90"
            >
              <Plus className="size-4" />
              Add Tag
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {settings.customization.tags.map((tag) => (
              <Badge
                key={tag.id}
                className="gap-1.5 border px-2.5 py-1"
                style={{
                  backgroundColor: `${tag.color}22`,
                  color: tag.color,
                  borderColor: `${tag.color}55`,
                }}
              >
                {tag.label}
                <button
                  type="button"
                  onClick={() => removeTag(tag.id)}
                  aria-label={`Remove ${tag.label}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
