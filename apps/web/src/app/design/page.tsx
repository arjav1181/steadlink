"use client";

import {
  Badge,
  BlockList,
  BulkActionBar,
  Button,
  Card,
  ChartActionBar,
  Chip,
  CopyButton,
  DataTable,
  DeviceFrame,
  DnsRecordTable,
  DropdownMenu,
  EmptyState,
  Field,
  IconButton,
  IconRail,
  Modal,
  PatternPicker,
  PlanGate,
  QrPreview,
  QrTemplateCard,
  QuotaChip,
  RadioGroup,
  type RailItem,
  SearchInput,
  SegmentedControl,
  Select,
  Skeleton,
  StatCard,
  Stepper,
  Tabs,
  Tag,
  Textarea,
  TextInput,
  Toast,
  Toggle,
  TooltipProvider,
  UsageBar,
} from "@steadlink/ui";
import {
  ArrowRight,
  BarChart3,
  FileText,
  Folder,
  Globe,
  Home,
  Link2,
  QrCode,
  Sparkles,
  Users,
} from "lucide-react";
import * as React from "react";

const RAIL: RailItem[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "links", label: "Links", icon: Link2 },
  { id: "qr", label: "QR codes", icon: QrCode },
  { id: "pages", label: "Pages", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "campaigns", label: "Campaigns", icon: Folder },
  { id: "channels", label: "Channels", icon: Globe },
  { id: "users", label: "Users", icon: Users },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-8">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Row({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {label ? <span className="w-32 shrink-0 text-xs font-medium text-muted">{label}</span> : null}
      {children}
    </div>
  );
}

