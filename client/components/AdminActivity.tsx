import { useEffect, useState } from 'preact/hooks';
import { ChevronDown, ChevronLeft, ChevronRight, Download } from 'lucide-preact';

import { AdminLoading } from './AdminLoading';
import { DrawerAvatar } from './DrawerAvatar';
import { EmptyState } from './EmptyState';
import { HouseholdTile } from './HouseholdTile';
import { useAdminActivity, useAdminActivityExport } from '../hooks/useAdminData';
import type { Theme } from '../lib/theme';
import {
	ADMIN_ROW, PAGE_BUTTON_OUTLINE, PAGE_BUTTON_OUTLINE_ON, PAGE_MENU, PAGE_MENU_ROW,
} from '../lib/controlStyles';
import { useDismiss } from '../hooks/useDismiss';
import { activityCsv, exportFilename } from '../lib/activityCsv';
import { downloadCsv } from '../lib/download';
import {
	actionPhrase, actionTitle, decodeHeld, heldPhrase, isDestructive, toActorKind,
} from '../../shared/activity';
import { monthLabel, usDateFrom } from '../../shared/admin';
import type { AdminActivityRow } from '../../shared/types';

/**
 * Board 9 — the audit log.
 *
 * **This is the one place in Larder Log where an observed timestamp is the
 * point.** The item sheet deliberately shows no timestamps anywhere — nothing
 * in the app says when an item was added, changed or last counted. That rule is
 * about items. A log whose rows cannot be placed in time is not a log.
 *
 * **Nothing a household does to its own pantry is here**, and that is the line
 * this screen shares with the household page: adding an item is not
 * administration, and a console that logged it would be the surveillance the
 * refusal card promises it is not.
 *
 * **It is deliberately not drawn at 390.** A log row is a time, a person, an
 * action and a target, and three of those are long. It may simply not belong on
 * a phone — a thing to decide, not a layout to shrink into. It stacks here
 * rather than truncating, which is the least-wrong version of undecided.
 */
export function AdminActivity({ theme, dark }: { theme: Theme; dark: boolean }) {
	const [offset, setOffset] = useState(0);
	const [openId, setOpenId] = useState('');
	const result = useAdminActivity(offset);

	if (result.state !== 'ready') {
		/* Denied paints nothing at all: every console query re-checks the
		 * flag server-side, and a screen that explained the refusal would
		 * be the 403 the app decided against showing anybody. */
		return result.state === 'denied' ? null : <AdminLoading theme={theme} />;
	}

	const { rows, total, pageSize, retentionMonths } = result.data;
	const to = Math.min(result.data.offset + pageSize, total);

	if (total === 0) {
		return (
			<EmptyState
				title="Nothing has happened yet"
				body="This log records administration — a household or an account deleted, ownership handed over, a role changed, an invite revoked. Nothing a household does to its own pantry appears here."
				theme={theme}
			/>
		);
	}

	return (
		<div class="flex flex-col gap-[18px]">
			<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
				<span class="text-[13.5px] tabular-nums" style={{ color: theme.textMuted }}>
					Showing {(result.data.offset + 1).toLocaleString()}–{to.toLocaleString()} of{' '}
					{total.toLocaleString()}
				</span>
				{/*
				  * Retention is stated and **not settable here**, which is a
				  * deliberate narrowing of the design. An administrator who can
				  * shorten retention can erase the record of what administrators
				  * did — the same failure as a console that could mint
				  * administrators, and it gets the same answer: the knob is set out
				  * of band, beside `LARDER_ADMIN_IDS`, and this reports it.
				  *
				  * It is now true rather than aspirational: the log prunes itself
				  * on every append.
				  */}
				<span class="ml-auto text-[13px]" style={{ color: theme.textFaint }}>
					{retentionMonths === 0
						? 'Kept until the next entry'
						: `Kept ${retentionMonths} ${retentionMonths === 1 ? 'month' : 'months'}`}
				</span>

				<ExportMenu theme={theme} />
			</div>

			<div
				class="rounded-[20px] overflow-hidden"
				style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
			>
				{rows.map((row, i) => (
					<Entry
						key={row.id}
						row={row}
						first={i === 0}
						open={openId === row.id}
						onToggle={() => setOpenId(openId === row.id ? '' : row.id)}
						theme={theme}
						dark={dark}
					/>
				))}
			</div>

			{total > pageSize && (
				<div class="flex items-center gap-2.5">
					<Pager
						label="Newer"
						disabled={result.data.offset === 0}
						onClick={() => { setOpenId(''); setOffset(Math.max(0, result.data.offset - pageSize)); }}
					>
						<ChevronLeft size={15} />
					</Pager>
					<Pager
						label="Older"
						trailing
						disabled={to >= total}
						onClick={() => { setOpenId(''); setOffset(result.data.offset + pageSize); }}
					>
						<ChevronRight size={15} />
					</Pager>
					<span class="text-[13px] tabular-nums" style={{ color: theme.textMuted }}>
						Page {Math.floor(result.data.offset / pageSize) + 1} of {Math.ceil(total / pageSize)}
					</span>
				</div>
			)}
		</div>
	);
}

