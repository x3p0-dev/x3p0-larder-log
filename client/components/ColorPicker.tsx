import type { Theme } from '../lib/theme';
import { DEFAULT_PALETTE } from '../lib/theme';

type Props = {
	value: string;
	onChange: (hex: string) => void;
	theme: Theme;
	class?: string;
};

/** The shared palette swatch row, used anywhere an ink color gets picked. */
export function ColorPicker({ value, onChange, theme, class: className = 'flex flex-wrap gap-1.5 mb-2' }: Props) {
	return (
		<div class={className}>
			{DEFAULT_PALETTE.map((hex) => (
				<button
					key={hex}
					type="button"
					onClick={() => onChange(hex)}
					class="w-5 h-5 rounded-full shrink-0"
					style={{
						background: hex,
						boxShadow: value === hex ? `0 0 0 2px ${theme.surface}, 0 0 0 4px ${hex}` : 'none',
					}}
					aria-label={`Choose color ${hex}`}
				/>
			))}
		</div>
	);
}
