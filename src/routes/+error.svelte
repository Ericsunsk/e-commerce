<script lang="ts">
    import { page } from "$app/stores";
    import "../app.css"; // 关键：手动引入 CSS，因为 layout 挂了
    import { DEFAULTS } from "$lib/constants";

    // 可以在这里引入你的 Logo 图片，或者直接用文字
    // import logo from '$lib/assets/logo.svg';
</script>

<svelte:head>
    <title>
        {$page.status === 503 ? "Maintenance" : "Error"} | {DEFAULTS.siteName}
    </title>
</svelte:head>

<div
    class="min-h-screen w-full bg-[#111] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden"
>
    {#if $page.status === 503}
        <!-- 🔴 503 维护模式专属设计 -->
        <div
            class="z-10 text-center max-w-lg animate-in fade-in zoom-in duration-700"
        >
            <!-- Brand -->
            <div class="mb-12">
                <h1
                    class="font-display text-4xl md:text-5xl tracking-[0.2em] uppercase font-bold text-white"
                >
                    {DEFAULTS.siteName}
                </h1>
                <div class="h-[1px] w-24 bg-white/20 mx-auto mt-6"></div>
            </div>

            <!-- Message -->
            <div class="space-y-6">
                <h2
                    class="text-xs md:text-sm font-sans uppercase tracking-[0.3em] text-white/60"
                >
                    System Status
                </h2>
                <p
                    class="text-2xl md:text-3xl font-display uppercase leading-tight tracking-wide"
                >
                    Currently Under<br />Maintenance
                </p>
                <p
                    class="font-sans text-sm text-white/40 leading-relaxed max-w-xs mx-auto"
                >
                    We are currently updating our experience to serve you
                    better. Please check back shortly.
                </p>
            </div>
        </div>

        <!-- 装饰性背景 (极简黑白噪点或光晕) -->
        <div
            class="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"
        ></div>
    {:else}
        <!-- 🔵 其他错误 (404, 500) -->
        <div class="z-10 text-center max-w-md">
            <h1
                class="text-[120px] leading-none font-display font-bold text-white/5 mb-[-40px]"
            >
                {$page.status}
            </h1>
            <h2
                class="text-xl font-display uppercase tracking-widest mb-6 relative z-10"
            >
                {$page.status === 404
                    ? "Page Not Found"
                    : "Something Went Wrong"}
            </h2>
            <p class="text-sm text-white/50 mb-12 tracking-wider font-sans">
                {$page.error?.message || "An unexpected error occurred."}
            </p>
            <a
                href="/"
                class="inline-block border border-white/20 hover:border-white px-8 py-3 text-xs uppercase tracking-[0.2em] transition-all hover:bg-white hover:text-black"
            >
                Return Home
            </a>
        </div>
    {/if}

    <!-- Footer Copyright -->
    <div class="absolute bottom-8 left-0 w-full text-center">
        <p class="text-[10px] uppercase tracking-widest text-white/20">
            &copy; {new Date().getFullYear()}
            {DEFAULTS.siteName}
        </p>
    </div>
</div>
