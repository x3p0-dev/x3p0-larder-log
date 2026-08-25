import { useState } from 'preact/hooks';
import { ChevronDown } from 'lucide-preact';

import { ChipPicker } from './ChipPicker';
import type { IconComponent } from '../lib/icons';
import type { Theme } from '../lib/theme';
import { termNameFor } from '../lib/theme';
import type { Term, TermKind } from '../../shared/types';

type Props = {
	title: string;
	kind: TermKind;
	Icon: IconComponent;
	entities: Term[];
	/** A term **id**, or null for "no filter". */
	active: string | null;
	onSelect: (id: string | null) => void;
	onCreate: (name: string, color?: string, icon?: string) => Promise<string | null>;
	/** `taxonomy:write`, forwarded to the picker's "+" chip. */
	canCreate: boolean;
	theme: Theme;
	dark: boolean;
	defaultOpen?: boolean;
	clearable?: boolean;
	leadingAll?: { label: string; count: number; active: boolean; onClick: () => void };
	countFor?: (id: string) => number;
};

/**
 * Collapsible sidebar wrapper around ChipPicker: adds the header, open/close,
 * and a Clear link. Sidebar filters are always single-select, even for
 * Type/Store where the item fields themselves are multi-select.
 */
export function FacetSection({
	title, kind, Icon, entities, active, onSelect, onCreate, canCreate,
	theme, dark, defaultOpen = false, clearable = true, leadingAll, countFor,
}: Props) {
	const [open, setOpen] = useState(defaultOpen);

	return (
		<div class="mt-5 first:mt-0">
			<div
				class="flex items-center justify-between py-1 gap-2 cursor-pointer"
				onClick={() => setOpen((v) => ! v)}
				role="button"
				tabIndex={0}
				aria-expanded={open}
				onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpen((v) => ! v))}
			>
				<span class="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest min-w-0" style={{ color: theme.textMuted }}>
					<Icon size={12} class="shrink-0" />
					<span class="truncate">{title}</span>
					{/* `active` is a term id — always resolve it to a name before showing it. */}
					{active && (
						<span class="font-mono normal-case shrink-0" style={{ color: theme.textFaint }}>
							· {termNameFor(active, entities)}
						</span>
					)}
				</span>
				<div class="flex items-center gap-2 shrink-0">
					{clearable && active && (
						<button
							onClick={(e) => { e.stopPropagation(); onSelect(null); }}
							class="text-xs underline"
							style={{ color: theme.textFaint }}
						>
							Clear
						</button>
					)}
					<ChevronDown
						size={13}
						style={{ color: theme.textFaint, transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.15s' }}
					/>
				</div>
			</div>

			{open && (
				<div class="mt-2">
					<ChipPicker
						kind={kind} entities={entities} selected={active} multi={false}
						onSelect={onSelect} onCreate={onCreate} canCreate={canCreate} theme={theme} dark={dark}
						leadingAll={leadingAll} countFor={countFor}
					/>
				</div>
			)}
		</div>
	);
}
