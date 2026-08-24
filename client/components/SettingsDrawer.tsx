import { useEffect, useState } from 'preact/hooks';
import { X, ShoppingCart, LogOut } from 'lucide-preact';

import { TaxonomyManager } from './TaxonomyManager';
import type { Theme } from '../lib/theme';
import { chipStyle, entityColorFor } from '../lib/theme';
import type { TaxonomyActions } from '../lib/actions';
import type { Term, ThemeOverride } from '../../shared/types';

const THEME_OPTIONS: { key: ThemeOverride; label: string }[] = [
	{ key: 'system', label: 'Auto' },
	{ key: 'light', label: 'Light' },
	{ key: 'dark', label: 'Dark' },
];

type Props = {
	open: boolean;
	onClose: () => void;
	themeOverride: ThemeOverride;
	setThemeOverride: (value: ThemeOverride) => void;
	householdName: string;
	setHouseholdName: (value: string) => void;
	defaultThreshold: string;
	setDefaultThreshold: (value: string) => void;
	locations: Term[];
	types: Term[];
	stores: Term[];
	taxonomy: TaxonomyActions;
	/** A store **id**, or null. */
	shoppingStore: string | null;
	setShoppingStore: (id: string | null) => void;
	onViewShoppingList: () => void;
	accountName: string;
	accountEmail: string;
	onSignOut: () => void;
	dark: boolean;
	theme: Theme;
};

