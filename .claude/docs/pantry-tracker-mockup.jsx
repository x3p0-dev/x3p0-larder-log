import React, { useState, useEffect, useMemo, useRef } from "react";
import {
	Plus, Minus, ChevronDown, Pencil, Check, Search, Trash2, Store as StoreIcon, MapPin,
	Menu, ArrowUpDown, X, ShoppingCart, UtensilsCrossed,
	Beef, Carrot, Wheat, Milk, Droplet, Cookie, Popcorn, Coffee, Flame,
	Snowflake, Package, Box, Archive, Refrigerator, Warehouse, ShoppingBasket, Layers, Home, Boxes,
} from "lucide-react";

// ---- color helpers: derive light/dark tints & text from one base "ink" hue ----
function hexToRgb(hex) {
	const h = hex.replace("#", "");
	const n = parseInt(h, 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lighten(hex, amt) {
	const [r, g, b] = hexToRgb(hex);
	const mix = (c) => Math.round(c + (255 - c) * amt);
	return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
function withAlpha(hex, a) {
	const [r, g, b] = hexToRgb(hex);
	return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function themed(inkHex, dark) {
	if (dark) return { ink: lighten(inkHex, 0.55), bg: withAlpha(inkHex, 0.22), ring: withAlpha(inkHex, 0.45) };
	return { ink: inkHex, bg: lighten(inkHex, 0.88), ring: lighten(inkHex, 0.72) };
}
function hashStr(s) {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
	return h;
}

function useSystemTheme() {
	const [dark, setDark] = useState(() =>
		typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)").matches : false
	);
	useEffect(() => {
		if (!window.matchMedia) return;
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const listener = (e) => setDark(e.matches);
		mq.addEventListener ? mq.addEventListener("change", listener) : mq.addListener(listener);
		return () => (mq.removeEventListener ? mq.removeEventListener("change", listener) : mq.removeListener(listener));
	}, []);
	return dark;
}

const ICON_OPTIONS = [
	{ key: "snowflake", Icon: Snowflake },
	{ key: "refrigerator", Icon: Refrigerator },
	{ key: "package", Icon: Package },
	{ key: "box", Icon: Box },
	{ key: "boxes", Icon: Boxes },
	{ key: "archive", Icon: Archive },
	{ key: "warehouse", Icon: Warehouse },
	{ key: "basket", Icon: ShoppingBasket },
	{ key: "layers", Icon: Layers },
	{ key: "home", Icon: Home },
];
function iconFor(key) {
	return (ICON_OPTIONS.find((o) => o.key === key) || ICON_OPTIONS[3]).Icon;
}

const TYPE_ICON_OPTIONS = [
	{ key: "beef", Icon: Beef },
	{ key: "carrot", Icon: Carrot },
	{ key: "wheat", Icon: Wheat },
	{ key: "milk", Icon: Milk },
	{ key: "droplet", Icon: Droplet },
	{ key: "cookie", Icon: Cookie },
	{ key: "popcorn", Icon: Popcorn },
	{ key: "coffee", Icon: Coffee },
	{ key: "flame", Icon: Flame },
	{ key: "utensils", Icon: UtensilsCrossed },
];
function typeIconFor(key) {
	return (TYPE_ICON_OPTIONS.find((o) => o.key === key) || TYPE_ICON_OPTIONS[9]).Icon;
}

const DEFAULT_PALETTE = ["#8C4A2F", "#3C6B3C", "#96631A", "#2C5A6E", "#6B5B7A", "#7A5230", "#8C2F6B", "#2F6B8C", "#5B6B3F", "#8C2F2F"];
const STATUS_INK = { out: "#8C2F2F", low: "#96631A", ok: "#3C6B3C" };
const PAGE_SIZE = 20;

function colorFor(catName, categoriesList, dark) {
	const found = categoriesList.find((c) => c.name === catName);
	const ink = found && found.ink ? found.ink : DEFAULT_PALETTE[hashStr(catName) % DEFAULT_PALETTE.length];
	return themed(ink, dark);
}
function statusFor(qty, threshold, dark) {
	if (qty <= 0) return { key: "out", label: "Out", ...themed(STATUS_INK.out, dark) };
	if (qty <= threshold) return { key: "low", label: "Low", ...themed(STATUS_INK.low, dark) };
	return { key: "ok", label: "In stock", ...themed(STATUS_INK.ok, dark) };
}
function entityColorFor(name, list, dark) {
	const found = list.find((t) => t.name === name);
	const ink = found ? found.ink : DEFAULT_PALETTE[hashStr(name) % DEFAULT_PALETTE.length];
	return themed(ink, dark);
}
// "fill" chips (Location, Type) invert to a solid background when active; "ring" chips (Store) always
// stay outlined/transparent and just get a heavier border + light tint when active
function chipStyle(tc, active, dark, variant) {
	if (variant === "ring") {
		return { background: active ? tc.bg : "transparent", color: tc.ink, border: `${active ? 2 : 1}px solid ${active ? tc.ink : tc.ring}` };
	}
	return { background: active ? tc.ink : tc.bg, color: active ? (dark ? "#1B1D16" : "#fff") : tc.ink, border: "1px solid transparent" };
}

function getTheme(dark) {
	return dark
		? {
			pageBg: "#1B1D16", surface: "#242620", surfaceAlt: "#1F211B",
			border: "#33352A", borderStrong: "#454736",
			text: "#EDE9DB", textStrong: "#F5F2E8", textMuted: "#9C9680", textFaint: "#726C5A",
			neutralChipBg: "#2F3126", neutralChipText: "#C9C3AE",
			primaryBg: "#5C7A4A", primaryText: "#F5F2E8",
			inkBg: "#EDE9DB", inkText: "#1B1D16",
			dangerText: "#D69999",
		}
		: {
			pageBg: "#F5F2EA", surface: "#FFFFFF", surfaceAlt: "#FAF8F2",
			border: "#DED6C3", borderStrong: "#CFC6AC",
			text: "#20241E", textStrong: "#1E2A1E", textMuted: "#8A8265", textFaint: "#A9A38A",
			neutralChipBg: "#F5F2EA", neutralChipText: "#20241E",
			primaryBg: "#3C4A32", primaryText: "#F5F2EA",
			inkBg: "#20241E", inkText: "#F5F2EA",
			dangerText: "#B08787",
		};
}

const initialCategories = [
	{ name: "Upright Freezer", icon: "snowflake", ink: "#2C5A6E" },
	{ name: "Chest Freezer", icon: "snowflake", ink: "#2C5A6E" },
	{ name: "Pantry", icon: "package", ink: "#5B6B3F" },
];
const initialTypes = [
	{ name: "Protein", ink: "#8C4A2F", icon: "beef" },
	{ name: "Produce", ink: "#3C6B3C", icon: "carrot" },
	{ name: "Grain", ink: "#96631A", icon: "wheat" },
	{ name: "Dairy", ink: "#2C5A6E", icon: "milk" },
	{ name: "Condiment", ink: "#6B5B7A", icon: "droplet" },
	{ name: "Baking", ink: "#7A5230", icon: "cookie" },
	{ name: "Snack", ink: "#8C2F6B", icon: "popcorn" },
	{ name: "Beverage", ink: "#2F6B8C", icon: "coffee" },
	{ name: "Spice", ink: "#8C2F2F", icon: "flame" },
];
const initialStores = [
	{ name: "Costco", ink: "#5B6B3F" },
	{ name: "Publix", ink: "#2F6B8C" },
	{ name: "Calfee Cattle", ink: "#8C2F2F" },
];

const initialItems = [
	// Pantry
	{ id: 1, name: "Black Beans, canned", category: "Pantry", types: ["Protein"], stores: ["Publix"], qty: 8, threshold: 3, notes: "", open: false },
	{ id: 2, name: "Rolled Oats", category: "Pantry", types: ["Grain"], stores: ["Costco"], qty: 1, threshold: 1, notes: "Buy the big tub next time, cheaper per oz.", open: false },
	{ id: 3, name: "Olive Oil", category: "Pantry", types: ["Condiment"], stores: ["Costco"], qty: 2, threshold: 1, notes: "", open: false },
	{ id: 4, name: "White Rice", category: "Pantry", types: ["Grain"], stores: ["Costco"], qty: 10, threshold: 2, notes: "", open: false },
	{ id: 5, name: "Peanut Butter", category: "Pantry", types: ["Condiment"], stores: ["Publix"], qty: 1, threshold: 1, notes: "", open: false },
	{ id: 6, name: "Canned Diced Tomatoes", category: "Pantry", types: ["Produce"], stores: ["Publix"], qty: 0, threshold: 2, notes: "", open: false },
	{ id: 7, name: "Spaghetti", category: "Pantry", types: ["Grain"], stores: ["Publix"], qty: 5, threshold: 2, notes: "", open: false },
	{ id: 8, name: "Shelf-Stable Milk", category: "Pantry", types: ["Dairy"], stores: [], qty: 1, threshold: 1, notes: "", open: false },
	{ id: 9, name: "Ground Cinnamon", category: "Pantry", types: ["Spice", "Baking"], stores: ["Costco"], qty: 1, threshold: 1, notes: "", open: false },
	{ id: 10, name: "Sparkling Water, 12-pack", category: "Pantry", types: ["Beverage"], stores: ["Costco"], qty: 2, threshold: 1, notes: "", open: false },
	// Upright Freezer
	{ id: 11, name: "Chicken Thighs", category: "Upright Freezer", types: ["Protein"], stores: ["Publix"], qty: 1, threshold: 2, notes: "", open: false },
	{ id: 12, name: "Ice Cream", category: "Upright Freezer", types: ["Snack", "Dairy"], stores: ["Costco"], qty: 3, threshold: 1, notes: "", open: false },
	{ id: 13, name: "Frozen Waffles", category: "Upright Freezer", types: ["Grain"], stores: ["Costco"], qty: 2, threshold: 1, notes: "", open: false },
	{ id: 14, name: "Shrimp, frozen bag", category: "Upright Freezer", types: ["Protein"], stores: ["Publix"], qty: 0, threshold: 1, notes: "", open: false },
	{ id: 15, name: "Frozen Mixed Berries", category: "Upright Freezer", types: ["Produce"], stores: ["Costco"], qty: 4, threshold: 1, notes: "", open: false },
	{ id: 16, name: "Breakfast Sausage", category: "Upright Freezer", types: ["Protein"], stores: ["Calfee Cattle"], qty: 2, threshold: 1, notes: "", open: false },
	{ id: 17, name: "Frozen Pizza", category: "Upright Freezer", types: ["Snack", "Grain"], stores: ["Publix"], qty: 1, threshold: 1, notes: "", open: false },
	// Chest Freezer
	{ id: 18, name: "Ground Beef (1lb pkgs)", category: "Chest Freezer", types: ["Protein"], stores: ["Calfee Cattle"], qty: 6, threshold: 2, notes: "80/20 blend, from the co-op order.", open: false },
	{ id: 19, name: "Ribeye Steaks", category: "Chest Freezer", types: ["Protein"], stores: ["Calfee Cattle"], qty: 4, threshold: 2, notes: "", open: false },
	{ id: 20, name: "Frozen Peas", category: "Chest Freezer", types: ["Produce"], stores: ["Publix"], qty: 0, threshold: 1, notes: "", open: false },
	{ id: 21, name: "Pork Chops", category: "Chest Freezer", types: ["Protein"], stores: ["Calfee Cattle"], qty: 3, threshold: 2, notes: "", open: false },
	{ id: 22, name: "Chicken Stock, quart bags", category: "Chest Freezer", types: ["Condiment", "Protein"], stores: [], qty: 2, threshold: 1, notes: "", open: false },
	{ id: 23, name: "Ground Turkey", category: "Chest Freezer", types: ["Protein"], stores: ["Publix"], qty: 1, threshold: 2, notes: "", open: false },
	{ id: 24, name: "Sweet Corn, frozen", category: "Chest Freezer", types: ["Produce"], stores: ["Costco"], qty: 5, threshold: 2, notes: "", open: false },
];

const emptyForm = { name: "", category: "", types: [], stores: [], qty: 1, threshold: 1, notes: "" };

// Unified chip picker: used both for sidebar filters (always single-select) and for the item
// add/edit forms (Location single-select, Type/Store multi-select). New entries are created via a
// trailing dashed "+" chip that expands into a small color (and, for locations, icon) picker -
// the same interaction everywhere, rather than a separate always-open text field.
function ChipPicker({ kind, entities, selected, multi, onSelect, onToggle, onCreate, theme, dark, leadingAll, countFor }) {
	const isLocation = kind === "location";
	const hasIconPicker = kind === "location" || kind === "type";
	const iconOptions = kind === "location" ? ICON_OPTIONS : TYPE_ICON_OPTIONS;
	const defaultIconKey = kind === "location" ? ICON_OPTIONS[3].key : TYPE_ICON_OPTIONS[9].key;

	const [adding, setAdding] = useState(false);
	const [name, setName] = useState("");
	const [color, setColor] = useState(DEFAULT_PALETTE[0]);
	const [icon, setIcon] = useState(defaultIconKey);

	const shapeClass = isLocation ? "rounded-md" : "rounded-full";
	const variant = kind === "store" ? "ring" : "fill";
	const label = kind === "location" ? "Location" : kind === "type" ? "Type" : "Store";

	function submit() {
		const n = name.trim();
		if (!n) return;
		if (!entities.some((e) => e.name === n)) onCreate(n, color, hasIconPicker ? icon : undefined);
		if (multi) { if (!selected.includes(n)) onToggle(n); } else onSelect(n);
		setName(""); setAdding(false); setColor(DEFAULT_PALETTE[0]); setIcon(defaultIconKey);
	}

	return (
		<div>
			<div className="flex flex-wrap gap-1.5 items-center">
				{leadingAll && (
					<button
						type="button"
						onClick={leadingAll.onClick}
						className={`px-2.5 py-1 ${shapeClass} text-xs font-medium`}
						style={{ background: leadingAll.active ? theme.inkBg : theme.neutralChipBg, color: leadingAll.active ? theme.inkText : theme.neutralChipText }}
					>
						{leadingAll.label} <span className="opacity-60">{leadingAll.count}</span>
					</button>
				)}
				{entities.map((e) => {
					const isActive = multi ? selected.includes(e.name) : selected === e.name;
					const tc = entityColorFor(e.name, entities, dark);
					return (
						<button
							key={e.name}
							type="button"
							onClick={() => (multi ? onToggle(e.name) : onSelect(isActive ? null : e.name))}
							className={`px-2.5 py-1 ${shapeClass} text-xs font-medium`}
							style={chipStyle(tc, isActive, dark, variant)}
						>
							{e.name}{countFor && <span className="opacity-60"> {countFor(e.name)}</span>}
						</button>
					);
				})}
				<button
					type="button"
					onClick={() => setAdding((v) => !v)}
					className={`px-2.5 py-1 ${shapeClass} text-xs font-medium flex items-center gap-1 border border-dashed`}
					style={{ borderColor: adding ? theme.inkBg : theme.borderStrong, color: adding ? theme.text : theme.textMuted, background: "transparent" }}
				>
					<Plus size={11} /> {label}
				</button>
			</div>

			{adding && (
				<div className="mt-2 p-2.5 rounded-md" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
					<div className="flex flex-wrap gap-1.5 mb-2">
						{DEFAULT_PALETTE.map((hex) => (
							<button
								key={hex} type="button" onClick={() => setColor(hex)}
								className="w-5 h-5 rounded-full shrink-0"
								style={{ background: hex, boxShadow: color === hex ? `0 0 0 2px ${theme.surface}, 0 0 0 4px ${hex}` : "none" }}
								aria-label={`Choose color ${hex}`}
							/>
						))}
					</div>
					{hasIconPicker && (
						<div className="grid grid-cols-5 gap-1 mb-2">
							{iconOptions.map(({ key, Icon }) => {
								const active = icon === key;
								return (
									<button
										key={key} type="button" onClick={() => setIcon(key)}
										className="aspect-square rounded flex items-center justify-center"
										style={{ background: active ? color : theme.neutralChipBg, color: active ? "#fff" : theme.text }}
										aria-label={key}
									>
										<Icon size={14} />
									</button>
								);
							})}
						</div>
					)}
					<div className="flex gap-1">
						<input
							autoFocus value={name} onChange={(e) => setName(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submit())}
							placeholder={`${label} name`}
							className="flex-1 min-w-0 text-sm px-2 py-1 rounded border outline-none"
							style={{ borderColor: theme.borderStrong, background: theme.surface, color: theme.text }}
						/>
						<button type="button" onClick={submit} className="px-2 rounded text-xs font-medium" style={{ background: theme.inkBg, color: theme.inkText }}>Add</button>
						<button type="button" onClick={() => { setAdding(false); setName(""); }} className="px-2 rounded text-xs" style={{ color: theme.textFaint }}>Cancel</button>
					</div>
				</div>
			)}
		</div>
	);
}

// collapsible sidebar wrapper around ChipPicker: adds the header, open/close, and a Clear link.
// Sidebar filters are always single-select, even for Type/Store where the item fields themselves are multi-select.
function FacetSection({ title, kind, Icon, entities, active, onSelect, onCreate, theme, dark, defaultOpen = false }) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<div className="mt-5 first:mt-0">
			<div
				className="flex items-center justify-between py-1 gap-2 cursor-pointer"
				onClick={() => setOpen((v) => !v)}
				role="button" tabIndex={0}
				onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen((v) => !v)}
			>
        <span className="flex items-center gap-1.5 mono text-xs uppercase tracking-widest min-w-0" style={{ color: theme.textMuted }}>
          <Icon size={12} className="shrink-0" />
          <span className="truncate">{title}</span>
		{active && <span className="mono normal-case shrink-0" style={{ color: theme.textFaint }}>· {active}</span>}
        </span>
				<div className="flex items-center gap-2 shrink-0">
					{active && (
						<button onClick={(e) => { e.stopPropagation(); onSelect(null); }} className="text-xs underline" style={{ color: theme.textFaint }}>
							Clear
						</button>
					)}
					<ChevronDown size={13} style={{ color: theme.textFaint, transform: open ? "none" : "rotate(-90deg)", transition: "transform 0.15s" }} />
				</div>
			</div>
			{open && (
				<div className="mt-2">
					<ChipPicker kind={kind} entities={entities} selected={active} multi={false} onSelect={onSelect} onCreate={onCreate} theme={theme} dark={dark} />
				</div>
			)}
		</div>
	);
}

