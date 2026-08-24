import { ArrowUpDown } from 'lucide-preact';

import type { Theme } from '../lib/theme';

export type SortKey = 'default' | 'name-asc' | 'name-desc' | 'qty-asc' | 'qty-desc';

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
	{ key: 'default', label: 'Newest first' },
	{ key: 'name-asc', label: 'Name (A–Z)' },
	{ key: 'name-desc', label: 'Name (Z–A)' },
	{ key: 'qty-asc', label: 'Quantity (low–high)' },
	{ key: 'qty-desc', label: 'Quantity (high–low)' },
];

type Props = {
	open: boolean;
	setOpen: (open: boolean) => void;
	sortBy: SortKey;
	setSortBy: (key: SortKey) => void;
	theme: Theme;
};

export function SortMenu({ open, setOpen, sortBy, setSortBy, theme }: Props) {
	const highlighted = open || sortBy !== 'default';

	return (
		<div class="relative">
			<button
				onClick={() => setOpen(! open)}
				class="w-7 h-7 rounded-md flex items-center justify-center"
				style={{
					background: highlighted ? theme.inkBg : theme.neutralChipBg,
					color: highlighted ? theme.inkText : theme.neutralChipText,
				}}
				aria-label="Sort items"
				aria-expanded={open}
			>
				<ArrowUpDown size={13} />
			</button>

			{open && (
				<>
					{/* Click-away backdrop. */}
					<div class="fixed inset-0 z-10" onClick={() => setOpen(false)} />
					<div
						class="absolute right-0 mt-1 w-44 rounded-md overflow-hidden z-20"
						style={{ background: theme.surface, border: `1px solid ${theme.border}`, boxShadow: '0 4px 16px -4px rgba(0,0,0,0.2)' }}
					>
						{SORT_OPTIONS.map((opt) => (
							<button
								key={opt.key}
								onClick={() => { setSortBy(opt.key); setOpen(false); }}
								class="w-full text-left px-3 py-2 text-xs"
								style={{ background: sortBy === opt.key ? theme.neutralChipBg : 'transparent', color: theme.text }}
							>
								{opt.label}
							</button>
						))}
					</div>
				</>
			)}
		</div>
	);
}
