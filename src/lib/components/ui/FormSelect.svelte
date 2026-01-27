<script lang="ts">
    import { COLORS, TYPOGRAPHY, TRANSITIONS } from "$lib/constants";
    import { cn } from "$lib/utils";

    interface Option {
        value: string;
        label: string;
    }

    interface Props {
        id: string;
        label: string;
        value: string;
        options: (string | Option)[];
        disabled?: boolean;
        required?: boolean;
        className?: string;
    }

    let {
        id,
        label,
        value = $bindable(""),
        options,
        disabled = false,
        required = false,
        className = "",
    }: Props = $props();
</script>

<div class="flex flex-col gap-1 {className}">
    <label for={id} class="{TYPOGRAPHY.label} {COLORS.text}">
        {label}
    </label>
    <select
        {id}
        bind:value
        {disabled}
        {required}
        class="h-12 border-b border-primary dark:border-white bg-transparent focus:border-primary dark:focus:border-white {TRANSITIONS.colors} outline-none text-sm disabled:opacity-50 cursor-pointer"
    >
        <option value="" disabled selected>Select an option</option>
        {#each options as option}
            {#if typeof option === "string"}
                <option value={option}>{option}</option>
            {:else}
                <option value={option.value}>{option.label}</option>
            {/if}
        {/each}
    </select>
</div>
