<script lang="ts">
	import { fade } from 'svelte/transition';
	import FormInput from '$lib/components/ui/FormInput.svelte';
	import FormSelect from '$lib/components/ui/FormSelect.svelte';
	import FormTextarea from '$lib/components/ui/FormTextarea.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { COLORS, SPACING, TYPOGRAPHY, DEFAULTS } from '$lib/constants';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { MESSAGES } from '$lib/messages';

	let { data } = $props();

	let loading = $state(false);
	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let subject = $state('');
	let message = $state('');

	// 表单提交处理
	function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;

		// 模拟 API 请求
		setTimeout(() => {
			loading = false;
			toastStore.success(MESSAGES.SUCCESS.MESSAGE_SENT);
			firstName = '';
			lastName = '';
			email = '';
			subject = '';
			message = '';
		}, 1500);
	}

	const subjects = [
		{ value: 'general', label: 'General Inquiry' },
		{ value: 'order', label: 'Order Status' },
		{ value: 'return', label: 'Returns & Exchanges' },
		{ value: 'collaboration', label: 'Press & Collaboration' }
	];

	const contactLinks = [
		{ label: 'Email', href: `mailto:${DEFAULTS.demoEmail}`, text: DEFAULTS.demoEmail },
		{ label: 'Press', href: 'mailto:press@vanflow.com', text: 'press@vanflow.com' }
	];
</script>

<svelte:head>
	<title>Contact | {data.settings.siteName}</title>
	<meta name="description" content="Get in touch with {data.settings.siteName}." />
</svelte:head>

<div class="min-h-screen {COLORS.bg} {COLORS.text} pt-[80px]">
	<div class="{SPACING.container} py-12 md:py-24">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24">
			<!-- Left Column: Info -->
			<div class="space-y-12">
				<div>
					<h1 class="text-4xl md:text-6xl font-display uppercase tracking-tighter mb-6">Contact</h1>
					<p class="{TYPOGRAPHY.body} opacity-80 max-w-sm">
						Our client services team is available Monday through Friday, 9am - 6pm EST.
					</p>
				</div>

				<div class="space-y-8">
					{#each contactLinks as contact (contact.label)}
						<div>
							<span class="{TYPOGRAPHY.label} opacity-40 block mb-2">{contact.label}</span>
							<a
								href={contact.href}
								class="text-lg md:text-xl font-display uppercase tracking-wider border-b border-primary/20 dark:border-white/20 hover:border-primary dark:hover:border-white transition-colors"
							>
								{contact.text}
							</a>
						</div>
					{/each}

					<div>
						<span class="{TYPOGRAPHY.label} opacity-40 block mb-2">Location</span>
						<p class="{TYPOGRAPHY.body} opacity-80">
							100 Crosby Street<br />
							New York, NY 10012
						</p>
					</div>
				</div>
			</div>

			<!-- Right Column: Form -->
			<div
				class="bg-white dark:bg-zinc-900 border border-primary/5 dark:border-white/5 p-8 md:p-12 shadow-sm"
				in:fade={{ duration: 600, delay: 200 }}
			>
				<form onsubmit={handleSubmit} class="space-y-8">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<FormInput id="firstName" label="First Name" bind:value={firstName} required />
						<FormInput id="lastName" label="Last Name" bind:value={lastName} required />
					</div>

					<FormInput id="email" type="email" label="Email Address" bind:value={email} required />

					<FormSelect
						id="subject"
						label="Subject"
						options={subjects}
						bind:value={subject}
						required
					/>

					<FormTextarea id="message" label="Message" bind:value={message} required rows={4} />

					<div class="pt-4">
						<Button type="submit" fullWidth disabled={loading}>
							{loading ? 'Sending...' : 'Send Message'}
						</Button>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>
