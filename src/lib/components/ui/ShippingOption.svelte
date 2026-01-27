<script lang="ts">
    import { COLORS, TRANSITIONS } from "$lib/constants";

    interface ShippingOption {
        id: string;
        name: string;
        description: string;
        price: string;
        disabled?: boolean;
    }

    let {
        option,
        selected = false,
        name = "shipping",
        onSelect,
    } = $props<{
        option: ShippingOption;
        selected?: boolean;
        name?: string;
        onSelect?: (id: string) => void;
    }>();
</script>

<label
    class="flex items-center justify-between p-4 border transition-all duration-300 cursor-pointer
    {selected
        ? 'border-primary dark:border-white bg-primary/5'
        : 'border-primary/10 dark:border-white/10 hover:bg-primary/5'} 
    {option.disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-[0.99]'}"
>
    <div class="flex items-center gap-4">
        <input
            type="radio"
            {name}
            checked={selected}
            disabled={option.disabled}
            onchange={() => onSelect?.(option.id)}
            class="accent-primary dark:accent-white"
        />
        <div class="flex flex-col">
            <span class="text-sm font-bold uppercase tracking-wider"
                >{option.name}</span
            >
            <span class="text-xs {COLORS.text}">{option.description}</span>
        </div>
    </div>
    <span class="text-sm font-bold">{option.price}</span>
</label>
