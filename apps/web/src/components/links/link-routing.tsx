"use client";

import { Button, Card, Field, TextInput } from "@golink/ui";
import { Globe, Plus, Trash2 } from "lucide-react";
import * as React from "react";

import { replaceRoutingRulesAction } from "@/app/actions";

interface Rule {
  id: string;
  position: number;
  longUrl: string;
  countryMatch: string[];
  deviceMatch: string[];
  osMatch: string[];
}

export function LinkRouting({ linkId, rules }: { linkId: string; rules: Rule[] }) {
  const [editing, setEditing] = React.useState(false);
  const [drafts, setDrafts] = React.useState(
    rules.map((rule) => ({
      longUrl: rule.longUrl,
      countryMatch: rule.countryMatch.join(", "),
      deviceMatch: rule.deviceMatch.join(", "),
    })),
  );
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  function addRule() {
    if (drafts.length >= 10) return;
    setDrafts([...drafts, { longUrl: "", countryMatch: "", deviceMatch: "" }]);
  }

  async function save() {
    setError(null);
    setBusy(true);
    const result = await replaceRoutingRulesAction(
      linkId,
      drafts
        .filter((draft) => draft.longUrl.trim())
        .map((draft) => ({
          longUrl: draft.longUrl.trim(),
          countryMatch: draft.countryMatch
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          deviceMatch: draft.deviceMatch
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          osMatch: [] as string[],
        })),
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Those rules could not be saved.");
      return;
    }
    setEditing(false);
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Dynamic routing</h2>
          <p className="mt-1 text-sm text-muted">
            Send people to different places depending on where they are or what they are using.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setEditing((open) => !open)}>
          {editing ? "Cancel" : "Edit rules"}
        </Button>
      </div>

      {rules.length === 0 && !editing ? (
        <p className="mt-4 text-sm text-muted">
          No rules. Everyone who clicks this link goes to the same place.
        </p>
      ) : null}

      {rules.length > 0 && !editing ? (
        <ol className="mt-4 space-y-2">
          {rules.map((rule) => (
            <li key={rule.id} className="rounded-md border border-border p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Globe aria-hidden="true" className="size-4 text-muted" />
                {rule.countryMatch.length ? `From ${rule.countryMatch.join(", ")}` : "Anyone"}
                {rule.deviceMatch.length ? ` on ${rule.deviceMatch.join(", ")}` : ""}
              </p>
              <p className="mt-1 truncate font-mono text-xs text-muted">{rule.longUrl}</p>
            </li>
          ))}
        </ol>
      ) : null}

      {editing ? (
        <div className="mt-4 space-y-4">
          {drafts.map((draft, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: the rules are positional, the index is the identity
            <fieldset key={index} className="rounded-md border border-border p-3">
              <legend className="px-1 text-xs font-semibold text-muted">Rule {index + 1}</legend>
              <div className="space-y-3">
                <Field label="Send them to" htmlFor={`rule-url-${index}`} required>
                  <TextInput
                    id={`rule-url-${index}`}
                    type="url"
                    value={draft.longUrl}
                    placeholder="https://example.com/regional"
                    onChange={(event) =>
                      setDrafts(
                        drafts.map((item, position) =>
                          position === index ? { ...item, longUrl: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Countries"
                    htmlFor={`rule-country-${index}`}
                    hint="ISO codes, comma separated."
                  >
                    <TextInput
                      id={`rule-country-${index}`}
                      value={draft.countryMatch}
                      placeholder="DE, AT"
                      onChange={(event) =>
                        setDrafts(
                          drafts.map((item, position) =>
                            position === index
                              ? { ...item, countryMatch: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field
                    label="Devices"
                    htmlFor={`rule-device-${index}`}
                    hint="mobile, tablet, desktop."
                  >
                    <TextInput
                      id={`rule-device-${index}`}
                      value={draft.deviceMatch}
                      placeholder="mobile"
                      onChange={(event) =>
                        setDrafts(
                          drafts.map((item, position) =>
                            position === index
                              ? { ...item, deviceMatch: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </Field>
                </div>
              </div>
            </fieldset>
          ))}

          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={addRule} disabled={drafts.length >= 10}>
              <Plus aria-hidden="true" className="size-4" />
              Add a rule
            </Button>
            <Button size="sm" onClick={save} loading={busy}>
              Save rules
            </Button>
            {drafts.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDrafts(drafts.slice(0, -1))}
                icon={<Trash2 aria-hidden="true" className="size-4" />}
              >
                Remove the last
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted">A link can have at most 10 rules.</p>
        </div>
      ) : null}
    </Card>
  );
}
