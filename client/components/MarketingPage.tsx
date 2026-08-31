import { useState } from 'preact/hooks';
import { LogIn, MapPin, Store, Tag } from 'lucide-preact';

import type { Item, Term } from '../../shared/types';
import { fromInt, toInt } from '../../shared/qty';
import type { Theme } from '../lib/theme';
import { entityColorFor } from '../lib/theme';
import { ItemCard } from './ItemCard';
import { AppTile, BetaBadge, Wordmark } from './Brand';
import { SignInButton } from './OutsideShell';
import { PAGE_BUTTON_PRIMARY } from '../lib/controlStyles';

/**
 * The public page at `/`.
 *
 * **The signed-out surface is two pages, not one.** This is what someone who
 * has never heard of Larder Log gets; every other URL hit while signed out is a
 * bounce and shows the sign-in card instead. Collapsing them would make the
 * front door either a wall for visitors or a sales pitch for someone who only
 * wanted their pantry.
 *
 * One offer, one call to action, repeated three times — nav, hero, close. Same
 * ground, same cards, same tokens as the app: this is an extension of the
 * system, not a separate brand.
 */

/* ---------- the hero mock ---------- */

/*
 * The hero image is the app, and it **works**.
 *
 * Three cards from the sample data — one stocked, one low, one out — rendered
 * by the **real** `ItemCard`, and the steppers are live. A visitor can press
 * minus twice on the low card and watch it turn crimson, which is the entire
 * pitch happening in their own hand rather than being described to them. A
 * screenshot could not do that, and a screenshot could drift from the
 * component besides.
 *
 * **One item from three different food groups**, because a visitor should read
 * the three cards as *a kitchen* rather than as three cuts of meat. Beef from
 * the freezer, fruit from the refrigerator, a grain from the pantry — protein,
 * produce and grain, which is also exactly what the *Type* column of the band
 * below names, in the same colours.
 *
 * The quantities are what a household would actually have. Twelve pounds of
 * ground beef against a floor of four is a bulk buy sitting in a deep freezer;
 * three apples against a floor of six is the bowl running down; oats at zero is
 * the thing you meant to replace last week. Nothing here is a round number
 * chosen to look tidy.
 *
 * The starting states are one press from meaning something: apples are already
 * amber and go crimson in three, oats go amber on the first plus and green on
 * the third. Beef is the control — eight presses from amber, so it reads as
 * genuinely stocked rather than as a card waiting to fall over. All three were
 * checked against `statusKeyFor` rather than eyeballed.
 *
 * Nothing resets. Whatever a visitor does to these three is theirs for the
 * session, and a card that sprang back would undo the one thing this is for.
 *
 * The locations and stores are the **seeded** terms — Pantry, Refrigerator,
 * Freezer; Grocery, Warehouse (D40) — so the hero shows the household a visitor
 * is actually going to land in. The stores are generic for a second reason:
 * Publix and Costco are fine in a spec, but a named chain inside a screenshot
 * on a public page reads as a partnership.
 */
/**
 * A term for the page's mocks.
 *
 * Nothing here is sorted or restored, so the three stamps `Term` carries are
 * dead weight on a literal — this fills them once rather than eight times.
 */
function mockTerm(id: string, name: string, ink: string): Term {
	return { id, name, ink, createdAt: '', addedAt: '', changedAt: '' };
}

const MOCK_LOCATIONS: Term[] = [
	mockTerm('loc-pantry', 'Pantry', 'color-10'),
	mockTerm('loc-fridge', 'Refrigerator', 'color-1'),
	mockTerm('loc-freezer', 'Freezer', 'color-12'),
];

const MOCK_TYPES: Term[] = [
	mockTerm('type-produce', 'Produce', 'color-10'),
	mockTerm('type-protein', 'Protein', 'color-6'),
	mockTerm('type-grain', 'Grain', 'color-8'),
];

const MOCK_STORES: Term[] = [
	mockTerm('store-grocery', 'Grocery', 'color-2'),
	mockTerm('store-warehouse', 'Warehouse', 'color-9'),
];

