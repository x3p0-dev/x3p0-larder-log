import { ArrowUpDown } from 'lucide-react';

export const SORT_OPTIONS = [
	{ key: 'default', label: 'Newest first' },
	{ key: 'name-asc', label: 'Name (A–Z)' },
	{ key: 'name-desc', label: 'Name (Z–A)' },
	{ key: 'qty-asc', label: 'Quantity (low–high)' },
	{ key: 'qty-desc', label: 'Quantity (high–low)' },
];

export function SortMenu({ open, setOpen, sortBy, setSortBy, theme }) {
	const highlighted = open || sortBy !== 'default';

	return (
		<div className="relative">
			<button
				onClick={() => setOpen(! open)}
				className="w-7 h-7 rounded-md flex items-center justify-center"
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
					<div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
					<div
						className="absolute right-0 mt-1 w-44 rounded-md overflow-hidden z-20"
						style={{ background: theme.surface, border: `1px solid ${theme.border}`, boxShadow: '0 4px 16px -4px rgba(0,0,0,0.2)' }}
					>
						{SORT_OPTIONS.map((opt) => (
							<button
								key={opt.key}
								onClick={() => { setSortBy(opt.key); setOpen(false); }}
								className="w-full text-left px-3 py-2 text-xs"
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
