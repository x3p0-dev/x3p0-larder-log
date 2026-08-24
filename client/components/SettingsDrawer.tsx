import { X, ShoppingCart, LogOut } from 'lucide-preact';

import { TaxonomyManager } from './TaxonomyManager';
import type { Theme } from '../lib/theme';
import { chipStyle, entityColorFor } from '../lib/theme';
import type { TaxonomyActionSet } from '../lib/actions';
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
	defaultThreshold: string;
	setDefaultThreshold: (value: string) => void;
	categories: Term[];
	types: Term[];
	stores: Term[];
	taxonomyActions: TaxonomyActionSet;
	shoppingStore: string | null;
	setShoppingStore: (name: string | null) => void;
	onViewShoppingList: () => void;
	onResetSampleData: () => void;
	accountName: string;
	accountEmail: string;
	onSignOut: () => void;
	dark: boolean;
	theme: Theme;
};

export function SettingsDrawer({
	open, onClose,
	themeOverride, setThemeOverride,
	defaultThreshold, setDefaultThreshold,
	categories, types, stores, taxonomyActions,
	shoppingStore, setShoppingStore, onViewShoppingList,
	onResetSampleData,
	accountName, accountEmail, onSignOut,
	dark, theme,
}: Props) {
	const inputStyle = { borderColor: theme.borderStrong, background: theme.surface, color: theme.text };

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
								const tc = entityColorFor(s.name, stores, dark);
								return (
									<button
										key={s.name}
										onClick={() => setShoppingStore(s.name)}
										aria-pressed={shoppingStore === s.name}
										class="px-2.5 py-1 rounded-full text-xs font-medium"
										style={chipStyle(tc, shoppingStore === s.name, theme, 'ring')}
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

					<p class="text-xs mb-4" style={{ color: theme.textFaint }}>
						Rename, recolor, or delete taxonomy terms. Deleting doesn&rsquo;t remove items &mdash; they&rsquo;ll just lose that tag.
					</p>

					<div class="flex flex-col gap-6">
						<TaxonomyManager
							title="Locations" entities={categories} theme={theme}
							onRename={taxonomyActions.renameCategory}
							onDelete={taxonomyActions.deleteCategory}
							onRecolor={taxonomyActions.recolorCategory}
						/>
						<TaxonomyManager
							title="Stores" entities={stores} theme={theme}
							onRename={taxonomyActions.renameStore}
							onDelete={taxonomyActions.deleteStore}
							onRecolor={taxonomyActions.recolorStore}
						/>
						<TaxonomyManager
							title="Types" entities={types} theme={theme}
							onRename={taxonomyActions.renameType}
							onDelete={taxonomyActions.deleteType}
							onRecolor={taxonomyActions.recolorType}
						/>
					</div>

					<div class="h-px my-5" style={{ background: theme.border }} />

					<button onClick={onResetSampleData} class="text-xs underline" style={{ color: theme.textFaint }}>
						Reset to sample data
					</button>
				</div>
			</div>
		</>
	);
}