const MOCK_ITEMS: Item[] = [
	{
		id: 'mock-beef', name: 'Ground Beef', locationId: 'loc-freezer',
		qty: '12', threshold: '4', size: '1', unit: 'pound', offShoppingList: false, listRule: '', seasonFrom: '', seasonTo: '', notes: '',
		typeIds: ['type-protein'], storeIds: ['store-warehouse'], createdAt: '', addedAt: '', changedAt: '',
	},
	{
		id: 'mock-apples', name: 'Apples', locationId: 'loc-fridge',
		// No size, and that is the case worth drawing: loose fruit is counted, not
		// packaged, so the meta line under the name is simply absent.
		qty: '3', threshold: '6', size: '', unit: '', offShoppingList: false, listRule: '', seasonFrom: '', seasonTo: '', notes: '',
		typeIds: ['type-produce'], storeIds: ['store-grocery'], createdAt: '', addedAt: '', changedAt: '',
	},
	{
		id: 'mock-oats', name: 'Rolled Oats', locationId: 'loc-pantry',
		qty: '0', threshold: '2', size: '2', unit: 'pound', offShoppingList: false, listRule: '', seasonFrom: '', seasonTo: '', notes: '',
		typeIds: ['type-grain'], storeIds: ['store-grocery'], createdAt: '', addedAt: '', changedAt: '',
	},
];

/* ---------- the band ---------- */

/**
 * One column of *Three ways to slice it*, with a live chip row under it.
 *
 * Someone deciding whether to sign up needs to understand the data model, and
 * three rows of real chips do that faster than a paragraph about taxonomies.
 */
const SLICES: {
	label: string;
	icon: typeof MapPin;
	body: string;
	terms: Term[];
}[] = [
	{
		label: 'Location',
		icon: MapPin,
		body: 'Where it’s kept. The pantry, the upright freezer, the chest freezer out in the garage.',
		terms: [
			mockTerm('s-pantry', 'Pantry', 'color-10'),
			mockTerm('s-fridge', 'Refrigerator', 'color-1'),
			mockTerm('s-freezer', 'Freezer', 'color-12'),
		],
	},
	{
		label: 'Store',
		icon: Store,
		body: 'Where you buy it. Filter to one and you’re looking at its shopping list.',
		terms: [
			mockTerm('s-grocery', 'Grocery', 'color-2'),
			mockTerm('s-warehouse', 'Warehouse', 'color-9'),
			mockTerm('s-market', 'Market', 'color-14'),
		],
	},
	{
		label: 'Type',
		icon: Tag,
		body: 'What it is. Produce, dairy, baking, spice — however you think about food.',
		/*
		 * Three, like the two columns beside it. Five chips wrapped to a second
		 * line at the narrow widths and made this column look like the longer
		 * argument, which it isn't — and the prose above already says the list
		 * is open-ended, so the extra two were paying for nothing.
		 *
		 * These three are the groups the hero's cards demonstrate, in the same
		 * colours.
		 */
		terms: [
			mockTerm('s-produce', 'Produce', 'color-10'),
			mockTerm('s-protein', 'Protein', 'color-6'),
			mockTerm('s-grain', 'Grain', 'color-8'),
		],
	},
];

const BENEFITS: { title: string; body: string }[] = [
	{
		title: 'A count, not a hunch.',
		body: 'Every item carries how many you have and the number you’d rather not drop below. Cross it and the item turns amber; hit zero and it turns crimson. The list tells you what needs restocking without you reading it.',
	},
	{
		title: 'The whole household, one list.',
		body: 'Invite the people you shop with. Owners and editors add and change things, viewers just look. Everyone sees the same counts, so nobody comes home with a third jar of marinara.',
	},
	{
		title: 'The shopping list is a view, not a chore.',
		body: 'Everything low or out, grouped by the store you buy it at. Check things off as you go — nothing to keep in sync, because it’s the same data, asked a different way.',
	},
];