// numbered status filter chip in the header
function StatusChip({ statusKey, label, count, active, dark, onClick }) {
	const ink = STATUS_INK[statusKey];
	const t = themed(ink, dark);
	return (
		<button
			onClick={onClick}
			className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-all"
			style={{ background: active ? t.ink : t.bg, boxShadow: active ? `0 0 0 2px ${t.ring}` : "none" }}
		>
      <span
	      className="mono text-xs font-semibold w-5 h-5 rounded-full flex items-center justify-center shrink-0"
	      style={{ background: active ? (dark ? "#1B1D16" : "#fff") : t.ink, color: active ? t.ink : (dark ? "#1B1D16" : "#fff") }}
      >
        {count}
      </span>
			<span className="text-xs font-medium" style={{ color: active ? (dark ? "#1B1D16" : "#fff") : t.ink }}>{label}</span>
		</button>
	);
}

// a single editable row inside the settings drawer: color dot, inline-editable name, delete
function TaxonomyRow({ entity, onRename, onDelete, colorOpen, setColorOpen, theme }) {
	const [draft, setDraft] = useState(entity.name);
	useEffect(() => { setDraft(entity.name); }, [entity.name]);
	function commit() {
		if (draft.trim() && draft.trim() !== entity.name) onRename(entity.name, draft.trim());
		else setDraft(entity.name);
	}
	return (
		<div className="flex items-center gap-2 py-1">
			<button
				onClick={() => setColorOpen(colorOpen === entity.name ? null : entity.name)}
				className="w-4 h-4 rounded-full shrink-0"
				style={{ background: entity.ink }}
				aria-label={`Change color for ${entity.name}`}
			/>
			<input
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => { if (e.key === "Enter") { commit(); e.target.blur(); } }}
				className="flex-1 min-w-0 text-sm px-2 py-1 rounded border outline-none"
				style={{ borderColor: theme.borderStrong, background: theme.surface, color: theme.text }}
			/>
			<button onClick={() => onDelete(entity.name)} className="shrink-0" style={{ color: theme.dangerText }} aria-label={`Delete ${entity.name}`}>
				<Trash2 size={14} />
			</button>
		</div>
	);
}