/**
 * Export — a range, never everything.
 *
 * **A button that hands over all 2,904 rows invites the habit of handing over
 * all of them**, so the menu offers ranges and no *everything* row. The default
 * is the month on screen, which is the design's own default and the only one
 * that needs no thought.
 *
 * The download is armed in two steps because a live query cannot be *called*:
 * choosing a range opens a subscription, and an effect fires the download when
 * the rows land. `armed` is what stops that effect from firing again on every
 * refresh of a subscription that is still open.
 */
function ExportMenu({ theme }: { theme: Theme }) {
	const [open, setOpen] = useState(false);
	const [range, setRange] = useState<{ from: string; to: string } | null>(null);
	const [armed, setArmed] = useState(false);
	const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));

	const result = useAdminActivityExport(range?.from ?? '', range?.to ?? '');

	useEffect(() => {
		if (! armed || result.state !== 'ready' || ! range) return;

		setArmed(false);

		if (result.data.rows.length === 0) return;

		downloadCsv(
			exportFilename(result.data.from, result.data.to),
			activityCsv(result.data.rows)
		);
	}, [armed, result.state, range]);

	const options = monthOptions();

	return (
		<div class="relative" ref={ref}>
			<button
				onClick={() => setOpen((v) => ! v)}
				aria-haspopup="menu"
				aria-expanded={open}
				/* Open is a state, and this trigger had none — an
				  * `aria-expanded` that a screen reader could hear and nobody
				  * could see. It borrows the sort trigger's open fill, which is
				  * the same move: a quiet control on the page ground holding a
				  * menu below it. */
				class={`flex items-center gap-1.5 h-11 md:h-[34px] px-3 rounded-[10px] text-[13.5px] font-semibold ${open ? PAGE_BUTTON_OUTLINE_ON : PAGE_BUTTON_OUTLINE}`}
			>
				<Download size={14} /> Export
			</button>

			{open && (
				<div
					role="menu"
					class={`${PAGE_MENU} right-0 top-full mt-1.5 w-[220px]`}
					style={{ boxShadow: theme.liftShadow }}
				>
					{options.map((o) => (
						<button
							key={o.label}
							role="menuitem"
							onClick={() => {
								setRange({ from: o.from, to: o.to });
								setArmed(true);
								setOpen(false);
							}}
							class={PAGE_MENU_ROW}
							style={{ color: theme.text }}
						>
							{o.label}
						</button>
					))}
				</div>
			)}

			{/*
			  * **A truncated audit export that looks complete is worse than no
			  * export**, so the cap is announced rather than inferred from the row
			  * count — which nobody could check without knowing the limit.
			  */}
			{result.state === 'ready' && result.data.capped && (
				<p
					role="status"
					class="absolute right-0 top-full mt-1.5 w-[260px] m-0 p-2.5 rounded-[10px] text-[12.5px] leading-[1.45] z-30"
					style={{ background: theme.surface, border: `1px solid ${theme.border}`, color: theme.textMuted }}
				>
					That range held more than {result.data.limit.toLocaleString()} rows. The file has
					the newest {result.data.limit.toLocaleString()} — narrow the range for the rest.
				</p>
			)}
		</div>
	);
}