/** A term chip that nothing can press. The band explains the model; it isn't it. */
function SliceChip({ term, theme }: { term: Term; theme: Theme }) {
	const color = entityColorFor(term.id, [term], theme.dark);

	return (
		<span
			class="inline-flex items-center gap-[7px] h-8 pl-2.5 pr-3 rounded-full text-[13.5px] whitespace-nowrap"
			style={{ background: theme.surface, border: `1px solid ${theme.border}`, color: theme.textStrong }}
		>
			<span class="w-2 h-2 rounded-full shrink-0" style={{ background: color.dot }} />
			{term.name}
		</span>
	);
}

/** The 1120 content column, inside 160px margins at 1440 and 22px gutters at 390. */
function Column({ children, class: cls = '' }: { children: preact.ComponentChildren; class?: string }) {
	return <div class={`w-full max-w-[1120px] mx-auto px-[22px] md:px-10 ${cls}`}>{children}</div>;
}

/**
 * The three live cards beside the headline.
 *
 * Its own component so a press re-renders these and nothing else — the page
 * around them is static, and putting the quantities in `MarketingPage` would
 * re-render the whole marketing page on every tap of a plus.
 */
function HeroMock({ dark, theme }: { dark: boolean; theme: Theme }) {
	const [items, setItems] = useState<Item[]>(MOCK_ITEMS);

	/*
	 * The same arithmetic the server's `adjustQty` does, deliberately: one step
	 * whatever the delta claims, parsed and re-serialized through `shared/qty`
	 * so the clamp at zero comes from the same place. A demo that drifted from
	 * the real rule would be a lie about the product.
	 */
	function adjust(id: string, delta: number) {
		const step = delta < 0 ? -1 : 1;

		setItems((prev) => prev.map((it) => (
			it.id === id ? { ...it, qty: fromInt(toInt(it.qty) + step) } : it
		)));
	}

	return (
		<div
			class="flex flex-col gap-3.5 w-full xl:w-[440px] shrink-0"
			role="group"
			aria-label="A working sample of the item list. The counts are yours to change."
		>
			{items.map((item) => (
				<ItemCard
					key={item.id}
					item={item} open={false}
					locations={MOCK_LOCATIONS} types={MOCK_TYPES} stores={MOCK_STORES}
					dark={dark} theme={theme} canEdit canExpand={false}
					onToggleOpen={() => {}}
					onAdjustQty={(delta) => adjust(item.id, delta)}
					onRemove={() => {}}
					onStartEdit={() => {}}
				/>
			))}
		</div>
	);
}