export function SettingsDrawer({
	open, onClose,
	themeOverride, setThemeOverride,
	householdName, setHouseholdName,
	defaultThreshold, setDefaultThreshold,
	locations, types, stores, taxonomy,
	shoppingStore, setShoppingStore, onViewShoppingList,
	accountName, accountEmail, onSignOut,
	dark, theme,
}: Props) {
	const inputStyle = { borderColor: theme.borderStrong, background: theme.surface, color: theme.text };

	// Held locally so typing doesn't fire a mutation per keystroke; committed on
	// blur or Enter. Re-syncs when the server value changes, which with live
	// queries can happen because someone else renamed it.
	const [nameDraft, setNameDraft] = useState(householdName);

	useEffect(() => { setNameDraft(householdName); }, [householdName]);

	function commitName() {
		const trimmed = nameDraft.trim();

		if (trimmed && trimmed !== householdName) setHouseholdName(trimmed);
		else setNameDraft(householdName);
	}

	return (
		<>
			{open && <div class="fixed inset-0 z-30" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={onClose} />}

			<div
				class="fixed top-0 right-0 h-full w-80 max-w-[90vw] z-40 overflow-y-auto transition-transform duration-200"
				style={{
					background: theme.surface,
					borderLeft: `1px solid ${theme.border}`,
					transform: open ? 'translateX(0)' : 'translateX(100%)',
					// Keep the off-screen panel from swallowing clicks or widening the page.
					visibility: open ? 'visible' : 'hidden',
				}}
				aria-hidden={! open}
			>
				<div class="p-5">
					<div class="flex items-center justify-between mb-5">
						<h2 class="font-disp text-lg font-semibold" style={{ color: theme.textStrong }}>Settings</h2>
						<button onClick={onClose} aria-label="Close settings" style={{ color: theme.textMuted }}>
							<X size={18} />
						</button>
					</div>

					<div class="mb-6">
						<p class="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: theme.textMuted }}>Account</p>
						<p class="text-sm" style={{ color: theme.text }}>{accountName}</p>
						{accountEmail && <p class="text-xs mb-2" style={{ color: theme.textFaint }}>{accountEmail}</p>}
						<button
							onClick={onSignOut}
							class="mt-1 text-xs px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5"
							style={{ background: theme.neutralChipBg, color: theme.neutralChipText }}
						>
							<LogOut size={12} /> Sign out
						</button>
					</div>

					<div class="mb-6">
						<p class="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: theme.textMuted }}>Household</p>
						<input
							value={nameDraft}
							onInput={(e) => setNameDraft(e.currentTarget.value)}
							onBlur={commitName}
							onKeyDown={(e) => { if (e.key === 'Enter') { commitName(); e.currentTarget.blur(); } }}
							aria-label="Household name"
							class="w-full px-3 py-1.5 rounded border text-sm outline-none"
							style={inputStyle}
						/>
						<p class="text-xs mt-1" style={{ color: theme.textFaint }}>
							Only an owner can rename the household.
						</p>
					</div>

					<div class="mb-6">
						<p class="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: theme.textMuted }}>Appearance</p>
						<div class="flex gap-1.5">
							{THEME_OPTIONS.map((opt) => (
								<button
									key={opt.key}
									onClick={() => setThemeOverride(opt.key)}
									class="flex-1 px-2 py-1.5 rounded-md text-xs font-medium"
									style={{
										background: themeOverride === opt.key ? theme.inkBg : theme.neutralChipBg,
										color: themeOverride === opt.key ? theme.inkText : theme.neutralChipText,
									}}
								>
									{opt.label}
								</button>
							))}
						</div>
					</div>

					<div class="mb-6">
						<p class="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: theme.textMuted }}>Default low-stock threshold</p>
						<input
							type="number" min="0" value={defaultThreshold}
							onInput={(e) => setDefaultThreshold(e.currentTarget.value)}
							class="w-24 px-3 py-1.5 rounded border text-sm outline-none"
							style={inputStyle}
						/>
						<p class="text-xs mt-1" style={{ color: theme.textFaint }}>Applied to new items by default.</p>
					</div>

					<div class="mb-6">
						<p class="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: theme.textMuted }}>Shopping list</p>
						<div class="flex flex-wrap gap-1.5 mb-2">
							{stores.map((s) => {
								const tc = entityColorFor(s.id, stores, dark);
								return (
									<button
										key={s.id}
										onClick={() => setShoppingStore(s.id)}
										aria-pressed={shoppingStore === s.id}
										class="px-2.5 py-1 rounded-full text-xs font-medium"
										style={chipStyle(tc, shoppingStore === s.id, theme, 'ring')}
									>
										{s.name}
									</button>
								);
							})}
						</div>
						<button
							disabled={! shoppingStore}
							onClick={onViewShoppingList}
							class="text-xs px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5"
							style={{ background: theme.primaryBg, color: theme.primaryText, opacity: shoppingStore ? 1 : 0.5 }}
						>
							<ShoppingCart size={12} /> View list
						</button>
					</div>

					<div class="h-px my-5" style={{ background: theme.border }} />

					{/*
					  * The location sentence is D16: with no nullable fields there
					  * is no "no location" for an item to fall back to, so the
					  * delete is refused rather than silently orphaning rows.
					  */}
					<p class="text-xs mb-4" style={{ color: theme.textFaint }}>
						Rename, recolor, or delete terms. Deleting a type or store just removes that
						tag from your items. A location can only be deleted once nothing is stored there.
					</p>

					<div class="flex flex-col gap-6">
						<TaxonomyManager
							title="Locations" entities={locations} theme={theme}
							onRename={(id, name) => void taxonomy.update('location', id, { name })}
							onDelete={(id) => void taxonomy.remove('location', id)}
							onRecolor={(id, ink) => void taxonomy.update('location', id, { ink })}
						/>
						<TaxonomyManager
							title="Stores" entities={stores} theme={theme}
							onRename={(id, name) => void taxonomy.update('store', id, { name })}
							onDelete={(id) => void taxonomy.remove('store', id)}
							onRecolor={(id, ink) => void taxonomy.update('store', id, { ink })}
						/>
						<TaxonomyManager
							title="Types" entities={types} theme={theme}
							onRename={(id, name) => void taxonomy.update('type', id, { name })}
							onDelete={(id) => void taxonomy.remove('type', id)}
							onRecolor={(id, ink) => void taxonomy.update('type', id, { ink })}
						/>
					</div>
				</div>
			</div>
		</>
	);
}
