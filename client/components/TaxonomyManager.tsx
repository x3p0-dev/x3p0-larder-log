import { useEffect, useState } from 'preact/hooks';
import { Trash2 } from 'lucide-preact';

import { ColorPicker } from './ColorPicker';
import type { Theme } from '../lib/theme';
import type { Term } from '../../shared/types';

type RowProps = {
	entity: Term;
	onRename: (id: string, newName: string) => void;
	onDelete: (id: string) => void;
	colorOpen: string | null;
	setColorOpen: (id: string | null) => void;
	theme: Theme;
};

/** A single editable row: color dot, inline-editable name, delete. */
function TaxonomyRow({ entity, onRename, onDelete, colorOpen, setColorOpen, theme }: RowProps) {
	const [draft, setDraft] = useState(entity.name);

	useEffect(() => { setDraft(entity.name); }, [entity.name]);

	function commit() {
		const trimmed = draft.trim();

		// A rename is a single-row update now — the term's identity is its id,
		// so nothing that references it has to change. Under the Phase 1
		// name-joined model this rewrote every item that mentioned the term.
		if (trimmed && trimmed !== entity.name) onRename(entity.id, trimmed);
		else setDraft(entity.name);
	}

	return (
		<div class="flex items-center gap-2 py-1">
			<button
				onClick={() => setColorOpen(colorOpen === entity.id ? null : entity.id)}
				class="w-4 h-4 rounded-full shrink-0"
				style={{ background: entity.ink }}
				aria-label={`Change color for ${entity.name}`}
			/>
			<input
				value={draft}
				onInput={(e) => setDraft(e.currentTarget.value)}
				onBlur={commit}
				onKeyDown={(e) => { if (e.key === 'Enter') { commit(); e.currentTarget.blur(); } }}
				class="flex-1 min-w-0 text-sm px-2 py-1 rounded border outline-none"
				style={{ borderColor: theme.borderStrong, background: theme.surface, color: theme.text }}
				aria-label={`Rename ${entity.name}`}
			/>
			<button onClick={() => onDelete(entity.id)} class="shrink-0" style={{ color: theme.dangerText }} aria-label={`Delete ${entity.name}`}>
				<Trash2 size={14} />
			</button>
		</div>
	);
}

type Props = {
	title: string;
	entities: Term[];
	onRename: (id: string, newName: string) => void;
	onDelete: (id: string) => void;
	onRecolor: (id: string, color: string) => void;
	/** `taxonomy:write`. False renders the list as plain text — see D30. */
	canEdit: boolean;
	theme: Theme;
};

export function TaxonomyManager({ title, entities, onRename, onDelete, onRecolor, canEdit, theme }: Props) {
	const [colorOpen, setColorOpen] = useState<string | null>(null);

	return (
		<div>
			<p class="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: theme.textMuted }}>{title}</p>
			{entities.length === 0 && <p class="text-xs" style={{ color: theme.textFaint }}>None yet</p>}

			{/*
			  * A viewer gets the same list without the controls, rather than a
			  * column of dead inputs. The color dot stays because it is what
			  * ties a term here to its chips on the items (D30). Rendered as an
			  * alternative rather than hidden with a class: a permission
			  * boundary should not leave live inputs in the DOM.
			  */}
			{! canEdit && (
				<div class="flex flex-col">
					{entities.map((e) => (
						<div key={e.id} class="flex items-center gap-2 py-1">
							<span class="w-4 h-4 rounded-full shrink-0" style={{ background: e.ink }} />
							<span class="text-sm" style={{ color: theme.text }}>{e.name}</span>
						</div>
					))}
				</div>
			)}

			{canEdit && (
				<div class="flex flex-col">
					{entities.map((e) => (
						<div key={e.id}>
							<TaxonomyRow
								entity={e} onRename={onRename} onDelete={onDelete}
								colorOpen={colorOpen} setColorOpen={setColorOpen} theme={theme}
							/>
							{colorOpen === e.id && (
								<ColorPicker
									value={e.ink}
									onChange={(hex) => { onRecolor(e.id, hex); setColorOpen(null); }}
									theme={theme}
									class="flex flex-wrap gap-1.5 mb-2 ml-6"
								/>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