function TaxonomyManager({ title, entities, onRename, onDelete, onRecolor, theme }) {
	const [colorOpen, setColorOpen] = useState(null);
	return (
		<div>
			<p className="mono text-xs uppercase tracking-widest mb-2" style={{ color: theme.textMuted }}>{title}</p>
			{entities.length === 0 && <p className="text-xs" style={{ color: theme.textFaint }}>None yet</p>}
			<div className="flex flex-col">
				{entities.map((e) => (
					<React.Fragment key={e.name}>
						<TaxonomyRow entity={e} onRename={onRename} onDelete={onDelete} colorOpen={colorOpen} setColorOpen={setColorOpen} theme={theme} />
						{colorOpen === e.name && (
							<div className="flex flex-wrap gap-1.5 mb-2 ml-6">
								{DEFAULT_PALETTE.map((hex) => (
									<button
										key={hex}
										onClick={() => { onRecolor(e.name, hex); setColorOpen(null); }}
										className="w-5 h-5 rounded-full shrink-0"
										style={{ background: hex, boxShadow: e.ink === hex ? `0 0 0 2px ${theme.surface}, 0 0 0 4px ${hex}` : "none" }}
										aria-label={`Set color ${hex}`}
									/>
								))}
							</div>
						)}
					</React.Fragment>
				))}
			</div>
		</div>
	);
}

