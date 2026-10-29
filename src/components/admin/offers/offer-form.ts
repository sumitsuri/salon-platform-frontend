import type {
  Branch,
  FestiveOffer,
  FestiveOfferInput,
  OfferBlock,
  OfferBlockType,
  OfferStudioInfo,
} from "@/lib/api";

export const DEFAULT_TERMS = "T&C apply • Valid for a limited period • Cannot be clubbed with other offers";
export const MAX_BLOCKS = 6;
export const MAX_INCLUDED = 8;

let counter = 0;
export const newKey = () => `k${Date.now().toString(36)}${(counter++).toString(36)}`;

export interface TierDraft {
  key: string;
  minSpend: string;
  percentOff: string;
  freeItem: string;
}

export interface ItemDraft {
  key: string;
  serviceId?: string;
  name: string;
  price: string;
}

export interface BlockDraft {
  key: string;
  type: OfferBlockType;
  title: string;
  appliesTo: string;
  tiers: TierDraft[];
  items: ItemDraft[];
  discountPercent: string;
}

export interface OfferDraft {
  branchId: string;
  occasion: string;
  headline: string;
  tagline: string;
  brandName: string;
  address: string;
  phone: string;
  validUntil: string;
  terms: string;
  blocks: BlockDraft[];
  included: string[];
  style: string;
  format: string;
  extraDirection: string;
  caption: string;
  /** True once the owner has changed the WhatsApp message by hand — only then is it sent to the server. */
  captionEdited: boolean;
}

export function newTier(): TierDraft {
  return { key: newKey(), minSpend: "", percentOff: "", freeItem: "" };
}

export function newBlock(type: OfferBlockType): BlockDraft {
  return {
    key: newKey(),
    type,
    title: "",
    appliesTo: "",
    tiers: type === "PACKAGE" ? [] : [newTier()],
    items: [],
    discountPercent: type === "PACKAGE" ? "20" : "",
  };
}

export function emptyDraft(args: {
  info: OfferStudioInfo | undefined;
  branches: Branch[];
  brandName: string;
  occasion?: string;
}): OfferDraft {
  const occasionId = args.occasion ?? "DIWALI";
  const occasion = args.info?.occasions.find((o) => o.id === occasionId);
  const branch = args.branches[0];
  return {
    branchId: branch?.id ?? "",
    occasion: occasionId,
    headline: occasion?.suggestedHeadline ?? "Festive Offers",
    tagline: occasion?.suggestedTagline ?? "",
    brandName: args.brandName,
    address: branch?.address ?? "",
    phone: branch?.phone ?? "",
    validUntil: "",
    terms: DEFAULT_TERMS,
    blocks: [newBlock("SPEND_PERCENT")],
    included: [],
    style: "FESTIVE_MAROON_GOLD",
    format: "PORTRAIT",
    extraDirection: "",
    caption: "",
    captionEdited: false,
  };
}

const str = (n: number | undefined | null) => (n === undefined || n === null ? "" : String(n));

export function draftFromOffer(o: FestiveOffer): OfferDraft {
  return {
    branchId: o.branchId,
    occasion: o.occasion,
    headline: o.headline,
    tagline: o.tagline ?? "",
    brandName: o.brandName,
    address: o.address ?? "",
    phone: o.phone ?? "",
    validUntil: o.validUntil ?? "",
    terms: o.terms ?? "",
    blocks: o.blocks.map((b) => ({
      key: newKey(),
      type: b.type,
      title: b.title ?? "",
      appliesTo: b.appliesTo ?? "",
      tiers: (b.tiers ?? []).map((t) => ({
        key: newKey(),
        minSpend: str(t.minSpend),
        percentOff: str(t.percentOff),
        freeItem: t.freeItem ?? "",
      })),
      items: (b.items ?? []).map((i) => ({ key: newKey(), serviceId: i.serviceId, name: i.name, price: str(i.price) })),
      discountPercent: str(b.discountPercent),
    })),
    included: o.includedServices ?? [],
    style: o.style,
    format: o.format,
    extraDirection: o.extraDirection ?? "",
    caption: o.caption ?? "",
    captionEdited: false,
  };
}

