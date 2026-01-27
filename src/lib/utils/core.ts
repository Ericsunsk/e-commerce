/**
 * Merges class names (simple version without tailwind-merge/clsx)
 */
export function cn(...inputs: (string | undefined | null | false)[]) {
    return inputs.filter(Boolean).join(" ");
}

/**
 * Checks if a link is active based on the current URL
 */
export function isLinkActive(linkHref: string, currentPath: string, currentSearch: string) {
    if (linkHref === "/shop") {
        const params = new URLSearchParams(currentSearch);
        return (
            currentPath === "/shop" &&
            !params.has("gender") &&
            !params.has("category")
        );
    }

    const [path, search] = linkHref.split("?");
    if (path !== currentPath) return false;

    if (search) {
        const linkParams = new URLSearchParams(search);
        const currentParams = new URLSearchParams(currentSearch);
        for (const [key, value] of linkParams) {
            if (currentParams.get(key) !== value) return false;
        }
        return true;
    }

    return true;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string, locale: string = 'en-US'): string {
    return new Date(dateString).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