export default function PantryTracker() {
	const systemDark = useSystemTheme();
	const [themeOverride, setThemeOverride] = useState("system"); // 'system' | 'light' | 'dark'
	const dark = themeOverride === "system" ? systemDark : themeOverride === "dark";
	const theme = getTheme(dark);

	const [settingsOpen, setSettingsOpen] = useState(false);
	const [sortMenuOpen, setSortMenuOpen] = useState(false);
	const [sortBy, setSortBy] = useState("default");
	const [defaultThreshold, setDefaultThreshold] = useState(1);

	const [items, setItems] = useState(initialItems);
	const [categories, setCategories] = useState(initialCategories);
	const [types, setTypes] = useState(initialTypes);
	const [stores, setStores] = useState(initialStores);

	const [activeCat, setActiveCat] = useState("All");
	const [activeType, setActiveType] = useState(null);
	const [activeStore, setActiveStore] = useState(null);
	const [activeStatus, setActiveStatus] = useState(null);
	const [query, setQuery] = useState("");

	const [locationOpen, setLocationOpen] = useState(true);

	const [showForm, setShowForm] = useState(false);
	const [form, setForm] = useState({ ...emptyForm, category: "Pantry" });
	const [formError, setFormError] = useState("");
	const [editingId, setEditingId] = useState(null);
	const [editForm, setEditForm] = useState(null);

	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
	const sentinelRef = useRef(null);

	const [pendingRemoval, setPendingRemoval] = useState(null);
	const undoTimeoutRef = useRef(null);

	const [shoppingListOpen, setShoppingListOpen] = useState(false);
	const [shoppingStoreChoice, setShoppingStoreChoice] = useState(null);

	const preStatusFiltered = useMemo(() => {
		return items.filter((it) => {
			const matchesCat = activeCat === "All" || it.category === activeCat;
			const matchesType = !activeType || it.types.includes(activeType);
			const matchesStore = !activeStore || it.stores.includes(activeStore);
			const matchesQuery = it.name.toLowerCase().includes(query.toLowerCase());
			return matchesCat && matchesType && matchesStore && matchesQuery;
		});
	}, [items, activeCat, activeType, activeStore, query]);

	const statusCounts = useMemo(() => {
		const c = { ok: 0, low: 0, out: 0 };
		preStatusFiltered.forEach((it) => { c[statusFor(it.qty, it.threshold, dark).key]++; });
		return c;
	}, [preStatusFiltered, dark]);

	const filtered = useMemo(() => {
		if (!activeStatus) return preStatusFiltered;
		return preStatusFiltered.filter((it) => statusFor(it.qty, it.threshold, dark).key === activeStatus);
	}, [preStatusFiltered, activeStatus, dark]);

	const sorted = useMemo(() => {
		const arr = [...filtered];
		if (sortBy === "name-asc") arr.sort((a, b) => a.name.localeCompare(b.name));
		else if (sortBy === "name-desc") arr.sort((a, b) => b.name.localeCompare(a.name));
		else if (sortBy === "qty-asc") arr.sort((a, b) => a.qty - b.qty);
		else if (sortBy === "qty-desc") arr.sort((a, b) => b.qty - a.qty);
		return arr;
	}, [filtered, sortBy]);

	useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeCat, activeType, activeStore, activeStatus, query]);

	const visibleItems = sorted.slice(0, visibleCount);

	useEffect(() => {
		const el = sentinelRef.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					setVisibleCount((prev) => (prev < filtered.length ? Math.min(prev + PAGE_SIZE, filtered.length) : prev));
				}
			},
			{ rootMargin: "200px" }
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [filtered.length, visibleCount]);

	const catCounts = useMemo(() => {
		const c = {};
		categories.forEach((cat) => (c[cat.name] = items.filter((i) => i.category === cat.name).length));
		return c;
	}, [items, categories]);

	const anyFilterActive = activeCat !== "All" || !!activeType || !!activeStore || !!activeStatus || query.trim();

	function clearAllFilters() {
		setActiveCat("All"); setActiveType(null); setActiveStore(null); setActiveStatus(null); setQuery("");
	}

	function adjustQty(id, delta) {
		setItems((prev) => prev.map((it) => (it.id === id ? { ...it, qty: Math.max(0, it.qty + delta) } : it)));
	}
	function toggleOpen(id) {
		setItems((prev) => prev.map((it) => (it.id === id ? { ...it, open: !it.open } : { ...it, open: false })));
		if (editingId === id) { setEditingId(null); setEditForm(null); }
	}

	function removeItem(id) {
		const item = items.find((i) => i.id === id);
		if (!item) return;
		setItems((prev) => prev.filter((i) => i.id !== id));
		if (editingId === id) { setEditingId(null); setEditForm(null); }
		if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
		setPendingRemoval(item);
		undoTimeoutRef.current = setTimeout(() => setPendingRemoval(null), 6000);
	}
	function undoRemove() {
		if (!pendingRemoval) return;
		setItems((prev) => [pendingRemoval, ...prev]);
		if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
		setPendingRemoval(null);
	}

	function toggleStatus(key) { setActiveStatus((prev) => (prev === key ? null : key)); }

	function createCategory(name, color, icon) {
		if (!name || categories.some((c) => c.name === name)) return;
		setCategories((prev) => [...prev, { name, icon: icon || ICON_OPTIONS[3].key, ink: color || DEFAULT_PALETTE[hashStr(name) % DEFAULT_PALETTE.length] }]);
	}
	function renameCategory(oldName, newName) {
		if (!newName || newName === oldName) return;
		setCategories((prev) => prev.map((c) => (c.name === oldName ? { ...c, name: newName } : c)));
		setItems((prev) => prev.map((it) => (it.category === oldName ? { ...it, category: newName } : it)));
		setForm((f) => (f.category === oldName ? { ...f, category: newName } : f));
		if (activeCat === oldName) setActiveCat(newName);
	}
	function recolorCategory(name, color) {
		setCategories((prev) => prev.map((c) => (c.name === name ? { ...c, ink: color } : c)));
	}
	function deleteCategory(name) {
		setCategories((prev) => prev.filter((c) => c.name !== name));
		if (activeCat === name) setActiveCat("All");
	}

	function createType(name, color, icon) {
		if (!name || types.some((t) => t.name === name)) return;
		setTypes((prev) => [...prev, { name, ink: color || DEFAULT_PALETTE[hashStr(name) % DEFAULT_PALETTE.length], icon: icon || "utensils" }]);
	}
	function renameType(oldName, newName) {
		if (!newName || newName === oldName) return;
		setTypes((prev) => prev.map((e) => (e.name === oldName ? { ...e, name: newName } : e)));
		setItems((prev) => prev.map((it) => (it.types.includes(oldName) ? { ...it, types: it.types.map((t) => (t === oldName ? newName : t)) } : it)));
		if (activeType === oldName) setActiveType(newName);
	}
	function recolorType(name, color) { setTypes((prev) => prev.map((e) => (e.name === name ? { ...e, ink: color } : e))); }
	function deleteType(name) {
		setTypes((prev) => prev.filter((e) => e.name !== name));
		setItems((prev) => prev.map((it) => (it.types.includes(name) ? { ...it, types: it.types.filter((t) => t !== name) } : it)));
		if (activeType === name) setActiveType(null);
	}

	function createStore(name, color) {
		if (!name || stores.some((s) => s.name === name)) return;
		setStores((prev) => [...prev, { name, ink: color || DEFAULT_PALETTE[hashStr(name) % DEFAULT_PALETTE.length] }]);
	}
	function renameStore(oldName, newName) {
		if (!newName || newName === oldName) return;
		setStores((prev) => prev.map((e) => (e.name === oldName ? { ...e, name: newName } : e)));
		setItems((prev) => prev.map((it) => (it.stores.includes(oldName) ? { ...it, stores: it.stores.map((s) => (s === oldName ? newName : s)) } : it)));
		if (activeStore === oldName) setActiveStore(newName);
		if (shoppingStoreChoice === oldName) setShoppingStoreChoice(newName);
	}
	function recolorStore(name, color) { setStores((prev) => prev.map((e) => (e.name === name ? { ...e, ink: color } : e))); }
	function deleteStore(name) {
		setStores((prev) => prev.filter((e) => e.name !== name));
		setItems((prev) => prev.map((it) => (it.stores.includes(name) ? { ...it, stores: it.stores.filter((s) => s !== name) } : it)));
		if (activeStore === name) setActiveStore(null);
		if (shoppingStoreChoice === name) setShoppingStoreChoice(null);
	}

	function handleAddItem() {
		if (!form.name.trim()) { setFormError("Give the item a name first."); return; }
		setItems((prev) => [{
			id: Date.now(), name: form.name.trim(), category: form.category || categories[0]?.name || "",
			types: form.types, stores: form.stores,
			qty: Number(form.qty) || 0, threshold: Number(form.threshold) || 0, notes: form.notes.trim(), open: false,
		}, ...prev]);
		setForm({ ...emptyForm, category: form.category });
		setFormError(""); setShowForm(false);
	}
	function startEdit(it) {
		setEditingId(it.id);
		setEditForm({ name: it.name, category: it.category, types: [...it.types], stores: [...it.stores], qty: it.qty, threshold: it.threshold, notes: it.notes });
	}
	function saveEdit(id) {
		if (!editForm.name.trim()) return;
		setItems((prev) => prev.map((it) => it.id === id ? {
			...it, name: editForm.name.trim(), category: editForm.category, types: editForm.types, stores: editForm.stores,
			qty: Number(editForm.qty) || 0, threshold: Number(editForm.threshold) || 0, notes: editForm.notes.trim(),
		} : it));
		setEditingId(null); setEditForm(null);
	}
	function cancelEdit() { setEditingId(null); setEditForm(null); }

	const shoppingItems = useMemo(() => {
		if (!shoppingStoreChoice) return [];
		return items
			.filter((it) => it.stores.includes(shoppingStoreChoice) && statusFor(it.qty, it.threshold, dark).key !== "ok")
			.sort((a, b) => (a.qty <= 0 ? -1 : 1) - (b.qty <= 0 ? -1 : 1));
	}, [items, shoppingStoreChoice, dark]);

	const inputStyle = { borderColor: theme.borderStrong, background: theme.surface, color: theme.text };
	const labelStyle = { color: theme.textMuted };

	return (
		<div
			className="min-h-screen w-full transition-colors duration-200"
			style={{ background: theme.pageBg, fontFamily: "'Inter', system-ui, sans-serif", color: theme.text, colorScheme: dark ? "dark" : "light" }}
		>
			<style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');
        .disp { font-family: 'Fraunces', serif; font-optical-sizing: auto; }
        .mono { font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.02em; }
      `}</style>

			<header className="transition-colors duration-200">
				<div className="max-w-5xl mx-auto px-6 pt-5 pb-3 flex items-center justify-between flex-wrap gap-3">
					<h1 className="disp text-lg sm:text-xl font-semibold leading-none" style={{ color: theme.textStrong }}>Larder Log</h1>
					<div className="flex items-center gap-2 flex-wrap">
						<StatusChip statusKey="ok" label="In stock" count={statusCounts.ok} active={activeStatus === "ok"} dark={dark} onClick={() => toggleStatus("ok")} />
						<StatusChip statusKey="low" label="Low" count={statusCounts.low} active={activeStatus === "low"} dark={dark} onClick={() => toggleStatus("low")} />
						<StatusChip statusKey="out" label="Out" count={statusCounts.out} active={activeStatus === "out"} dark={dark} onClick={() => toggleStatus("out")} />
						<button
							onClick={() => setSettingsOpen(true)}
							className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
							style={{ background: theme.neutralChipBg, color: theme.textFaint }}
							aria-label="Settings"
						>
							<Menu size={17} />
						</button>
					</div>
				</div>
			</header>

			<div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-[190px_1fr] gap-6">
				{/* Sidebar */}
				<aside>
					{/* Location - collapsible like the other facets, open by default */}
					<div
						className="flex items-center justify-between py-1 cursor-pointer"
						onClick={() => setLocationOpen((v) => !v)}
						role="button" tabIndex={0}
						onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setLocationOpen((v) => !v)}
					>
            <span className="flex items-center gap-1.5 mono text-xs uppercase tracking-widest" style={labelStyle}>
              <MapPin size={12} />
              Location
		    {activeCat !== "All" && <span className="mono normal-case" style={{ color: theme.textFaint }}>· {activeCat}</span>}
            </span>
						<ChevronDown size={13} style={{ color: theme.textFaint, transform: locationOpen ? "none" : "rotate(-90deg)", transition: "transform 0.15s" }} />
					</div>

					{locationOpen && (
						<div className="mt-2">
							<ChipPicker
								kind="location" entities={categories} selected={activeCat === "All" ? null : activeCat} multi={false}
								onSelect={(name) => setActiveCat(name || "All")} onCreate={createCategory} theme={theme} dark={dark}
								leadingAll={{ label: "All items", count: items.length, active: activeCat === "All", onClick: () => setActiveCat("All") }}
								countFor={(name) => catCounts[name] || 0}
							/>
						</div>
					)}

					{/* Store & Type - collapsible, so the sidebar stays short when not in use */}
					<FacetSection title="Store" kind="store" Icon={StoreIcon} entities={stores} active={activeStore} onSelect={setActiveStore} onCreate={createStore} theme={theme} dark={dark} />
					<FacetSection title="Type" kind="type" Icon={UtensilsCrossed} entities={types} active={activeType} onSelect={setActiveType} onCreate={createType} theme={theme} dark={dark} />

					{anyFilterActive && (
						<button onClick={clearAllFilters} className="mt-5 text-xs underline" style={{ color: theme.textFaint }}>
							Clear all filters
						</button>
					)}
				</aside>

				{/* Main */}
				<main>
					<div className="flex items-center gap-3 mb-4 flex-wrap">
						<div className="flex items-center gap-2 px-3 py-2 rounded-md flex-1 min-w-[180px]" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
							<Search size={15} style={{ color: theme.textMuted }} />
							<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search items…" className="text-sm outline-none flex-1 bg-transparent" style={{ color: theme.text }} />
						</div>
						<button
							onClick={() => { setForm((f) => (showForm ? f : { ...f, threshold: defaultThreshold })); setShowForm((s) => !s); }}
							className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5"
							style={{ background: theme.primaryBg, color: theme.primaryText }}
						>
							<Plus size={15} /> Add item
						</button>
					</div>

					{activeStore && (
						<div className="mb-4 flex items-center justify-between gap-2 px-3 py-2 rounded-md" style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}>
							<span className="text-xs" style={{ color: theme.textMuted }}>Filtering by <strong style={{ color: theme.text }}>{activeStore}</strong></span>
							<button
								onClick={() => { setShoppingStoreChoice(activeStore); setShoppingListOpen(true); }}
								className="text-xs px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1.5 shrink-0"
								style={{ background: theme.primaryBg, color: theme.primaryText }}
							>
								<ShoppingCart size={12} /> Shopping list
							</button>
						</div>
					)}

					{showForm && (
						<div className="mb-5 p-4 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
							<input
								placeholder="Item name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
								className="sm:col-span-2 px-3 py-2 rounded border text-sm outline-none"
								style={{ ...inputStyle, borderColor: formError ? "#C77" : theme.borderStrong }}
							/>
							{formError && <p className="sm:col-span-2 text-xs -mt-2" style={{ color: STATUS_INK.low }}>{formError}</p>}

							<label className="text-sm flex flex-col gap-1">
								<span className="mono text-xs" style={labelStyle}>Quantity on hand</span>
								<input type="number" min="0" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} className="px-3 py-2 rounded border text-sm outline-none" style={inputStyle} />
							</label>
							<label className="text-sm flex flex-col gap-1">
								<span className="mono text-xs" style={labelStyle}>Location</span>
								<ChipPicker
									kind="location" entities={categories} selected={form.category} multi={false}
									onSelect={(name) => setForm((f) => ({ ...f, category: name || "" }))} onCreate={createCategory} theme={theme} dark={dark}
								/>
							</label>

							<label className="text-sm flex flex-col gap-1 sm:col-span-2">
								<span className="mono text-xs" style={labelStyle}>Type</span>
								<ChipPicker
									kind="type" entities={types} selected={form.types} multi
									onToggle={(t) => setForm((f) => ({ ...f, types: f.types.includes(t) ? f.types.filter((x) => x !== t) : [...f.types, t] }))}
									onCreate={createType} theme={theme} dark={dark}
								/>
							</label>

							<label className="text-sm flex flex-col gap-1 sm:col-span-2">
								<span className="mono text-xs" style={labelStyle}>Store</span>
								<ChipPicker
									kind="store" entities={stores} selected={form.stores} multi
									onToggle={(t) => setForm((f) => ({ ...f, stores: f.stores.includes(t) ? f.stores.filter((x) => x !== t) : [...f.stores, t] }))}
									onCreate={createStore} theme={theme} dark={dark}
								/>
							</label>

							<label className="text-sm flex flex-col gap-1">
								<span className="mono text-xs" style={labelStyle}>Low-stock threshold</span>
								<input type="number" min="0" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} className="px-3 py-2 rounded border text-sm outline-none" style={inputStyle} />
							</label>
							<div />

							<textarea
								placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
								className="sm:col-span-2 px-3 py-2 rounded border text-sm outline-none resize-none" rows={2} style={inputStyle}
							/>
							<div className="sm:col-span-2 flex gap-2 justify-end">
								<button type="button" onClick={() => { setShowForm(false); setFormError(""); }} className="px-3 py-2 rounded text-sm" style={{ color: theme.textMuted }}>Cancel</button>
								<button type="button" onClick={handleAddItem} className="px-4 py-2 rounded text-sm font-medium" style={{ background: theme.inkBg, color: theme.inkText }}>Save item</button>
							</div>
						</div>
					)}

					<div className="flex items-center justify-between mb-2">
						<p className="mono text-xs" style={{ color: theme.textFaint }}>
							Showing {Math.min(visibleCount, filtered.length)} of {filtered.length}
						</p>
						<div className="relative">
							<button
								onClick={() => setSortMenuOpen((v) => !v)}
								className="w-7 h-7 rounded-md flex items-center justify-center"
								style={{ background: sortMenuOpen || sortBy !== "default" ? theme.inkBg : theme.neutralChipBg, color: sortMenuOpen || sortBy !== "default" ? theme.inkText : theme.neutralChipText }}
								aria-label="Sort items"
							>
								<ArrowUpDown size={13} />
							</button>
							{sortMenuOpen && (
								<>
									<div className="fixed inset-0 z-10" onClick={() => setSortMenuOpen(false)} />
									<div className="absolute right-0 mt-1 w-44 rounded-md overflow-hidden z-20" style={{ background: theme.surface, border: `1px solid ${theme.border}`, boxShadow: "0 4px 16px -4px rgba(0,0,0,0.2)" }}>
										{[
											{ key: "default", label: "Newest first" },
											{ key: "name-asc", label: "Name (A–Z)" },
											{ key: "name-desc", label: "Name (Z–A)" },
											{ key: "qty-asc", label: "Quantity (low–high)" },
											{ key: "qty-desc", label: "Quantity (high–low)" },
										].map((opt) => (
											<button
												key={opt.key}
												onClick={() => { setSortBy(opt.key); setSortMenuOpen(false); }}
												className="w-full text-left px-3 py-2 text-xs"
												style={{ background: sortBy === opt.key ? theme.neutralChipBg : "transparent", color: theme.text }}
											>
												{opt.label}
											</button>
										))}
									</div>
								</>
							)}
						</div>
					</div>

					<div className="flex flex-col gap-3">
						{filtered.length === 0 && <p className="text-sm py-8 text-center" style={{ color: theme.textMuted }}>Nothing here yet.</p>}
						{visibleItems.map((it) => {
							const c = colorFor(it.category, categories, dark);
							const s = statusFor(it.qty, it.threshold, dark);
							const catObj = categories.find((cc) => cc.name === it.category);
							const Icon = iconFor(catObj ? catObj.icon : "box");
							const isEditing = editingId === it.id;
							return (
								<div
									key={it.id}
									className="rounded-xl overflow-hidden transition-shadow"
									style={{ background: theme.surface, border: `1px solid ${it.open ? c.ink : c.ring}`, boxShadow: it.open ? `0 2px 10px -4px ${c.ring}` : "none" }}
								>
									<button onClick={() => toggleOpen(it.id)} className="w-full text-left px-4 pt-3.5 pb-3 flex items-start gap-3">
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<p className="disp text-base sm:text-lg font-semibold leading-snug break-words flex-1 min-w-0" style={{ color: theme.textStrong }}>{it.name}</p>
												<span className="mono text-xs px-1.5 py-0.5 rounded-full shrink-0" style={{ background: s.bg, color: s.ink }}>{s.label}</span>
												<ChevronDown size={16} className="shrink-0 transition-transform" style={{ color: theme.textFaint, transform: it.open ? "rotate(180deg)" : "none" }} />
											</div>
											<div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        <span title={it.category} className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: c.bg, color: c.ink }}>
                          <Icon size={13} />
                        </span>
												{it.types.map((t) => {
													const tc = entityColorFor(t, types, dark);
													const tObj = types.find((x) => x.name === t);
													const TIcon = typeIconFor(tObj ? tObj.icon : undefined);
													return (
														<span key={t} title={t} className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: tc.bg, color: tc.ink }}>
                              <TIcon size={13} />
                            </span>
													);
												})}
												{it.stores.map((st) => {
													const sc = entityColorFor(st, stores, dark);
													return (
														<span key={st} className="text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1 border" style={{ borderColor: sc.ring, color: sc.ink, background: "transparent" }}>
                              <StoreIcon size={9} />{st}
                            </span>
													);
												})}
											</div>
										</div>
									</button>

									<div className="flex items-center gap-2 px-4 pb-3.5" onClick={(e) => e.stopPropagation()}>
										<button onClick={() => adjustQty(it.id, -1)} className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: theme.neutralChipBg, color: theme.text }} aria-label={`Decrease ${it.name}`}>
											<Minus size={14} />
										</button>
										<span className="mono text-base w-7 text-center font-semibold">{it.qty}</span>
										<button onClick={() => adjustQty(it.id, 1)} className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: theme.neutralChipBg, color: theme.text }} aria-label={`Increase ${it.name}`}>
											<Plus size={14} />
										</button>
										<span className="mono text-xs" style={{ color: theme.textFaint }}>low at {it.threshold}</span>
									</div>

									{it.open && !isEditing && (
										<div className="px-4 py-3 text-sm" style={{ background: theme.surfaceAlt, borderTop: `1px solid ${c.ring}`, color: theme.text }} onClick={(e) => e.stopPropagation()}>
											<p className="mono text-xs uppercase tracking-widest mb-1" style={{ color: theme.textFaint }}>Notes</p>
											<div className="flex items-start justify-between gap-3">
												<p className="flex-1 min-w-0">{it.notes ? it.notes : <span style={{ color: theme.textFaint }}>No notes yet.</span>}</p>
												<div className="flex flex-col items-end gap-2.5 shrink-0">
													<button onClick={() => startEdit(it)} className="flex items-center gap-1 text-xs px-2 py-1 rounded-md" style={{ color: c.ink, background: c.bg }}>
														<Pencil size={12} /> Edit
													</button>
													<button
														onClick={() => removeItem(it.id)}
														className="text-xs px-0.5"
														style={{ color: theme.dangerText, textDecoration: "underline", textDecorationThickness: "2px", textUnderlineOffset: "3px" }}
													>
														Remove
													</button>
												</div>
											</div>
										</div>
									)}

									{it.open && isEditing && (
										<div className="px-4 py-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ background: theme.surfaceAlt, borderTop: `1px solid ${c.ink}` }} onClick={(e) => e.stopPropagation()}>
											<input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="sm:col-span-2 px-3 py-2 rounded border text-sm outline-none" style={inputStyle} />
											<label className="text-sm flex flex-col gap-1">
												<span className="mono text-xs" style={labelStyle}>Quantity</span>
												<input type="number" min="0" value={editForm.qty} onChange={(e) => setEditForm({ ...editForm, qty: e.target.value })} className="px-3 py-2 rounded border text-sm outline-none" style={inputStyle} />
											</label>
											<label className="text-sm flex flex-col gap-1">
												<span className="mono text-xs" style={labelStyle}>Location</span>
												<ChipPicker
													kind="location" entities={categories} selected={editForm.category} multi={false}
													onSelect={(name) => setEditForm((f) => ({ ...f, category: name || f.category }))} onCreate={createCategory} theme={theme} dark={dark}
												/>
											</label>

											<label className="text-sm flex flex-col gap-1 sm:col-span-2">
												<span className="mono text-xs" style={labelStyle}>Type</span>
												<ChipPicker
													kind="type" entities={types} selected={editForm.types} multi
													onToggle={(t) => setEditForm((f) => ({ ...f, types: f.types.includes(t) ? f.types.filter((x) => x !== t) : [...f.types, t] }))}
													onCreate={createType} theme={theme} dark={dark}
												/>
											</label>

											<label className="text-sm flex flex-col gap-1 sm:col-span-2">
												<span className="mono text-xs" style={labelStyle}>Store</span>
												<ChipPicker
													kind="store" entities={stores} selected={editForm.stores} multi
													onToggle={(t) => setEditForm((f) => ({ ...f, stores: f.stores.includes(t) ? f.stores.filter((x) => x !== t) : [...f.stores, t] }))}
													onCreate={createStore} theme={theme} dark={dark}
												/>
											</label>

											<label className="text-sm flex flex-col gap-1">
												<span className="mono text-xs" style={labelStyle}>Low-stock threshold</span>
												<input type="number" min="0" value={editForm.threshold} onChange={(e) => setEditForm({ ...editForm, threshold: e.target.value })} className="px-3 py-2 rounded border text-sm outline-none" style={inputStyle} />
											</label>
											<div />

											<textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Notes (optional)" rows={2} className="sm:col-span-2 px-3 py-2 rounded border text-sm outline-none resize-none" style={inputStyle} />

											<div className="sm:col-span-2 flex gap-2 justify-end">
												<button onClick={cancelEdit} className="px-3 py-2 rounded text-sm" style={{ color: theme.textMuted }}>Cancel</button>
												<button onClick={() => saveEdit(it.id)} className="px-4 py-2 rounded text-sm font-medium flex items-center gap-1.5" style={{ background: theme.inkBg, color: theme.inkText }}>
													<Check size={14} /> Save changes
												</button>
											</div>
										</div>
									)}
								</div>
							);
						})}

						{visibleCount < filtered.length && (
							<div ref={sentinelRef} className="py-4 text-center">
								<span className="mono text-xs" style={{ color: theme.textFaint }}>Loading more…</span>
							</div>
						)}
					</div>
				</main>
			</div>

			{/* Undo toast */}
			{pendingRemoval && (
				<div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-full" style={{ background: theme.inkBg, color: theme.inkText, boxShadow: "0 6px 20px -4px rgba(0,0,0,0.3)" }}>
					<span className="text-sm">Removed "{pendingRemoval.name}"</span>
					<button onClick={undoRemove} className="text-sm font-semibold underline">Undo</button>
				</div>
			)}

			{/* Settings drawer */}
			{settingsOpen && <div className="fixed inset-0 z-30" style={{ background: "rgba(0,0,0,0.35)" }} onClick={() => setSettingsOpen(false)} />}
			<div
				className="fixed top-0 right-0 h-full w-80 max-w-[90vw] z-40 overflow-y-auto transition-transform duration-200"
				style={{ background: theme.surface, borderLeft: `1px solid ${theme.border}`, transform: settingsOpen ? "translateX(0)" : "translateX(100%)" }}
			>
				<div className="p-5">
					<div className="flex items-center justify-between mb-5">
						<h2 className="disp text-lg font-semibold" style={{ color: theme.textStrong }}>Settings</h2>
						<button onClick={() => setSettingsOpen(false)} aria-label="Close settings" style={{ color: theme.textMuted }}>
							<X size={18} />
						</button>
					</div>

					<div className="mb-6">
						<p className="mono text-xs uppercase tracking-widest mb-2" style={{ color: theme.textMuted }}>Appearance</p>
						<div className="flex gap-1.5">
							{[{ key: "system", label: "Auto" }, { key: "light", label: "Light" }, { key: "dark", label: "Dark" }].map((opt) => (
								<button
									key={opt.key}
									onClick={() => setThemeOverride(opt.key)}
									className="flex-1 px-2 py-1.5 rounded-md text-xs font-medium"
									style={{ background: themeOverride === opt.key ? theme.inkBg : theme.neutralChipBg, color: themeOverride === opt.key ? theme.inkText : theme.neutralChipText }}
								>
									{opt.label}
								</button>
							))}
						</div>
					</div>

					<div className="mb-6">
						<p className="mono text-xs uppercase tracking-widest mb-2" style={{ color: theme.textMuted }}>Default low-stock threshold</p>
						<input
							type="number" min="0" value={defaultThreshold}
							onChange={(e) => setDefaultThreshold(Number(e.target.value) || 0)}
							className="w-24 px-3 py-1.5 rounded border text-sm outline-none"
							style={inputStyle}
						/>
						<p className="text-xs mt-1" style={{ color: theme.textFaint }}>Applied to new items by default.</p>
					</div>

					<div className="mb-6">
						<p className="mono text-xs uppercase tracking-widest mb-2" style={{ color: theme.textMuted }}>Shopping list</p>
						<div className="flex flex-wrap gap-1.5 mb-2">
							{stores.map((s) => {
								const tc = entityColorFor(s.name, stores, dark);
								const active = shoppingStoreChoice === s.name;
								return (
									<button
										key={s.name}
										onClick={() => setShoppingStoreChoice(s.name)}
										className="px-2.5 py-1 rounded-full text-xs font-medium"
										style={chipStyle(tc, active, dark, "ring")}
									>
										{s.name}
									</button>
								);
							})}
						</div>
						<button
							disabled={!shoppingStoreChoice}
							onClick={() => { setShoppingListOpen(true); setSettingsOpen(false); }}
							className="text-xs px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5"
							style={{ background: theme.primaryBg, color: theme.primaryText, opacity: shoppingStoreChoice ? 1 : 0.5 }}
						>
							<ShoppingCart size={12} /> View list
						</button>
					</div>

					<div className="h-px my-5" style={{ background: theme.border }} />

					<p className="text-xs mb-4" style={{ color: theme.textFaint }}>
						Rename, recolor, or delete taxonomy terms. Deleting doesn't remove items — they'll just lose that tag.
					</p>

					<div className="flex flex-col gap-6">
						<TaxonomyManager title="Locations" entities={categories} onRename={renameCategory} onDelete={deleteCategory} onRecolor={recolorCategory} theme={theme} />
						<TaxonomyManager title="Stores" entities={stores} onRename={renameStore} onDelete={deleteStore} onRecolor={recolorStore} theme={theme} />
						<TaxonomyManager title="Types" entities={types} onRename={renameType} onDelete={deleteType} onRecolor={recolorType} theme={theme} />
					</div>
				</div>
			</div>

			{/* Shopping list modal */}
			{shoppingListOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setShoppingListOpen(false)}>
					<div
						className="w-full max-w-sm max-h-[80vh] overflow-y-auto rounded-xl p-5"
						style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between mb-4">
							<div>
								<p className="mono text-xs uppercase tracking-widest" style={{ color: theme.textMuted }}>Shopping list</p>
								<h2 className="disp text-lg font-semibold" style={{ color: theme.textStrong }}>{shoppingStoreChoice}</h2>
							</div>
							<button onClick={() => setShoppingListOpen(false)} aria-label="Close" style={{ color: theme.textMuted }}>
								<X size={18} />
							</button>
						</div>

						{shoppingItems.length === 0 ? (
							<p className="text-sm py-6 text-center" style={{ color: theme.textMuted }}>
								You're fully stocked at {shoppingStoreChoice}!
							</p>
						) : (
							<div className="flex flex-col gap-2">
								{shoppingItems.map((it) => {
									const s = statusFor(it.qty, it.threshold, dark);
									return (
										<div key={it.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-md" style={{ background: theme.surfaceAlt }}>
											<span className="text-sm" style={{ color: theme.text }}>{it.name}</span>
											<span className="mono text-xs px-1.5 py-0.5 rounded-full shrink-0" style={{ background: s.bg, color: s.ink }}>{s.label}</span>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