/** A copy with no identity, for "Duplicate". */
export function duplicateDraft(o: FestiveOffer): OfferDraft {
  const d = draftFromOffer(o);
  return { ...d, headline: `${d.headline} (copy)`.slice(0, 120), caption: "", captionEdited: false };
}

const num = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
};

function toBlock(b: BlockDraft): OfferBlock {
  if (b.type === "PACKAGE") {
    return {
      type: "PACKAGE",
      title: b.title.trim() || undefined,
      tiers: [],
      items: b.items.map((i) => ({ serviceId: i.serviceId, name: i.name.trim(), price: num(i.price) })),
      discountPercent: num(b.discountPercent),
    };
  }
  return {
    type: b.type,
    appliesTo: b.appliesTo.trim() || undefined,
    items: [],
    tiers: b.tiers.map((t) =>
      b.type === "SPEND_PERCENT"
        ? { minSpend: num(t.minSpend), percentOff: num(t.percentOff) }
        : { minSpend: num(t.minSpend), freeItem: t.freeItem.trim() }
    ),
  };
}

export function toInput(d: OfferDraft): FestiveOfferInput {
  return {
    branchId: d.branchId,
    occasion: d.occasion,
    headline: d.headline.trim(),
    tagline: d.tagline.trim() || undefined,
    brandName: d.brandName.trim(),
    address: d.address.trim() || undefined,
    phone: d.phone.trim() || undefined,
    validUntil: d.validUntil || null,
    terms: d.terms.trim() || undefined,
    blocks: d.blocks.map(toBlock),
    includedServices: d.included,
    style: d.style,
    format: d.format,
    extraDirection: d.extraDirection.trim() || undefined,
    caption: d.captionEdited && d.caption.trim() ? d.caption.trim() : undefined,
  };
}

/** The first thing wrong with the form, in plain words, or null when it can be saved. */
export function validateDraft(d: OfferDraft, msgs: { needBranch: string; needOffer: string }): string | null {
  if (!d.branchId) return msgs.needBranch;
  if (!d.headline.trim()) return "Add a headline.";
  if (!d.brandName.trim()) return "Add the name to show on the poster.";
  if (d.blocks.length === 0) return msgs.needOffer;
  for (const [index, b] of d.blocks.entries()) {
    const label = `Offer ${index + 1}`;
    if (b.type === "PACKAGE") {
      if (b.items.length < 2) return `${label}: add at least 2 services to the package.`;
      if (b.items.some((i) => !i.name.trim() || !(num(i.price) > 0))) return `${label}: every service needs a name and a price.`;
      const pct = num(b.discountPercent);
      if (!(pct >= 1 && pct <= 90)) return `${label}: the discount must be between 1% and 90%.`;
    } else {
      if (b.tiers.length === 0) return `${label}: add at least one level.`;
      for (const t of b.tiers) {
        if (!(num(t.minSpend) >= 1)) return `${label}: enter the spend amount for every level.`;
        if (b.type === "SPEND_PERCENT") {
          const pct = num(t.percentOff);
          if (!(pct >= 1 && pct <= 90)) return `${label}: the discount must be between 1% and 90%.`;
        } else if (!t.freeItem.trim()) {
          return `${label}: say what the customer gets free.`;
        }
      }
      const amounts = b.tiers.map((t) => num(t.minSpend));
      if (new Set(amounts).size !== amounts.length) return `${label}: two levels have the same spend amount.`;
    }
  }
  const phone = d.phone.trim();
  if (phone && !/^[0-9+()\-\s]{8,25}$/.test(phone)) return "Enter a valid phone number.";
  return null;
}

/**
 * Snapshot of everything that changes the poster, used to tell whether the form differs from what was last saved.
 * The WhatsApp message is left out on purpose: editing it must not stop the owner generating a poster.
 */
export function draftFingerprint(d: OfferDraft): string {
  return JSON.stringify({ ...toInput(d), caption: undefined });
}

export function packageTotals(b: BlockDraft): { mrp: number; price: number } | null {
  const prices = b.items.map((i) => num(i.price));
  if (prices.length === 0 || prices.some((p) => !(p > 0))) return null;
  const pct = num(b.discountPercent);
  if (!(pct >= 0)) return null;
  const mrp = prices.reduce((a, c) => a + c, 0);
  return { mrp: Math.round(mrp), price: Math.round((mrp * (100 - pct)) / 100) };
}