export function MarketingPage({ dark, theme, pending, onSignIn }: {
	dark: boolean;
	theme: Theme;
	pending: boolean;
	onSignIn: () => void;
}) {
	return (
		<div
			class="font-sans min-h-screen w-full"
			style={{ background: theme.pageBg, color: theme.text, colorScheme: dark ? 'dark' : 'light' }}
		>
			<Column class="flex items-center justify-between gap-4 h-[66px] md:h-[84px]">
				<span class="flex items-center gap-2.5 md:gap-[13px] min-w-0">
					<span class="md:hidden"><AppTile size={30} radius={7} /></span>
					<span class="hidden md:block"><AppTile size={34} radius={7} /></span>
					{/*
					  * The wordmark and its badge are one group with no gap of their
					  * own: the badge carries its own left margin, derived from the
					  * wordmark's set size, and the row's `gap` would be added on top
					  * of it.
					  */}
					<span class="flex items-center min-w-0">
						<Wordmark size="text-[20px] md:text-[24px]" theme={theme} />
						{/*
						  * The stage marker. Two of them rather than one, because
						  * the badge derives its metrics from a number and the nav's
						  * wordmark is responsive — the same reason the tile above is
						  * drawn twice. Both land on Small: 20 clamps to the 24 floor
						  * and 24 is Small outright.
						  */}
						<span class="md:hidden"><BetaBadge size={20} theme={theme} /></span>
						<span class="hidden md:block"><BetaBadge size={24} theme={theme} /></span>
					</span>
				</span>

				{/*
				  * **No CTA in the nav below `sm`.** At 390 the wordmark and a
				  * button cannot share a 66px row without one of them shrinking to
				  * an abbreviation, and the hero's full-width CTA is a thumb-length
				  * below it — three calls to action on a page this short is already
				  * the ceiling.
				  */}
				<button
					type="button"
					onClick={onSignIn}
					disabled={pending}
					class={`shrink-0 hidden sm:flex items-center justify-center gap-[9px] h-[42px] w-[248px] rounded-[13px] text-base font-semibold ${PAGE_BUTTON_PRIMARY}`}
					style={{
						background: pending ? theme.disabledBg : theme.inkBg,
						color: pending ? theme.disabledText : theme.inkText,
					}}
				>
					<LogIn size={18} strokeWidth={2} color={pending ? theme.disabledText : theme.inkText} />
					Sign in
				</button>
			</Column>

			<Column class="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-10 xl:gap-14 pt-4 md:pt-11 pb-11 md:pb-24">
				<div class="flex flex-col xl:pt-[22px] min-w-0">
					<h1
						class="font-disp text-headline-sm md:text-headline font-semibold leading-[1.12] md:leading-[1.1] tracking-[-0.016em] md:tracking-[-0.018em]"
						style={{ color: theme.textStrong }}
					>
						Know what&rsquo;s in the freezer before you get to the store.
					</h1>

					<p class="text-[15.5px] md:text-[17.5px] leading-[1.6] mt-4 md:mt-[22px]" style={{ color: theme.text }}>
						Larder Log keeps a running count of everything in your pantry and freezers,
						flags what&rsquo;s running low, and tells you which store to buy it at — for
						everyone in the household at once.
					</p>

					<div class="mt-[26px] md:mt-8">
						<SignInButton
							label="Sign in"
							pending={pending}
							onPress={onSignIn}
							theme={theme}
							width="w-full sm:w-[268px]"
							height="h-[52px]"
						/>
					</div>

					<p class="text-[13.5px] leading-[1.5] mt-3.5" style={{ color: theme.textMuted }}>
						Signing in creates your account. There&rsquo;s no separate sign-up.
					</p>
				</div>

				<HeroMock dark={dark} theme={theme} />
			</Column>

			{/*
			  * Each card answers a doubt rather than naming a feature. There is no
			  * proof section: no testimonials, no logos, no counts, because there is
			  * nothing real to put there yet and an invented quote on a public page
			  * is worse than a shorter page. The slot is here, between the benefits
			  * and the band, for whenever there is something true to fill it with.
			  */}
			<Column class="grid md:grid-cols-3 gap-4 md:gap-8 pb-11 md:pb-24">
				{BENEFITS.map((b) => (
					<div
						key={b.title}
						class="flex flex-col gap-3 p-7 rounded-[20px]"
						style={{
							background: theme.surface,
							border: `1px solid ${dark ? theme.borderStrong : theme.border}`,
							boxShadow: theme.cardShadow,
						}}
					>
						<h3
							class="font-disp text-[22px] font-semibold leading-[1.25] tracking-[-0.005em]"
							style={{ color: theme.textStrong }}
						>
							{b.title}
						</h3>
						<p class="text-body leading-[1.62]" style={{ color: theme.text }}>{b.body}</p>
					</div>
				))}
			</Column>

			<Column class="pb-11 md:pb-24">
				<div
					class="flex flex-col gap-8 md:gap-[34px] p-7 md:p-11 rounded-[22px]"
					style={{
						background: theme.surface,
						border: `1px solid ${dark ? theme.borderStrong : theme.border}`,
						boxShadow: theme.cardShadow,
					}}
				>
					<h2
						class="font-disp text-[26px] md:text-[32px] font-semibold leading-[1.2] tracking-[-0.012em]"
						style={{ color: theme.textStrong }}
					>
						Three ways to slice it.
					</h2>

					<div class="grid md:grid-cols-3 gap-8 md:gap-9">
						{SLICES.map(({ label, icon: Icon, body, terms }) => (
							<div key={label} class="flex flex-col gap-[13px]">
								<span class="flex items-center gap-[9px]" style={{ color: theme.textMuted }}>
									<Icon size={20} strokeWidth={1.8} />
									<span class="text-label font-bold uppercase tracking-[0.15em]">{label}</span>
								</span>
								<p class="text-body leading-[1.6]" style={{ color: theme.text }}>{body}</p>
								<div class="flex flex-wrap gap-[7px] pt-0.5">
									{terms.map((t) => <SliceChip key={t.id} term={t} theme={theme} />)}
								</div>
							</div>
						))}
					</div>

					{/*
					  * The second sentence is desktop-only. At 390 the band is
					  * already three stacked blocks of chips and this line is the
					  * footnote under all of them; the first sentence carries the
					  * whole point on its own.
					  */}
					<div class="pt-[18px] md:pt-[22px]" style={{ borderTop: `1px solid ${theme.border}` }}>
						<p class="text-[13.5px] md:text-sm leading-[1.5]" style={{ color: theme.textMuted }}>
							Sixteen colors, yours to name and assign.
							<span class="hidden md:inline"> Rename, recolor, or remove any of them whenever you like.</span>
						</p>
					</div>
				</div>
			</Column>

			<Column class="flex flex-col items-center text-center gap-4 md:gap-5 pb-11 md:pb-[88px]">
				<span class="md:hidden"><AppTile size={46} radius={10} /></span>
				<span class="hidden md:block"><AppTile size={52} radius={11} /></span>
				<h2
					class="font-disp text-[28px] md:text-[38px] font-semibold leading-[1.2] tracking-[-0.014em] max-w-[640px]"
					style={{ color: theme.textStrong }}
				>
					Start with what&rsquo;s in the freezer right now.
				</h2>
				<p class="text-[13.5px] md:text-[14.5px] leading-[1.5]" style={{ color: theme.textMuted }}>
					You&rsquo;ll land in a household with locations, types, and stores already set up
					<span class="hidden md:inline"> — rename them as you go</span>.
				</p>
				{/*
				  * `w-full` on the wrapper, not just on the button.
				  *
				  * This column is `items-center`, so a wrapper left to itself is
				  * shrink-to-fit — and a `w-full` button inside one resolves to
				  * 100% of its *own content*, which is a button with no padding at
				  * all. It shipped once with the label flush against both edges.
				  */}
				<div class="w-full sm:w-auto pt-1.5">
					<SignInButton
						label="Sign in"
						pending={pending}
						onPress={onSignIn}
						theme={theme}
						width="w-full sm:w-[268px]"
						height="h-[52px]"
					/>
				</div>
			</Column>

			{/*
			  * Icon, wordmark, copyright. Nothing else — no legal links, no nav, no
			  * second column. A footer on a one-page site whose only action is at the
			  * top of the page has no work to do.
			  */}
			<div style={{ borderTop: `1px solid ${theme.border}` }}>
				<Column class="flex flex-col items-start gap-2.5 py-5 pb-7 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-7">
					<span class="flex items-center gap-[11px] min-w-0">
						<AppTile size={26} radius={6} />
						<span class="flex items-center min-w-0">
							<Wordmark size="text-[18px]" theme={theme} />
							{/*
							  * The footer keeps it. Carrying the marker in the nav and
							  * dropping it 900px lower on the same page invites the
							  * reader to work out what the absence means, and within one
							  * page it never means anything. At 18 the ratios ask for an
							  * 8px label, so the input clamps to 24 and the pill sits
							  * fractionally large — the right way to be wrong.
							  */}
							<BetaBadge size={18} theme={theme} />
						</span>
					</span>
					<p class="text-[12.5px] sm:text-[13px]" style={{ color: theme.textMuted }}>&copy; 2026 Larder Log</p>
				</Column>
			</div>
		</div>
	);
}