export default function DesignPage() {
  const [rail, setRail] = React.useState("links");
  const [segment, setSegment] = React.useState("7d");
  const [tab, setTab] = React.useState("active");
  const [toggle, setToggle] = React.useState(true);
  const [radio, setRadio] = React.useState("a");
  const [search, setSearch] = React.useState("");
  const [modal, setModal] = React.useState(false);
  const [drawer, setDrawer] = React.useState(false);
  const [pattern, setPattern] = React.useState("rounded");
  const [qrDesign, setQrDesign] = React.useState({ dotPattern: "rounded" });
  const [blocks, setBlocks] = React.useState([
    { id: "1", type: "link", title: "Spring collection", detail: "go.arjav.is-cool.dev/spring" },
    { id: "2", type: "image", title: "hero.jpg" },
    { id: "3", type: "youtube", title: "How we build" },
    { id: "4", type: "grid", title: "Best sellers" },
  ]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-bg">
        {/* ---------------------------------------------------------------- */}
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-content items-center gap-4 px-gutter py-4">
            <h1 className="text-lg font-bold text-foreground">Steadlink design system</h1>
            <Badge tone="neutral">v0.1</Badge>
            <p className="ml-auto text-sm text-muted">
              Roles only. No raw hex values below this line.
            </p>
          </div>
        </header>

        <div className="mx-auto flex max-w-content gap-gutter px-gutter py-8">
          <IconRail items={RAIL} current={rail} onSelect={setRail} className="shrink-0" />

          <main className="min-w-0 flex-1 space-y-10">
            {/* ------------------------------------------------------------ */}
            <Section
              title="Buttons"
              description="Six variants, four sizes. Focus is a 2px accent ring at 2px offset."
            >
              <div className="space-y-4">
                <Row label="Variants">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="link">Link</Button>
                  <Button variant="ai">Create with AI</Button>
                </Row>
                <Row label="Sizes">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </Row>
                <Row label="States">
                  <Button disabled>Disabled</Button>
                  <Button loading>Loading</Button>
                  <Button variant="secondary" loading>
                    Saving
                  </Button>
                  <IconButton label="Settings" icon={<span aria-hidden="true">⚙</span>} />
                  <IconButton
                    label="More"
                    icon={
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 16 16"
                        className="size-4"
                        fill="currentColor"
                      >
                        <circle cx="3" cy="8" r="1.4" />
                        <circle cx="8" cy="8" r="1.4" />
                        <circle cx="13" cy="8" r="1.4" />
                      </svg>
                    }
                  />
                </Row>
                <Row label="With icons">
                  <Button icon={<ArrowRight aria-hidden="true" className="size-4" />}>
                    Continue
                  </Button>
                  <Button variant="ai">Create with AI</Button>
                </Row>
              </div>
            </Section>

            {/* ------------------------------------------------------------ */}
            <Section title="Form controls" description="Labels are always real labels.">
              <div className="grid gap-6 lg:grid-cols-3">
                <Field
                  label="Destination URL"
                  htmlFor="demo-url"
                  required
                  hint="The page people land on."
                >
                  <TextInput id="demo-url" placeholder="https://example.com/landing" required />
                </Field>
                <Field
                  label="Back-half"
                  htmlFor="demo-back"
                  hint="Letters, digits, dash and underscore."
                  counter={{ value: 5, max: 255 }}
                >
                  <TextInput id="demo-back" defaultValue="promo" mono />
                </Field>
                <Field
                  label="Title"
                  htmlFor="demo-title"
                  error="Give this link a name you will recognise."
                >
                  <TextInput id="demo-title" defaultValue="Spring sale" aria-invalid />
                </Field>
                <Field label="Description" htmlFor="demo-text" counter={{ value: 128, max: 200 }}>
                  <Textarea id="demo-text" defaultValue="Tell people what this link is for." />
                </Field>
                <Field label="AI prompt" htmlFor="demo-ai" hint="Describe the brand in a sentence.">
                  <Textarea id="demo-ai" ai placeholder="A studio making eco-friendly candles…" />
                </Field>
                {/* Select renders its own Field, so it is not wrapped in one. */}
                <Select
                  id="demo-domain"
                  label="Domain"
                  defaultValue="go"
                  options={[
                    { value: "go", label: "go.arjav.is-cool.dev" },
                    { value: "acme", label: "acme.example" },
                    { value: "old", label: "old.example (pending DNS)" },
                  ]}
                />
                <Select
                  id="demo-sort"
                  label="Sorting"
                  defaultValue="new"
                  options={[
                    { value: "new", label: "Newest first" },
                    { value: "old", label: "Oldest first" },
                    { value: "clicks", label: "Most clicks" },
                  ]}
                />
                <div className="flex flex-col gap-4">
                  <Toggle
                    label="Also create a QR Code"
                    checked={toggle}
                    onCheckedChange={setToggle}
                  />
                  <Toggle label="Expire the link" checked={false} />
                  <Toggle label="Plan-gated option" checked disabled />
                </div>
                <RadioGroup
                  legend="QR code type"
                  value={radio}
                  onValueChange={setRadio}
                  options={[
                    { value: "a", label: "QR code" },
                    { value: "b", label: "2D barcode" },
                  ]}
                />
              </div>
            </Section>

            {/* ------------------------------------------------------------ */}
            <Section title="Selection and navigation">
              <div className="space-y-6">
                <Row label="Segmented">
                  <SegmentedControl
                    label="Date range"
                    value={segment}
                    onValueChange={setSegment}
                    options={[
                      { value: "1d", label: "1d" },
                      { value: "7d", label: "7d" },
                      { value: "30d", label: "30d" },
                    ]}
                  />
                </Row>
                <Row label="Tabs">
                  <Tabs
                    value={tab}
                    onValueChange={setTab}
                    tabs={[
                      { value: "active", label: "Active", count: 128 },
                      { value: "hidden", label: "Hidden", count: 4 },
                    ]}
                  />
                </Row>
                <Row label="Chips">
                  <Chip>direct</Chip>
                  <Chip selected>email</Chip>
                  <Chip onClick={() => undefined}>social</Chip>
                </Row>
                <Row label="Tags">
                  <Tag>launch</Tag>
                  <Tag onRemove={() => undefined}>q3-campaign</Tag>
                </Row>
                <Row label="Badges">
                  <Badge>Neutral</Badge>
                  <Badge tone="success">Verified</Badge>
                  <Badge tone="warning">Near limit</Badge>
                  <Badge tone="danger">Failed</Badge>
                  <Badge tone="ai">AI</Badge>
                </Row>
                <Row label="Search">
                  <SearchInput value={search} onValueChange={setSearch} className="w-72" />
                </Row>
              </div>
            </Section>

            {/* ------------------------------------------------------------ */}
            <Section title="Surfaces">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Total engagements"
                  value="1,199"
                  delta={20}
                  deltaLabel="vs 800 prev period"
                />
                <StatCard label="Links" value="128" />
                <StatCard label="QR codes" value="12" delta={-8} deltaLabel="vs last month" />
                <StatCard label="Scans" value="0" />
              </div>
            </Section>

            {/* ------------------------------------------------------------ */}
            <Section title="Table" description="A real table, with a real caption.">
              <DataTable
                caption="Your links"
                headers={[
                  { label: "Title" },
                  { label: "Short link" },
                  { label: "Clicks" },
                  { label: "Status" },
                  { label: "" },
                ]}
              >
                {[
                  ["Spring sale", "go.arjav.is-cool.dev/spring", "1,199", "Active"],
                  ["Docs", "go.arjav.is-cool.dev/docs", "842", "Active"],
                  ["Old print ad", "go.arjav.is-cool.dev/print", "57", "Expired"],
                ].map(([title, link, clicks, status]) => (
                  <tr key={title} className="hover:bg-surface-2">
                    <td className="px-4 py-3 font-medium text-foreground">{title}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">{link}</td>
                    <td className="px-4 py-3 tabular-nums text-foreground">{clicks}</td>
                    <td className="px-4 py-3">
                      <Badge tone={status === "Active" ? "success" : "warning"}>{status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu
                        label={`Actions for ${title}`}
                        items={[
                          { label: "Edit" },
                          { label: "Copy link" },
                          { label: "Hide" },
                          { label: "Delete", destructive: true },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </DataTable>
            </Section>

            {/* ------------------------------------------------------------ */}
            <Section title="Status and feedback">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-4">
                  <EmptyState
                    icon={<Link2 aria-hidden="true" />}
                    title="No links yet"
                    body="Shorten your first URL to start tracking clicks."
                    action={<Button>Create a link</Button>}
                  />
                  <EmptyState
                    icon={<Link2 aria-hidden="true" />}
                    title="No results"
                    body="Nothing matched that search. Try a shorter term or clear the filters."
                    action={<Button variant="secondary">Clear filters</Button>}
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <QuotaChip remaining={9878} total={10000} />
                    <QuotaChip remaining={4} total={1000} />
                    <QuotaChip remaining={0} total={1000} />
                  </div>
                  <Card className="p-5">
                    <div className="space-y-4">
                      <UsageBar label="Links" used={128} limit={1000} />
                      <UsageBar label="QR codes" used={12} limit={50} />
                      <UsageBar label="Custom back-halves" used={101} limit={100} />
                    </div>
                  </Card>
                  <PlanGate
                    reason="Custom back-halves are not included on this plan."
                    action={
                      <Button variant="secondary" size="sm">
                        See plans
                      </Button>
                    }
                  />
                </div>
              </div>
            </Section>

            {/* ------------------------------------------------------------ */}
            <Section title="Overlays">
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setModal(true)}>Open modal</Button>
                <Button variant="secondary" onClick={() => setDrawer(true)}>
                  Open drawer
                </Button>
              </div>
              <div className="mt-6 space-y-6">
                <Stepper steps={["Configure code", "Customize design"]} current={1} />
                <Stepper steps={["Configure code", "Customize design"]} current={0} />
                <BulkActionBar count={3} noun="links">
                  <Button size="sm" variant="secondary">
                    Hide
                  </Button>
                  <Button size="sm" variant="secondary">
                    Tag
                  </Button>
                </BulkActionBar>
                <div className="flex flex-wrap gap-3">
                  <Toast
                    tone="success"
                    title="Link created"
                    description="Copied to your clipboard."
                    onDismiss={() => undefined}
                  />
                  <Toast
                    tone="error"
                    title="Could not shorten"
                    description="That URL is not valid."
                    onDismiss={() => undefined}
                  />
                </div>
              </div>
            </Section>

            {/* ------------------------------------------------------------ */}
            <Section
              title="QR code surfaces"
              description="A real QR code, rendered from a module matrix."
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="p-5">
                  <div className="flex flex-wrap items-start gap-6">
                    <QrPreview
                      text="https://go.arjav.is-cool.dev"
                      design={qrDesign}
                      size={200}
                      caption="go.arjav.is-cool.dev/aB3xY9"
                    />
                    <div className="min-w-64 flex-1 space-y-4">
                      <div>
                        <p className="mb-2 text-sm font-semibold text-foreground">Dot pattern</p>
                        <PatternPicker value={pattern} onChange={setPattern} />
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setQrDesign({ dotPattern: pattern })}
                      >
                        Apply pattern
                      </Button>
                    </div>
                  </div>
                </Card>
                <Card className="p-5">
                  <p className="mb-3 text-sm font-semibold text-foreground">Saved designs</p>
                  <div className="flex flex-wrap gap-3">
                    <QrTemplateCard name="Product" design={{ dotPattern: "rounded" }} applied />
                    <QrTemplateCard name="Event" design={{ dotPattern: "circle" }} />
                    <QrTemplateCard name="Print" design={{ dotPattern: "star" }} />
                  </div>
                </Card>
              </div>
            </Section>

            {/* ------------------------------------------------------------ */}
            <Section title="Page builder and domains">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="p-5">
                  <p className="mb-3 text-sm font-semibold text-foreground">Blocks</p>
                  <BlockList
                    blocks={blocks}
                    onMove={(id, direction) =>
                      setBlocks((current) => {
                        const index = current.findIndex((block) => block.id === id);
                        const next = direction === "up" ? index - 1 : index + 1;
                        if (index < 0 || next < 0 || next >= current.length) return current;
                        const copy = [...current];
                        const [moved] = copy.splice(index, 1);
                        if (!moved) return current;
                        copy.splice(next, 0, moved);
                        return copy;
                      })
                    }
                  />
                </Card>
                <div className="space-y-6">
                  <Card className="p-5">
                    <p className="mb-3 text-sm font-semibold text-foreground">DNS records</p>
                    <DnsRecordTable
                      records={[
                        {
                          type: "CNAME",
                          name: "go",
                          value: "proxy.steadlink.dev",
                          state: "verified",
                        },
                        {
                          type: "TXT",
                          name: "_steadlink",
                          value: "steadlink-verify=8f2a1c",
                          state: "pending",
                        },
                      ]}
                    />
                  </Card>
                  <Card className="p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">Engagements</p>
                      <ChartActionBar
                        onCompare={() => undefined}
                        onDownload={() => undefined}
                        onMore={() => undefined}
                      />
                    </div>
                    <div className="mt-4">
                      <DeviceFrame device="phone">
                        <div className="h-64 p-4">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="mt-3 h-8 w-32" />
                          <Skeleton className="mt-4 h-24 w-full" />
                        </div>
                      </DeviceFrame>
                    </div>
                  </Card>
                </div>
              </div>
            </Section>

            {/* ------------------------------------------------------------ */}
            <Section title="Copy" description="Every string here is written fresh.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="p-5">
                  <h3 className="text-lg font-semibold text-foreground">
                    Make a link people trust
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    Shorten, brand, and see who clicks. Every link you create can carry its own
                    domain, its own back-half, and its own analytics.
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <Button>Create a link</Button>
                    <CopyButton value="https://go.arjav.is-cool.dev" />
                  </div>
                </Card>
                <Card className="p-5">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Sparkles aria-hidden="true" className="size-4 text-ai" />
                    Ask about your data
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    Which traffic sources drove the most clicks last week?
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Chip>Summarise my week</Chip>
                    <Chip>Compare my top links</Chip>
                  </div>
                </Card>
              </div>
            </Section>
          </main>
        </div>

        <Modal
          open={modal}
          onOpenChange={setModal}
          title="Create a short link"
          description="Give it a destination and, if you like, a back-half."
          footer={
            <>
              <Button variant="ghost" onClick={() => setModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => setModal(false)}>Create link</Button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Destination URL" htmlFor="modal-url" required>
              <TextInput id="modal-url" placeholder="https://example.com" />
            </Field>
            <Field label="Back-half" htmlFor="modal-back" hint="Optional.">
              <TextInput id="modal-back" mono placeholder="auto" />
            </Field>
          </div>
        </Modal>

        <Modal
          open={drawer}
          onOpenChange={setDrawer}
          title="Filters"
          description="Narrow the list down."
          width="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setDrawer(false)}>
                Clear all
              </Button>
              <Button onClick={() => setDrawer(false)}>Apply</Button>
            </>
          }
        >
          <div className="space-y-4">
            <Select
              id="drawer-author"
              label="Created by"
              defaultValue="me"
              options={[
                { value: "me", label: "Me" },
                { value: "all", label: "Anyone" },
              ]}
            />
          </div>
        </Modal>
      </div>
    </TooltipProvider>
  );
}