/**
 * The ranges on offer: this month, each of the last five, and the year.
 *
 * Bounds are `[from, to)` so consecutive months compose — the next month's
 * `from` is this month's `to`, and no row is counted twice or missed.
 */
function monthOptions(): { label: string; from: string; to: string }[] {
	const now = new Date();
	const y = now.getUTCFullYear();
	const m = now.getUTCMonth();
	const iso = (year: number, month: number) => new Date(Date.UTC(year, month, 1)).toISOString();
	const out: { label: string; from: string; to: string }[] = [];

	for (let back = 0; back < 6; back++) {
		const total = y * 12 + m - back;
		const yy = Math.floor(total / 12);
		const mm = ((total % 12) + 12) % 12;

		out.push({
			// `monthLabel` takes a `YYYY-MM` key, which is also the key the chart
			// and the log's own buckets use — one month vocabulary, not two.
			label: back === 0 ? 'This month' : monthLabel(`${yy}-${String(mm + 1).padStart(2, '0')}`, true),
			from: iso(yy, mm),
			to: iso(yy, mm + 1),
		});
	}

	out.push({ label: `All of ${y}`, from: iso(y, 0), to: iso(y + 1, 0) });

	return out;
}

/**
 * One row, and the record behind it.
 *
 * The row is **a time, a person, an action and a target**. Opening it shows the
 * full record: the exact time to the second with a zone, the actor with their
 * account id, the action, and the target with its id and what it held.
 *
 * The whole row is the toggle, which is the item card's rule and the shopping
 * list's — a chevron on the end would be a second hit area inside a control
 * that is already one.
 */
function Entry({
	row, first, open, onToggle, theme, dark,
}: {
	row: AdminActivityRow;
	first: boolean;
	open: boolean;
	onToggle: () => void;
	theme: Theme;
	dark: boolean;
}) {
	const kind = toActorKind(row.actorKind);
	const held = decodeHeld(row.held);
	const phrase = actionPhrase(row.action, row.targetName, row.fromValue, row.toValue);

	return (
		<div style={first ? undefined : { borderTop: `1px solid ${theme.divider}` }}>
			<button
				onClick={onToggle}
				aria-expanded={open}
				class={`flex items-center gap-3 w-full text-left px-5 py-3.5 ${ADMIN_ROW}`}
			>
				{/*
				  * An actor that is not a person gets a **blank disc**, never a
				  * face and never an initial, so a row is never attributed to
				  * somebody who did not do it.
				  */}
				{kind === 'person' ? (
					<DrawerAvatar name={row.actorName} size={32} />
				) : (
					<span
						class="shrink-0 w-8 h-8 rounded-full"
						style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}
					/>
				)}

				<span class="flex-1 min-w-0 flex flex-col gap-px">
					<span class="text-[14.5px] leading-snug" style={{ color: theme.text }}>
						<b
							class={kind === 'person' ? 'font-semibold' : 'font-normal italic'}
							style={{ color: kind === 'person' ? theme.textStrong : theme.textMuted }}
						>
							{kind === 'person'
								? (row.actorName || 'Someone')
								: kind === 'automatic' ? 'Automatic' : 'Out of band'}
						</b>{' '}
						{phrase}
					</span>
					<span class="text-meta" style={{ color: theme.textMuted }}>
						{relative(row.at)}
					</span>
				</span>

				<ChevronDown
					size={16}
					class="shrink-0"
					style={{
						color: theme.textFaint,
						transform: open ? 'rotate(180deg)' : 'none',
						transition: 'transform .15s',
					}}
				/>
			</button>

			{open && (
				<div
					class="px-5 pb-4 pt-1"
					style={{ background: theme.surfaceAlt, borderTop: `1px solid ${theme.divider}` }}
				>
					<div class="pt-3.5 flex flex-col gap-2.5">
						<Field label="Action" theme={theme}>{actionTitle(row.action)}</Field>
						<Field label="When" theme={theme}>{exact(row.at)}</Field>
						<Field label="Who" theme={theme}>
							{kind === 'person'
								? `${row.actorName || 'Someone'}${row.actorId ? ` · ${row.actorId}` : ''}`
								: kind === 'automatic' ? 'Automatic — nobody pressed anything'
								: 'Out of band — set outside this app'}
						</Field>

						{row.targetName && (
							<Field label="Target" theme={theme}>
								<span class="inline-flex items-center gap-2">
									{row.targetKind === 'household' && row.targetInk && (
										<HouseholdTile ink={row.targetInk} name={row.targetName} size={20} dark={dark} />
									)}
									{row.targetName}
									{row.targetId ? ` · ${row.targetId}` : ''}
								</span>
							</Field>
						)}

						{(row.fromValue || row.toValue) && (
							<Field label="Change" theme={theme}>
								{row.fromValue && row.toValue
									? `${row.fromValue} → ${row.toValue}`
									: row.fromValue || row.toValue}
							</Field>
						)}

						{heldPhrase(held) && (
							<Field label="What it held" theme={theme}>{heldPhrase(held)}</Field>
						)}

						{/*
						  * **The card says so on its own face.** A deletion row is
						  * the only surviving record of the thing it describes, so
						  * it has to admit that every field above is its own copy
						  * rather than a link to something real.
						  */}
						{row.targetGone && isDestructive(row.action) && (
							<p
								class="m-0 mt-1 pt-2.5 text-[13px] leading-[1.5]"
								style={{ borderTop: `1px solid ${theme.border}`, color: theme.textMuted }}
							>
								{row.targetKind === 'household'
									? 'This household no longer exists — everything above is the log’s own copy.'
									: 'This account no longer exists — everything above is the log’s own copy.'}
							</p>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

/** One key and its value in an opened entry. The account page's `Row`, denser. */
function Field({
	label, children, theme,
}: {
	label: string;
	children: preact.ComponentChildren;
	theme: Theme;
}) {
	return (
		<div class="flex flex-col sm:flex-row sm:gap-[18px] gap-0.5">
			<span
				class="sm:w-[132px] shrink-0 sm:pt-[3px] text-[10.5px] font-bold uppercase tracking-[0.12em]"
				style={{ color: theme.textMuted }}
			>
				{label}
			</span>
			<span class="flex-1 min-w-0 break-words text-[14px]" style={{ color: theme.textStrong }}>
				{children}
			</span>
		</div>
	);
}

function Pager({
	label, disabled, onClick, trailing, children,
}: {
	label: string;
	disabled: boolean;
	onClick: () => void;
	trailing?: boolean;
	children: preact.ComponentChildren;
}) {
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			/* No inline `color`. `theme.text` is `ink-body` to the byte in both
			  * themes, so the one thing it did was beat the style's own
			  * `hover:text-ink` — the pager had a fill hover and a border hover
			  * and no label hover, which reads as a control that only half
			  * responds. */
			class={`flex items-center gap-[7px] h-11 md:h-[38px] px-3.5 rounded-[11px] text-[13.5px] font-semibold ${PAGE_BUTTON_OUTLINE} disabled:opacity-50 disabled:pointer-events-none`}
		>
			{! trailing && children}
			{label}
			{trailing && children}
		</button>
	);
}

/** `4 minutes ago`, `Yesterday`, `12 Aug 2026`. The row's own reading of time. */
function relative(iso: string): string {
	const t = Date.parse(iso);

	if (! Number.isFinite(t)) return 'at an unknown time';

	const mins = Math.floor((Date.now() - t) / 60000);

	if (mins < 1) return 'Just now';
	if (mins < 60) return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`;

	const hours = Math.floor(mins / 60);

	if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;

	const days = Math.floor(hours / 24);

	if (days === 1) return 'Yesterday';
	if (days < 30) return `${days} days ago`;

	return usDateFrom(t);
}

/**
 * The exact time, **to the second and with a zone**.
 *
 * A log entry whose time is *"3 days ago"* cannot be compared with anything
 * outside this screen, which is most of what somebody opens an entry to do.
 * `UTC` is named rather than converted: every stamp in this app is ISO 8601 UTC
 * and printing a local time without saying so is how two people reading the
 * same incident disagree about when it happened.
 */
function exact(iso: string): string {
	const t = Date.parse(iso);

	if (! Number.isFinite(t)) return 'Unknown';

	const d = new Date(t);
	const pad = (n: number) => String(n).padStart(2, '0');

	return `${usDateFrom(t)}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}
